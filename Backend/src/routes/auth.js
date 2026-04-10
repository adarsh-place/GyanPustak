import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'

export const authRouter = Router()
const LOGIN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

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
    let table = ''

    if (userRole === 'student') {
      const result = await pool.query(
        'SELECT id, email, password_hash FROM students WHERE email = $1',
        [email.trim()],
      )
      if (result.rows.length > 0) {
        user = result.rows[0]
        user.role = 'student'
        table = 'students'
      }
    } else {
      const result = await pool.query(
        'SELECT id, email, password_hash, role FROM employees WHERE email = $1 AND role = ANY($2)',
        [email.trim(), [userRole]],
      )
      if (result.rows.length > 0) {
        user = result.rows[0]
        table = 'employees'
      }
    }

    if (!user) {
      throw new HttpError(401, 'Invalid email or role')
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash)
    if (!isPasswordValid) {
      throw new HttpError(401, 'Invalid password')
    }

    response.cookie('auth_user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: LOGIN_MAX_AGE_MS,
    })

    response.cookie('auth_role', user.role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: LOGIN_MAX_AGE_MS,
    })

    response.json({
      success: true,
      data: {
        userId: user.id,
        role: user.role,
      },
    })
  }),
)

authRouter.post(
  '/logout',
  asyncHandler(async (request, response) => {
    response.clearCookie('auth_user_id')
    response.clearCookie('auth_role')

    response.json({
      success: true,
      message: 'Logged out successfully',
    })
  }),
)