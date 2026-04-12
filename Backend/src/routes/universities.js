import { Router } from 'express'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'
import { requireRoles } from '../middleware/authGuard.js'

export const universitiesRouter = Router()

async function buildUniversity(universityRow) {
  const [departmentsResult, instructorsResult] = await Promise.all([
    pool.query('SELECT * FROM departments WHERE university_id = $1 ORDER BY name ASC', [universityRow.id]),
    pool.query(
      'SELECT * FROM instructors WHERE university_id = $1 ORDER BY first_name ASC, last_name ASC',
      [universityRow.id],
    ),
  ])

  return {
    id: universityRow.id,
    name: universityRow.name,
    address: universityRow.address,
    representative: {
      firstName: universityRow.representative_first_name,
      lastName: universityRow.representative_last_name,
      email: universityRow.representative_email,
      phone: universityRow.representative_phone,
    },
    departments: departmentsResult.rows.map((department) => ({
      id: department.id,
      name: department.name,
    })),
    instructors: instructorsResult.rows.map((instructor) => ({
      id: instructor.id,
      firstName: instructor.first_name,
      lastName: instructor.last_name,
      departmentId: instructor.department_id,
    })),
  }
}

universitiesRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const result = await pool.query('SELECT * FROM universities ORDER BY name ASC')
    const data = await Promise.all(result.rows.map((row) => buildUniversity(row)))
    response.json({ success: true, data })
  }),
)

universitiesRouter.get(
  '/:id',
  asyncHandler(async (request, response) => {
    const result = await pool.query('SELECT * FROM universities WHERE id = $1', [request.params.id])
    if (result.rowCount === 0) {
      throw new HttpError(404, 'University not found')
    }

    const [university] = await Promise.all(result.rows.map((row) => buildUniversity(row)))
    response.json({ success: true, data: university })
  }),
)

universitiesRouter.post(
  '/add',
  requireRoles(['admin','superadmin']),
  asyncHandler(async (request, response) => {
    const {
      name,
      address,
      representativeFirstName,
      representativeLastName,
      representativeEmail,
      representativePhone,
    } = request.body

    if (!name || !address || !representativeFirstName || !representativeLastName || !representativeEmail || !representativePhone) {
      throw new HttpError(400, 'Missing required university fields')
    }

    const client = await pool.connect()
    let result = null
    try {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const generatedId = `U${Date.now()}${Math.floor(100 + Math.random() * 900)}`
        try {
          result = await client.query(
            `
              INSERT INTO universities (
                id, name, address, representative_first_name, representative_last_name,
                representative_email, representative_phone
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
              RETURNING *
            `,
            [
              generatedId,
              name,
              address,
              representativeFirstName,
              representativeLastName,
              representativeEmail,
              representativePhone,
            ],
          )
          break
        } catch (error) {
          if (error?.code === '23505' && error?.constraint === 'universities_pkey') {
            continue
          }
          throw error
        }
      }
    } finally {
      client.release()
    }

    if (!result) {
      throw new HttpError(500, 'Failed to generate unique university id')
    }

    const [university] = await Promise.all(result.rows.map((row) => buildUniversity(row)))
    response.status(201).json({ success: true, data: university })
  }),
)

universitiesRouter.post(
  '/:universityId/departments/add',
  requireRoles(['admin', 'superadmin']),
  asyncHandler(async (request, response) => {
    const { universityId } = request.params
    const { name } = request.body

    if (!name || !name.trim()) {
      throw new HttpError(400, 'Department name is required')
    }

    // Verify university exists
    const universityResult = await pool.query('SELECT * FROM universities WHERE id = $1', [universityId])
    if (universityResult.rowCount === 0) {
      throw new HttpError(404, 'University not found')
    }

    const client = await pool.connect()
    let result = null
    try {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const generatedDepartmentId = `D${Date.now()}${Math.floor(100 + Math.random() * 900)}`
        try {
          result = await client.query(
            'INSERT INTO departments (id, university_id, name) VALUES ($1, $2, $3) RETURNING *',
            [generatedDepartmentId, universityId, name.trim()],
          )
          break
        } catch (error) {
          if (error?.code === '23505' && error?.constraint === 'departments_pkey') {
            continue
          }
          throw error
        }
      }
    } finally {
      client.release()
    }

    if (!result) {
      throw new HttpError(500, 'Failed to generate unique department id')
    }

    response.status(201).json({
      success: true,
      data: {
        id: result.rows[0].id,
        name: result.rows[0].name,
      },
    })
  }),
)
