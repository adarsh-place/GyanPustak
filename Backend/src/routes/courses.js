import { Router } from 'express'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'
import { requireRoles } from '../middleware/authGuard.js'

export const coursesRouter = Router()

async function buildCourse(courseRow) {
  const [departmentResult, instructorResult, bookResult] = await Promise.all([
    pool.query(
      `
        SELECT d.id, d.name
        FROM course_departments cd
        JOIN departments d ON d.id = cd.department_id
        WHERE cd.course_id = $1
        ORDER BY d.name ASC
      `,
      [courseRow.id],
    ),
    pool.query(
      `
        SELECT i.id, i.first_name, i.last_name
        FROM course_instructors ci
        JOIN instructors i ON i.id = ci.instructor_id
        WHERE ci.course_id = $1
        ORDER BY i.first_name ASC, i.last_name ASC
      `,
      [courseRow.id],
    ),
    pool.query(
      `
        SELECT cb.book_id, cb.relation, b.title
        FROM course_books cb
        JOIN books b ON b.id = cb.book_id
        WHERE cb.course_id = $1
        ORDER BY b.title ASC
      `,
      [courseRow.id],
    ),
  ])

  return {
    id: courseRow.id,
    name: courseRow.name,
    universityId: courseRow.university_id,
    year: courseRow.year,
    semester: courseRow.semester,
    departments: departmentResult.rows,
    instructors: instructorResult.rows.map((instructor) => `${instructor.first_name} ${instructor.last_name}`),
    books: bookResult.rows.map((book) => ({
      bookId: book.book_id,
      title: book.title,
      relation: book.relation,
    })),
  }
}

coursesRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const result = await pool.query('SELECT * FROM courses ORDER BY name ASC')
    const data = await Promise.all(result.rows.map((row) => buildCourse(row)))
    response.json({ success: true, data })
  }),
)

coursesRouter.get(
  '/:id',
  asyncHandler(async (request, response) => {
    const result = await pool.query('SELECT * FROM courses WHERE id = $1', [request.params.id])
    if (result.rowCount === 0) {
      throw new HttpError(404, 'Course not found')
    }

    const [course] = await Promise.all(result.rows.map((row) => buildCourse(row)))
    response.json({ success: true, data: course })
  }),
)

coursesRouter.post(
  '/add',
  requireRoles(['admin','superadmin']),
  asyncHandler(async (request, response) => {
    const { id, universityId, name, year, semester, departmentIds = [], instructorIds = [], books = [] } = request.body

    if (!id || !universityId || !name || !year || !semester) {
      throw new HttpError(400, 'Missing required course fields')
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const result = await client.query(
        `
          INSERT INTO courses (id, university_id, name, year, semester)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `,
        [id, universityId, name, year, semester],
      )

      for (const departmentId of departmentIds) {
        await client.query(
          'INSERT INTO course_departments (course_id, department_id) VALUES ($1, $2)',
          [id, departmentId],
        )
      }

      for (const instructorId of instructorIds) {
        await client.query(
          'INSERT INTO course_instructors (course_id, instructor_id) VALUES ($1, $2)',
          [id, instructorId],
        )
      }

      for (const book of books) {
        await client.query(
          'INSERT INTO course_books (course_id, book_id, relation) VALUES ($1, $2, $3)',
          [id, book.bookId, book.relation],
        )
      }

      await client.query('COMMIT')
      const [course] = await Promise.all(result.rows.map((row) => buildCourse(row)))
      response.status(201).json({ success: true, data: course })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }),
)
