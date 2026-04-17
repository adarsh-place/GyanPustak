import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'

export const authRouter = Router()
const LOGIN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const VALID_ROLES = new Set(['student', 'support', 'admin', 'superadmin'])

function getCookieOptions(httpOnly) {
  const isProduction = process.env.NODE_ENV === 'production'

  return {
    httpOnly,
    secure: isProduction,
    sameSite: isProduction ? 'None' : 'Lax',
    maxAge: LOGIN_MAX_AGE_MS,
  }
}

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

function clearAuthCookies(response) {
  response.clearCookie('auth_user_id', getCookieOptions(true))
  response.clearCookie('auth_role', getCookieOptions(false))
}

async function resolveAuthSession(request, response) {
  const userId = request.cookies.auth_user_id
  const role = request.cookies.auth_role

  if (!userId || !role) {
    return {
      authenticated: false,
      userId: null,
      role: null,
    }
  }

  const normalizedRole = String(role).toLowerCase().trim()
  if (!VALID_ROLES.has(normalizedRole)) {
    clearAuthCookies(response)
    return {
      authenticated: false,
      userId: null,
      role: null,
    }
  }

  if (normalizedRole === 'student') {
    const result = await pool.query('SELECT email FROM students WHERE email = $1', [userId])
    if (result.rowCount === 0) {
      clearAuthCookies(response)
      return {
        authenticated: false,
        userId: null,
        role: null,
      }
    }
  } else {
    const result = await pool.query('SELECT id FROM employees WHERE id = $1 AND role = $2', [
      userId,
      normalizedRole,
    ])
    if (result.rowCount === 0) {
      clearAuthCookies(response)
      return {
        authenticated: false,
        userId: null,
        role: null,
      }
    }
  }

  return {
    authenticated: true,
    userId,
    role: normalizedRole,
  }
}

authRouter.post(
  '/signup/student',
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
      password,
      confirmPassword,
    } = request.body

    if (
      !firstName ||
      !lastName ||
      !email ||
      !phoneNumber ||
      !(universityAffiliation || universityId) ||
      !majorFieldOfStudy ||
      !studentStatus ||
      !yearOfStudy ||
      !password ||
      !confirmPassword
    ) {
      throw new HttpError(400, 'Missing required student signup fields')
    }

    if (!isValidEmail(email.trim())) {
      throw new HttpError(400, 'Invalid email format')
    }

    if (!isValidPhone(phoneNumber)) {
      throw new HttpError(400, 'Invalid phone format')
    }

    if (!['undergraduate', 'graduate'].includes(studentStatus)) {
      throw new HttpError(400, 'Invalid student status')
    }

    if (String(password).trim().length < 6) {
      throw new HttpError(400, 'Password must be at least 6 characters')
    }

    if (String(password) !== String(confirmPassword)) {
      throw new HttpError(400, 'Password and confirm password do not match')
    }

    const selectedUniversityId = universityAffiliation || universityId
    const universityResult = await pool.query('SELECT id FROM universities WHERE id = $1', [selectedUniversityId])
    if (universityResult.rowCount === 0) {
      throw new HttpError(400, 'Invalid university selected')
    }

    const passwordHash = await bcrypt.hash(String(password), 10)

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const normalizedEmail = email.trim().toLowerCase()
      const insertResult = await client.query(
        `
          INSERT INTO students (
            first_name, last_name, email, address, phone_number, date_of_birth,
            university_affiliation, major_field_of_study, student_status, year_of_study, password_hash
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING first_name, last_name, email, university_affiliation, student_status, year_of_study
        `,
        [
          firstName.trim(),
          lastName.trim(),
          normalizedEmail,
          String(address).trim(),
          String(phoneNumber).trim(),
          dateOfBirth || null,
          selectedUniversityId,
          majorFieldOfStudy.trim(),
          studentStatus,
          yearOfStudy.trim(),
          passwordHash,
        ],
      )

      const cartId = `C${Date.now()}${Math.floor(100 + Math.random() * 900)}`
      await client.query('INSERT INTO carts (id, student_id) VALUES ($1, $2)', [cartId, normalizedEmail])

      await client.query('COMMIT')
      response.status(201).json({
        success: true,
        data: insertResult.rows[0],
        message: 'Student account created successfully',
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }),
)

authRouter.get(
  '/signup/universities',
  asyncHandler(async (request, response) => {
    const result = await pool.query('SELECT id, name FROM universities ORDER BY name ASC')
    response.json({ success: true, data: result.rows })
  }),
)

authRouter.get(
  '/session',
  asyncHandler(async (request, response) => {
    const session = await resolveAuthSession(request, response)
    response.json({ success: true, data: session })
  }),
)

authRouter.post(
  '/login',
  asyncHandler(async (request, response) => {
    const { email, password, role } = request.body

    if (!email || !email.trim()) {
      throw new HttpError(400, 'Email is required')
    }

    if (!password || !password.trim()) {
      throw new HttpError(400, 'Password is required')
    }

    if (!role || !role.trim()) {
      throw new HttpError(400, 'Role is required')
    }

    const userRole = role.toLowerCase().trim()
    const validRoles = ['student', 'support', 'admin', 'superadmin']
    if (!validRoles.includes(userRole)) {
      throw new HttpError(400, 'Invalid role')
    }

    let user = null

    if (userRole === 'student') {
      const result = await pool.query(
        'SELECT email, password_hash FROM students WHERE email = $1',
        [email.trim().toLowerCase()],
      )
      if (result.rows.length > 0) {
        user = result.rows[0]
        user.role = 'student'
      }
    } else {
      const result = await pool.query(
        'SELECT id, email, password_hash, role FROM employees WHERE email = $1 AND role = ANY($2)',
        [email.trim(), [userRole]],
      )
      if (result.rows.length > 0) {
        user = result.rows[0]
      }
    }

    if (!user) {
      throw new HttpError(401, 'Invalid email or role')
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash)
    if (!isPasswordValid) {
      throw new HttpError(401, 'Invalid password')
    }

    response.cookie('auth_user_id', userRole === 'student' ? user.email : user.id, getCookieOptions(true))
    response.cookie('auth_role', user.role, getCookieOptions(false))

    response.json({
      success: true,
      data: {
        userId: userRole === 'student' ? user.email : user.id,
        role: user.role,
      },
    })
  }),
)

authRouter.post(
  '/logout',
  asyncHandler(async (request, response) => {
    response.clearCookie('auth_user_id', getCookieOptions(true))
    response.clearCookie('auth_role', getCookieOptions(false))

    response.json({
      success: true,
      message: 'Logged out successfully',
    })
  }),
)