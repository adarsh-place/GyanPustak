import { Router } from 'express'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'
import { requireRoles } from '../middleware/authGuard.js'

export const reviewsRouter = Router()

reviewsRouter.get(
  '/book/:bookId',
  asyncHandler(async (request, response) => {
    const { bookId } = request.params
    const currentUserId = request.auth?.userId
    const currentUserRole = request.auth?.role

    const result = await pool.query(
      `
        SELECT
          br.id,
          br.book_id,
          br.student_id,
          br.rating,
          br.review_text,
          br.created_at,
          s.first_name,
          s.last_name
        FROM book_reviews br
        JOIN students s ON s.email = br.student_id
        WHERE br.book_id = $1
        ORDER BY br.created_at DESC
      `,
      [bookId],
    )

    const reviews = result.rows
    const currentUserHasReviewed =
      currentUserRole === 'student'
        ? reviews.some((review) => review.student_id === currentUserId)
        : false

    response.json({
      success: true,
      data: {
        reviews,
        currentUserHasReviewed,
      },
    })
  }),
)

reviewsRouter.post(
  '/add',
  requireRoles(['student']),
  asyncHandler(async (request, response) => {
    const { bookId, rating, reviewText } = request.body
    const studentId = request.auth.userId

    if (!bookId || !rating || !reviewText) {
      throw new HttpError(400, 'bookId, rating, and reviewText are required')
    }

    if (Number.isNaN(Number(rating)) || rating < 1 || rating > 5) {
      throw new HttpError(400, 'Rating must be a number between 1 and 5')
    }

    if (reviewText.trim().length === 0) {
      throw new HttpError(400, 'Review text cannot be empty')
    }

    // Check if book exists
    const bookCheck = await pool.query('SELECT isbn FROM books WHERE isbn = $1', [bookId])
    if (bookCheck.rowCount === 0) {
      throw new HttpError(404, 'Book not found')
    }

    // Check if student already reviewed this book
    const existingReview = await pool.query(
      'SELECT id FROM book_reviews WHERE book_id = $1 AND student_id = $2',
      [bookId, studentId],
    )
    if (existingReview.rowCount > 0) {
      throw new HttpError(409, 'You have already reviewed this book')
    }

    const reviewId = `BR${Date.now()}`
    const result = await pool.query(
      `
        INSERT INTO book_reviews (id, book_id, student_id, rating, review_text)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          book_id,
          student_id,
          rating,
          review_text,
          created_at
      `,
      [reviewId, bookId, studentId, Number(rating), reviewText.trim()],
    )

    // Get student name for response
    const studentInfo = await pool.query(
      'SELECT first_name, last_name FROM students WHERE email = $1',
      [studentId],
    )

    const review = result.rows[0]
    review.first_name = studentInfo.rows[0].first_name
    review.last_name = studentInfo.rows[0].last_name

    response.status(201).json({ success: true, data: review })
  }),
)

reviewsRouter.delete(
  '/:reviewId',
  requireRoles(['student', 'admin', 'superadmin']),
  asyncHandler(async (request, response) => {
    const { reviewId } = request.params
    const userId = request.auth.userId
    const userRole = request.auth.role

    const review = await pool.query('SELECT student_id FROM book_reviews WHERE id = $1', [reviewId])
    if (review.rowCount === 0) {
      throw new HttpError(404, 'Review not found')
    }

    // Only student who wrote it, admin, or superadmin can delete
    if (review.rows[0].student_id !== userId && userRole !== 'admin' && userRole !== 'superadmin') {
      throw new HttpError(403, 'You cannot delete this review')
    }

    await pool.query('DELETE FROM book_reviews WHERE id = $1', [reviewId])
    response.json({ success: true, message: 'Review deleted' })
  }),
)
