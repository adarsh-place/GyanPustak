import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'
import { requireRoles } from '../middleware/authGuard.js'

export const studentsRouter = Router()

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function isValidPhone(phone) {
  const cleaned = String(phone).replace(/[\s-]/g, '')
  const plusFormat = /^\+91\d{10}$/
  const plainFormat = /^\d{10}$/
  return plusFormat.test(cleaned) || plainFormat.test(cleaned)
}

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
            WHERE s.email = $1
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
      firstName,
      lastName,
      email,
      address = '',
      phoneNumber,
      dateOfBirth = null,
      universityAffiliation,
      universityId,
      majorFieldOfStudy,
      studentStatus,
      yearOfStudy,
    } = request.body

    if (
      !firstName ||
      !lastName ||
      !email ||
      !phoneNumber ||
      !(universityAffiliation || universityId) ||
      !majorFieldOfStudy ||
      !studentStatus ||
      !yearOfStudy
    ) {
      throw new HttpError(400, 'Missing required student fields')
    }

    // Hash default password
    const defaultPassword = 'password123'
    const passwordHash = await bcrypt.hash(defaultPassword, 10)

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const selectedUniversityId = universityAffiliation || universityId
      const result = await client.query(
        `
          INSERT INTO students (
            first_name, last_name, email, address, phone_number, date_of_birth,
            university_affiliation, major_field_of_study, student_status, year_of_study, password_hash
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `,
        [
          firstName,
          lastName,
          email.trim().toLowerCase(),
          address,
          phoneNumber,
          dateOfBirth,
          selectedUniversityId,
          majorFieldOfStudy,
          studentStatus,
          yearOfStudy,
          passwordHash,
        ],
      )

      const cartId = `C${Date.now()}${Math.floor(100 + Math.random() * 900)}`
      await client.query('INSERT INTO carts (id, student_id) VALUES ($1, $2)', [cartId, email.trim().toLowerCase()])

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

studentsRouter.patch(
  '/:studentId',
  asyncHandler(async (request, response) => {
    const { studentId } = request.params
    const role = request.auth?.role
    const authUserId = request.auth?.userId

    if (!studentId) {
      throw new HttpError(400, 'Student identifier is required')
    }

    if (role === 'student' && authUserId !== studentId) {
      throw new HttpError(403, 'You can only update your own profile')
    }

    if (role !== 'student' && role !== 'admin' && role !== 'superadmin') {
      throw new HttpError(403, 'Forbidden')
    }

    const firstName = (request.body.first_name ?? request.body.firstName ?? '').trim()
    const lastName = (request.body.last_name ?? request.body.lastName ?? '').trim()
    const email = (request.body.email ?? '').trim().toLowerCase()
    const address = (request.body.address ?? '').trim()
    const phoneNumber = (request.body.phone_number ?? request.body.phoneNumber ?? '').trim()
    const dateOfBirth = (request.body.date_of_birth ?? request.body.dateOfBirth ?? '').trim()
    const universityAffiliation = (
      request.body.university_affiliation ?? request.body.universityAffiliation ?? ''
    ).trim()
    const majorFieldOfStudy = (
      request.body.major_field_of_study ?? request.body.majorFieldOfStudy ?? ''
    ).trim()
    const yearOfStudy = (request.body.year_of_study ?? request.body.yearOfStudy ?? '').trim()
    const password = (request.body.password ?? '').trim()

    if (
      !firstName ||
      !lastName ||
      !email ||
      !universityAffiliation ||
      !majorFieldOfStudy ||
      !yearOfStudy
    ) {
      throw new HttpError(400, 'Missing required student profile fields')
    }

    if (!isValidEmail(email)) {
      throw new HttpError(400, 'Invalid email format')
    }

    if (phoneNumber && !isValidPhone(phoneNumber)) {
      throw new HttpError(400, 'Invalid phone format')
    }

    if (password && password.length < 6) {
      throw new HttpError(400, 'Password must be at least 6 characters')
    }

    const universityResult = await pool.query('SELECT id FROM universities WHERE id = $1', [
      universityAffiliation,
    ])
    if (universityResult.rowCount === 0) {
      throw new HttpError(400, 'Invalid university selected')
    }

    const updateValues = [
      firstName,
      lastName,
      email,
      address || null,
      phoneNumber || null,
      dateOfBirth || null,
      universityAffiliation,
      majorFieldOfStudy,
      yearOfStudy,
      studentId.trim().toLowerCase(),
    ]

    let updateQuery = `
      UPDATE students
      SET
        first_name = $1,
        last_name = $2,
        email = $3,
        address = $4,
        phone_number = $5,
        date_of_birth = $6,
        university_affiliation = $7,
        major_field_of_study = $8,
        year_of_study = $9,
        updated_at = NOW()
    `

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10)
      updateValues.push(passwordHash)
      updateQuery += ', password_hash = $11'
    }

    updateQuery += ' WHERE email = $10 RETURNING *'

    let updatedStudent = null
    try {
      const updatedResult = await pool.query(updateQuery, updateValues)
      if (updatedResult.rowCount === 0) {
        throw new HttpError(404, 'Student not found')
      }
      updatedStudent = updatedResult.rows[0]
    } catch (error) {
      if (error?.code === '23505') {
        throw new HttpError(409, 'Email already exists')
      }
      throw error
    }

    const studentWithUniversity = await pool.query(
      `
        SELECT s.*, u.name AS university_name
        FROM students s
        LEFT JOIN universities u ON u.id = s.university_affiliation
        WHERE s.email = $1
      `,
      [updatedStudent.email],
    )

    if (role === 'student' && authUserId === studentId && updatedStudent.email !== authUserId) {
      response.cookie('auth_user_id', updatedStudent.email, getCookieOptions(true))
    }

    response.json({
      success: true,
      data: studentWithUniversity.rows[0],
      message: 'Student profile updated successfully',
    })
  }),
)
