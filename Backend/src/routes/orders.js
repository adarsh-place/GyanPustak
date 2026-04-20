import { Router } from 'express'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'
import { requireRoles } from '../middleware/authGuard.js'

export const ordersRouter = Router()
const ALLOWED_ORDER_STATUSES = ['new', 'processed', 'awaiting shipping', 'shipped', 'canceled']

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
      SELECT oi.book_id, oi.quantity, b.title, b.price
      FROM order_items oi
      JOIN books b ON b.isbn = oi.book_id
      WHERE oi.order_id = $1
      ORDER BY b.title ASC
    `,
    [orderRow.id],
  )

  const items = itemsResult.rows.map((item) => ({
    bookId: item.book_id,
    quantity: item.quantity,
    title: item.title,
    price: Number(item.price),
  }))
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

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
    totalAmount: Number(orderRow.total_amount ?? totalAmount),
    items,
  }
}

async function changeOrderBookQuantities(client, orderId, direction) {
  const orderItemsResult = await client.query('SELECT book_id, quantity FROM order_items WHERE order_id = $1', [orderId])

  for (const item of orderItemsResult.rows) {
    const quantityChange = Number(item.quantity) * direction
    const stockResult = await client.query(
      `
        UPDATE books
        SET quantity = quantity + $2
        WHERE isbn = $1 AND quantity + $2 >= 0
        RETURNING quantity
      `,
      [item.book_id, quantityChange],
    )

    if (stockResult.rowCount === 0) {
      throw new HttpError(400, 'Unable to update stock for order item')
    }
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

      for (const item of itemsResult.rows) {
        const stockResult = await client.query(
          `
            UPDATE books
            SET quantity = quantity - $2
            WHERE isbn = $1 AND quantity >= $2
            RETURNING quantity
          `,
          [item.book_id, item.quantity],
        )

        if (stockResult.rowCount === 0) {
          throw new HttpError(400, `Insufficient stock for book: ${item.book_id}`)
        }
      }

      // Calculate total amount
      let totalAmount = 0
      for (const item of itemsResult.rows) {
        const bookResult = await client.query('SELECT price FROM books WHERE isbn = $1', [item.book_id])
        const price = Number(bookResult.rows[0]?.price || 0)
        totalAmount += price * Number(item.quantity)
      }

      const orderId = `O${9000 + Date.now().toString().slice(-4)}`
      const orderResult = await client.query(
        `
          INSERT INTO orders (
            id, student_id, shipping_type, credit_card_number,
            credit_card_expiration_date, credit_card_holder_name, credit_card_type, total_amount, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
          totalAmount,
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
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const result = await client.query(
        `
          UPDATE orders
          SET status = 'canceled', updated_at = NOW()
          WHERE id = $1 AND student_id = $2 AND status NOT IN ('shipped', 'canceled')
          RETURNING *
        `,
        [request.params.orderId, request.auth.userId],
      )

      if (result.rowCount === 0) {
        throw new HttpError(404, 'Order not found or cannot be canceled')
      }

      await changeOrderBookQuantities(client, request.params.orderId, 1)
      await client.query('COMMIT')

      const [order] = await Promise.all(result.rows.map((row) => buildOrder(row)))
      response.json({ success: true, data: order })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }),
)

ordersRouter.patch(
  '/:orderId/status',
  requireRoles(['support']),
  asyncHandler(async (request, response) => {
    const { status } = request.body

    if (!ALLOWED_ORDER_STATUSES.includes(status)) {
      throw new HttpError(400, 'Invalid order status')
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const existingOrderResult = await client.query('SELECT status FROM orders WHERE id = $1 FOR UPDATE', [request.params.orderId])

      if (existingOrderResult.rowCount === 0) {
        throw new HttpError(404, 'Order not found')
      }

      const currentStatus = existingOrderResult.rows[0].status
      if (currentStatus === 'canceled') {
        throw new HttpError(400, 'Canceled orders cannot be updated')
      }

      if (currentStatus === 'shipped' && status === 'canceled') {
        throw new HttpError(400, 'Shipped orders cannot be canceled')
      }

      const result = await client.query(
        `
          UPDATE orders
          SET
            status = $2,
            fulfilled_at = CASE
              WHEN $2 = 'shipped' THEN COALESCE(fulfilled_at, NOW())
              ELSE fulfilled_at
            END,
            updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `,
        [request.params.orderId, status],
      )

      if (status === 'canceled') {
        await changeOrderBookQuantities(client, request.params.orderId, 1)
      }

      await client.query('COMMIT')

      const [order] = await Promise.all(result.rows.map((row) => buildOrder(row)))
      response.json({ success: true, data: order })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }),
)
