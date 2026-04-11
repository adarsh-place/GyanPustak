import { Router } from 'express'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'
import { requireRoles } from '../middleware/authGuard.js'

export const ordersRouter = Router()

function resolveStudentId(request, requestedStudentId) {
  if (request.auth?.role === 'student') {
    if (requestedStudentId && requestedStudentId !== request.auth.userId) {
      throw new HttpError(403, 'Students can only access their own orders')
    }

    return request.auth.userId
  }

  return requestedStudentId
}

async function buildOrder(orderRow) {
  const itemsResult = await pool.query(
    `
      SELECT oi.book_id, oi.quantity, b.title
      FROM order_items oi
      JOIN books b ON b.id = oi.book_id
      WHERE oi.order_id = $1
      ORDER BY b.title ASC
    `,
    [orderRow.id],
  )

  return {
    id: orderRow.id,
    studentId: orderRow.student_id,
    createdAt: orderRow.created_at,
    fulfilledAt: orderRow.fulfilled_at,
    shippingType: orderRow.shipping_type,
    creditCardNumber: orderRow.credit_card_number,
    creditCardExpirationDate: orderRow.credit_card_expiration_date,
    creditCardHolderName: orderRow.credit_card_holder_name,
    creditCardType: orderRow.credit_card_type,
    status: orderRow.status,
    items: itemsResult.rows.map((item) => ({
      bookId: item.book_id,
      quantity: item.quantity,
      title: item.title,
    })),
  }
}

ordersRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const isStudent = request.auth?.role === 'student'
    const result = isStudent
      ? await pool.query('SELECT * FROM orders WHERE student_id = $1 ORDER BY created_at DESC', [request.auth.userId])
      : await pool.query('SELECT * FROM orders ORDER BY created_at DESC')

    const data = await Promise.all(result.rows.map((row) => buildOrder(row)))
    response.json({ success: true, data })
  }),
)

ordersRouter.post(
  '/from-cart/add',
  requireRoles(['student']),
  asyncHandler(async (request, response) => {
    const {
      studentId,
      shippingType,
      creditCardNumber,
      creditCardExpirationDate,
      creditCardHolderName,
      creditCardType,
      status = 'new',
    } = request.body

    const resolvedStudentId = resolveStudentId(request, studentId)

    if (!resolvedStudentId || !shippingType || !creditCardNumber || !creditCardExpirationDate || !creditCardHolderName || !creditCardType) {
      throw new HttpError(400, 'Missing required order fields')
    }
    if(resolvedStudentId != request.auth?.userId){
      throw new HttpError(400, 'Wrong Student Id Sent')
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const cartResult = await client.query('SELECT * FROM carts WHERE student_id = $1', [resolvedStudentId])
      if (cartResult.rowCount === 0) {
        throw new HttpError(404, 'Cart not found')
      }

      const itemsResult = await client.query('SELECT * FROM cart_items WHERE cart_id = $1', [cartResult.rows[0].id])
      if (itemsResult.rowCount === 0) {
        throw new HttpError(400, 'Cart is empty')
      }

      const orderId = `O${9000 + Date.now().toString().slice(-4)}`
      const orderResult = await client.query(
        `
          INSERT INTO orders (
            id, student_id, shipping_type, credit_card_number,
            credit_card_expiration_date, credit_card_holder_name, credit_card_type, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `,
        [
          orderId,
          resolvedStudentId,
          shippingType,
          creditCardNumber,
          creditCardExpirationDate,
          creditCardHolderName,
          creditCardType,
          status,
        ],
      )

      for (const item of itemsResult.rows) {
        await client.query(
          'INSERT INTO order_items (order_id, book_id, quantity) VALUES ($1, $2, $3)',
          [orderId, item.book_id, item.quantity],
        )
      }

      await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartResult.rows[0].id])
      await client.query('UPDATE carts SET updated_at = NOW() WHERE id = $1', [cartResult.rows[0].id])
      await client.query('COMMIT')

      const [order] = await Promise.all(orderResult.rows.map((row) => buildOrder(row)))
      response.status(201).json({ success: true, data: order })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }),
)

ordersRouter.patch(
  '/:orderId/cancel',
  requireRoles(['student']),
  asyncHandler(async (request, response) => {
    const isStudent = request.auth?.role === 'student'
    const result = isStudent
      ? await pool.query(
          `
            UPDATE orders
            SET status = 'canceled', updated_at = NOW()
            WHERE id = $1 AND student_id = $2 AND status <> 'shipped'
            RETURNING *
          `,
          [request.params.orderId, request.auth.userId],
        )
      : await pool.query(
          `
            UPDATE orders
            SET status = 'canceled', updated_at = NOW()
            WHERE id = $1 AND status <> 'shipped'
            RETURNING *
          `,
          [request.params.orderId],
        )

    if (result.rowCount === 0) {
      throw new HttpError(404, 'Order not found or cannot be canceled')
    }

    const [order] = await Promise.all(result.rows.map((row) => buildOrder(row)))
    response.json({ success: true, data: order })
  }),
)
