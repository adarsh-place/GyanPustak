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
        SELECT d.name
        FROM course_departments cd
        JOIN departments d ON d.university_id = cd.university_id AND d.name = cd.department_name
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
        JOIN books b ON b.isbn = cb.book_id
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
    const {
      universityId,
      name,
      year,
      semester,
      departmentNames = request.body.departmentIds || [],
      instructorIds = [],
      books = [],
    } = request.body

    if (!universityId || !name || !year || !semester) {
      throw new HttpError(400, 'Missing required course fields')
    }

    const universityResult = await pool.query('SELECT id FROM universities WHERE id = $1', [universityId])
    if (universityResult.rowCount === 0) {
      throw new HttpError(404, 'University not found')
    }

    const client = await pool.connect()
    let result = null
    try {
      await client.query('BEGIN')

      for (let attempt = 0; attempt < 10; attempt += 1) {
        const generatedId = `C${Date.now()}${Math.floor(100 + Math.random() * 900)}`
        try {
          result = await client.query(
            `
              INSERT INTO courses (id, university_id, name, year, semester)
              VALUES ($1, $2, $3, $4, $5)
              RETURNING *
            `,
            [generatedId, universityId, name, year, semester],
          )

          for (const departmentName of departmentNames) {
            const departmentCheck = await client.query(
              'SELECT 1 FROM departments WHERE university_id = $1 AND name = $2',
              [universityId, departmentName],
            )

            if (departmentCheck.rowCount === 0) {
              throw new HttpError(400, `Department not found for university: ${departmentName}`)
            }

            await client.query(
              'INSERT INTO course_departments (course_id, university_id, department_name) VALUES ($1, $2, $3)',
              [generatedId, universityId, departmentName],
            )
          }

          for (const instructorId of instructorIds) {
            await client.query(
              'INSERT INTO course_instructors (course_id, instructor_id) VALUES ($1, $2)',
              [generatedId, instructorId],
            )
          }

          for (const book of books) {
            const resolvedBookId =
              typeof book === 'string' ? book : book?.bookId ?? book?.bookIsbn ?? book?.isbn ?? null
            const resolvedRelation = typeof book === 'string' ? 'required' : book?.relation ?? 'required'

            if (!resolvedBookId) {
              throw new HttpError(400, 'Each course book must include bookId, bookIsbn, or isbn')
            }

            if (!['required', 'recommended'].includes(resolvedRelation)) {
              throw new HttpError(400, 'Book relation must be required or recommended')
            }

            await client.query(
              'INSERT INTO course_books (course_id, book_id, relation) VALUES ($1, $2, $3)',
              [generatedId, resolvedBookId, resolvedRelation],
            )
          }

          break
        } catch (error) {
          if (error?.code === '23505' && error?.constraint === 'courses_pkey') {
            continue
          }
          throw error
        }
      }

      if (!result) {
        throw new HttpError(500, 'Failed to generate unique course id')
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
