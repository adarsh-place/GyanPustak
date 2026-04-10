import { Router } from 'express'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'

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
  asyncHandler(async (request, response) => {
    const {
      id,
      name,
      address,
      representativeFirstName,
      representativeLastName,
      representativeEmail,
      representativePhone,
    } = request.body

    if (!id || !name || !address || !representativeFirstName || !representativeLastName || !representativeEmail || !representativePhone) {
      throw new HttpError(400, 'Missing required university fields')
    }

    const result = await pool.query(
      `
        INSERT INTO universities (
          id, name, address, representative_first_name, representative_last_name,
          representative_email, representative_phone
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [
        id,
        name,
        address,
        representativeFirstName,
        representativeLastName,
        representativeEmail,
        representativePhone,
      ],
    )

    const [university] = await Promise.all(result.rows.map((row) => buildUniversity(row)))
    response.status(201).json({ success: true, data: university })
  }),
)
