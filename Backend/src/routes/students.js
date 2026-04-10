import { Router } from 'express'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'

export const studentsRouter = Router()

studentsRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const result = await pool.query('SELECT * FROM students ORDER BY created_at DESC')
    response.json({ success: true, data: result.rows })
  }),
)

studentsRouter.get(
  '/:id',
  asyncHandler(async (request, response) => {
    const result = await pool.query('SELECT * FROM students WHERE id = $1', [request.params.id])
    if (result.rowCount === 0) {
      throw new HttpError(404, 'Student not found')
    }

    response.json({ success: true, data: result.rows[0] })
  }),
)

studentsRouter.post(
  '/',
  asyncHandler(async (request, response) => {
    const {
      id,
      firstName,
      lastName,
      email,
      address = '',
      phoneNumber = '',
      dateOfBirth = null,
      universityAffiliation,
      majorFieldOfStudy,
      studentStatus,
      yearOfStudy,
    } = request.body

    if (!id || !firstName || !lastName || !email || !universityAffiliation || !majorFieldOfStudy || !studentStatus || !yearOfStudy) {
      throw new HttpError(400, 'Missing required student fields')
    }

    const result = await pool.query(
      `
        INSERT INTO students (
          id, first_name, last_name, email, address, phone_number, date_of_birth,
          university_affiliation, major_field_of_study, student_status, year_of_study
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `,
      [
        id,
        firstName,
        lastName,
        email,
        address,
        phoneNumber,
        dateOfBirth,
        universityAffiliation,
        majorFieldOfStudy,
        studentStatus,
        yearOfStudy,
      ],
    )

    response.status(201).json({ success: true, data: result.rows[0] })
  }),
)
