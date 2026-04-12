import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'
import { requireRoles } from '../middleware/authGuard.js'

export const studentsRouter = Router()

studentsRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const isStudent = request.auth?.role === 'student'
    const result = isStudent
      ? await pool.query(
          `
            SELECT s.*, u.name AS university_name
            FROM students s
            LEFT JOIN universities u ON u.id = s.university_affiliation
            WHERE s.id = $1
          `,
          [request.auth.userId],
        )
      : await pool.query(
          `
            SELECT s.*, u.name AS university_name
            FROM students s
            LEFT JOIN universities u ON u.id = s.university_affiliation
            ORDER BY s.created_at DESC
          `,
        )

    response.json({ success: true, data: result.rows })
  }),
)

studentsRouter.post(
  '/add',
  requireRoles(['admin', 'superadmin']),
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

    // Hash default password
    const defaultPassword = 'password123'
    const passwordHash = await bcrypt.hash(defaultPassword, 10)

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const result = await client.query(
        `
          INSERT INTO students (
            id, first_name, last_name, email, address, phone_number, date_of_birth,
            university_affiliation, major_field_of_study, student_status, year_of_study, password_hash
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
          passwordHash,
        ],
      )

      const cartId = id.startsWith('S') ? `C${id.slice(1)}` : `C${id}`
      await client.query('INSERT INTO carts (id, student_id) VALUES ($1, $2)', [cartId, id])

      await client.query('COMMIT')
      response.status(201).json({ success: true, data: result.rows[0] })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }),
)
