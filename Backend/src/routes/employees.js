import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'
import { requireRoles } from '../middleware/authGuard.js'

export const employeesRouter = Router()

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function isValidPhone(phone) {
  if (!phone) {
    return true
  }

  const cleaned = String(phone).replace(/[\s-]/g, '')
  const plusFormat = /^\+91\d{10}$/
  const plainFormat = /^\d{10}$/
  return plusFormat.test(cleaned) || plainFormat.test(cleaned)
}

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

employeesRouter.patch(
  '/:employeeId',
  asyncHandler(async (request, response) => {
    const { employeeId } = request.params
    const role = request.auth?.role
    const authUserId = request.auth?.userId

    if (!employeeId) {
      throw new HttpError(400, 'Employee id is required')
    }

    if (role === 'support' || role === 'admin') {
      if (authUserId !== employeeId) {
        throw new HttpError(403, 'You can only update your own profile')
      }
    }

    if (!['support', 'admin', 'superadmin'].includes(role)) {
      throw new HttpError(403, 'Forbidden')
    }

    const firstName = (request.body.first_name ?? request.body.firstName ?? '').trim()
    const lastName = (request.body.last_name ?? request.body.lastName ?? '').trim()
    const gender = (request.body.gender ?? '').trim()
    const salaryRaw = request.body.salary
    const aadhaarNumber = (request.body.aadhaar_number ?? request.body.aadhaarNumber ?? '').trim()
    const email = (request.body.email ?? '').trim()
    const address = (request.body.address ?? '').trim()
    const telephoneNumber = (
      request.body.telephone_number ?? request.body.telephoneNumber ?? ''
    ).trim()
    const password = (request.body.password ?? '').trim()

    if (!firstName || !lastName || !aadhaarNumber || !email) {
      throw new HttpError(400, 'Missing required employee profile fields')
    }

    if (!isValidEmail(email)) {
      throw new HttpError(400, 'Invalid email format')
    }

    if (!isValidPhone(telephoneNumber)) {
      throw new HttpError(400, 'Invalid phone format')
    }

    if (password && password.length < 6) {
      throw new HttpError(400, 'Password must be at least 6 characters')
    }

    const existingEmployeeResult = await pool.query('SELECT salary FROM employees WHERE id = $1', [
      employeeId,
    ])
    if (existingEmployeeResult.rowCount === 0) {
      throw new HttpError(404, 'Employee not found')
    }

    const normalizedSalary = String(salaryRaw ?? '').replace(/,/g, '').trim()
    const parsedSalary = normalizedSalary ? Number(normalizedSalary) : null
    const canEditSalary = role === 'superadmin'
    const salary = canEditSalary && parsedSalary !== null && Number.isFinite(parsedSalary) && parsedSalary >= 0
      ? parsedSalary
      : Number(existingEmployeeResult.rows[0].salary)

    const updateValues = [
      firstName,
      lastName,
      gender || null,
      salary,
      aadhaarNumber,
      email,
      address || null,
      telephoneNumber || null,
      employeeId,
    ]

    let updateQuery = `
      UPDATE employees
      SET
        first_name = $1,
        last_name = $2,
        gender = $3,
        salary = $4,
        aadhaar_number = $5,
        email = $6,
        address = $7,
        telephone_number = $8,
        updated_at = NOW()
    `

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10)
      updateValues.push(passwordHash)
      updateQuery += ', password_hash = $10'
      updateQuery += ' WHERE id = $9 RETURNING *'
    } else {
      updateQuery += ' WHERE id = $9 RETURNING *'
    }

    try {
      const updatedResult = await pool.query(updateQuery, updateValues)
      response.json({
        success: true,
        data: updatedResult.rows[0],
        message: 'Employee profile updated successfully',
      })
    } catch (error) {
      if (error?.code === '23505') {
        throw new HttpError(409, 'Email or Aadhaar already exists')
      }
      throw error
    }
  }),
)
