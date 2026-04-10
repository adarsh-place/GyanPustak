import { Router } from 'express'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'

export const cartRouter = Router()

function resolveStudentId(request, requestedStudentId) {
  if (request.auth?.role === 'student') {
    if (requestedStudentId && requestedStudentId !== request.auth.userId) {
      throw new HttpError(403, 'Students can only access their own cart')
    }

    return request.auth.userId
  }

  return requestedStudentId
}

async function ensureCart(client, studentId) {
  const cartResult = await client.query('SELECT * FROM carts WHERE student_id = $1', [studentId])
  if (cartResult.rowCount > 0) {
    return cartResult.rows[0]
  }

  const cartId = `C${1000 + Date.now().toString().slice(-4)}`
  const createdResult = await client.query(
    'INSERT INTO carts (id, student_id) VALUES ($1, $2) RETURNING *',
    [cartId, studentId],
  )
  return createdResult.rows[0]
}

async function buildCart(cartRow) {
  const itemsResult = await pool.query(
    `
      SELECT ci.book_id, ci.quantity, b.title, b.price, b.format, b.type
      FROM cart_items ci
      JOIN books b ON b.id = ci.book_id
      WHERE ci.cart_id = $1
      ORDER BY b.title ASC
    `,
    [cartRow.id],
  )

  return {
    id: cartRow.id,
    studentId: cartRow.student_id,
    createdAt: cartRow.created_at,
    updatedAt: cartRow.updated_at,
    items: itemsResult.rows.map((item) => ({
      bookId: item.book_id,
      quantity: item.quantity,
      title: item.title,
      price: Number(item.price),
      format: item.format,
      type: item.type,
    })),
  }
}

cartRouter.get(
  '/:studentId',
  asyncHandler(async (request, response) => {
    const studentId = resolveStudentId(request, request.params.studentId)
    const result = await pool.query('SELECT * FROM carts WHERE student_id = $1', [studentId])

    if (result.rowCount === 0) {
      response.json({
        success: true,
        data: {
          id: null,
          studentId,
          createdAt: null,
          updatedAt: null,
          items: [],
        },
      })
      return
    }

    const [cart] = await Promise.all(result.rows.map((row) => buildCart(row)))
    response.json({ success: true, data: cart })
  }),
)

cartRouter.post(
  '/:studentId/items/add',
  asyncHandler(async (request, response) => {
    const studentId = resolveStudentId(request, request.params.studentId)
    const { bookId, quantity = 1 } = request.body
    if (!bookId) {
      throw new HttpError(400, 'bookId is required')
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const cart = await ensureCart(client, studentId)
      await client.query(
        `
          INSERT INTO cart_items (cart_id, book_id, quantity)
          VALUES ($1, $2, $3)
          ON CONFLICT (cart_id, book_id)
          DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
        `,
        [cart.id, bookId, quantity],
      )
      await client.query('UPDATE carts SET updated_at = NOW() WHERE id = $1', [cart.id])
      await client.query('COMMIT')

      const cartData = await buildCart(cart)
      response.status(201).json({ success: true, data: cartData })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }),
)

cartRouter.delete(
  '/:studentId/items/:bookId',
  asyncHandler(async (request, response) => {
    const studentId = resolveStudentId(request, request.params.studentId)
    const cartResult = await pool.query('SELECT * FROM carts WHERE student_id = $1', [studentId])
    if (cartResult.rowCount === 0) {
      throw new HttpError(404, 'Cart not found')
    }

    await pool.query('DELETE FROM cart_items WHERE cart_id = $1 AND book_id = $2', [
      cartResult.rows[0].id,
      request.params.bookId,
    ])
    await pool.query('UPDATE carts SET updated_at = NOW() WHERE id = $1', [cartResult.rows[0].id])

    const [cart] = await Promise.all(cartResult.rows.map((row) => buildCart(row)))
    response.json({ success: true, data: cart })
  }),
)
