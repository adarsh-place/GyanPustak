import { Router } from 'express'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'
import { requireRoles } from '../middleware/authGuard.js'

export const instructorsRouter = Router()

instructorsRouter.post(
  '/add',
  requireRoles(['admin', 'superadmin']),
  asyncHandler(async (request, response) => {
    const departmentName = (request.body.departmentName ?? request.body.departmentId ?? '').trim()
    const { universityId, firstName, lastName } = request.body

    if (!universityId || !firstName || !lastName) {
      throw new HttpError(400, 'Missing required instructor fields')
    }

    const universityResult = await pool.query('SELECT id FROM universities WHERE id = $1', [universityId])
    if (universityResult.rowCount === 0) {
      throw new HttpError(404, 'University not found')
    }

    if (departmentName) {
      const departmentResult = await pool.query(
        'SELECT name FROM departments WHERE university_id = $1 AND name = $2',
        [universityId, departmentName],
      )

      if (departmentResult.rowCount === 0) {
        throw new HttpError(400, 'Department does not belong to the selected university')
      }
    }

    const client = await pool.connect()
    let result = null

    try {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const generatedId = `I${Date.now()}${Math.floor(100 + Math.random() * 900)}`
        try {
          result = await client.query(
            `
              INSERT INTO instructors (id, university_id, department_name, first_name, last_name)
              VALUES ($1, $2, $3, $4, $5)
              RETURNING *
            `,
            [generatedId, universityId, departmentName || null, firstName.trim(), lastName.trim()],
          )
          break
        } catch (error) {
          if (error?.code === '23505' && error?.constraint === 'instructors_pkey') {
            continue
          }
          throw error
        }
      }
    } finally {
      client.release()
    }

    if (!result) {
      throw new HttpError(500, 'Failed to generate unique instructor id')
    }

    const instructor = result.rows[0]
    const universityNameResult = await pool.query('SELECT name FROM universities WHERE id = $1', [instructor.university_id])
    const departmentNameResult = instructor.department_name
      ? await pool.query('SELECT name FROM departments WHERE university_id = $1 AND name = $2', [instructor.university_id, instructor.department_name])
      : null

    const resolvedDepartmentName = departmentNameResult?.rows?.[0]?.name || ''

    response.status(201).json({
      success: true,
      data: {
        id: instructor.id,
        first_name: instructor.first_name,
        last_name: instructor.last_name,
        university_id: instructor.university_id,
        university_name: universityNameResult.rows[0]?.name || '',
        department_name: resolvedDepartmentName,
      },
    })
  }),
)

instructorsRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const result = await pool.query(
      `
        SELECT i.id,
               i.first_name,
               i.last_name,
               i.university_id,
               i.department_name,
               u.name AS university_name,
               d.name AS department_name
        FROM instructors i
        JOIN universities u ON u.id = i.university_id
        LEFT JOIN departments d ON d.university_id = i.university_id AND d.name = i.department_name
        ORDER BY i.first_name ASC, i.last_name ASC
      `,
    )

    response.json({ success: true, data: result.rows })
  }),
)

instructorsRouter.get(
  '/:id',
  asyncHandler(async (request, response) => {
    const result = await pool.query(
      `
        SELECT i.id,
               i.first_name,
               i.last_name,
               i.university_id,
               i.department_name,
               u.name AS university_name,
               d.name AS department_name
        FROM instructors i
        JOIN universities u ON u.id = i.university_id
        LEFT JOIN departments d ON d.university_id = i.university_id AND d.name = i.department_name
        WHERE i.id = $1
      `,
      [request.params.id],
    )

    if (result.rowCount === 0) {
      throw new HttpError(404, 'Instructor not found')
    }

    response.json({ success: true, data: result.rows[0] })
  }),
)
