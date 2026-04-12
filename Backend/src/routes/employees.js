import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'
import { requireRoles } from '../middleware/authGuard.js'

export const employeesRouter = Router()

employeesRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const result = await pool.query('SELECT * FROM employees ORDER BY created_at DESC')
    response.json({ success: true, data: result.rows })
  }),
)

employeesRouter.post(
  '/add',
  requireRoles(['superadmin']),
  asyncHandler(async (request, response) => {
    const {
      id,
      firstName,
      lastName,
      gender = '',
      salary = 0,
      aadhaarNumber,
      email,
      address = '',
      telephoneNumber = '',
      role,
    } = request.body

    if (!id || !firstName || !lastName || !aadhaarNumber || !email || !role) {
      throw new HttpError(400, 'Missing required employee fields')
    }

    if (!['support', 'admin', 'superadmin'].includes(role)) {
      throw new HttpError(400, 'Invalid employee role')
    }

    const normalizedAadhaarNumber = aadhaarNumber.trim()

    const defaultPassword = 'password123'
    const passwordHash = await bcrypt.hash(defaultPassword, 10)

    const result = await pool.query(
      `
        INSERT INTO employees (
          id, first_name, last_name, gender, salary, aadhaar_number,
          email, address, telephone_number, role, password_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `,
      [id, firstName, lastName, gender, salary, normalizedAadhaarNumber, email, address, telephoneNumber, role, passwordHash],
    )

    response.status(201).json({ success: true, data: result.rows[0] })
  }),
)
