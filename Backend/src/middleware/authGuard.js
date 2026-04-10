import { pool } from '../db/pool.js'
import { HttpError } from '../utils/httpError.js'

const VALID_ROLES = new Set(['student', 'support', 'admin', 'superadmin'])

function clearAuthCookies(response) {
  response.clearCookie('auth_user_id')
  response.clearCookie('auth_role')
}

export async function requireAuth(request, response, next) {
  try {
    const userId = request.cookies.auth_user_id
    const role = request.cookies.auth_role

    if (!userId || !role) {
      throw new HttpError(401, 'Authentication required')
    }

    const normalizedRole = String(role).toLowerCase().trim()
    if (!VALID_ROLES.has(normalizedRole)) {
      clearAuthCookies(response)
      throw new HttpError(401, 'Invalid authentication role')
    }

    if (normalizedRole === 'student') {
      const result = await pool.query('SELECT id FROM students WHERE id = $1', [userId])
      if (result.rows.length === 0) {
        clearAuthCookies(response)
        throw new HttpError(401, 'Invalid authentication session')
      }
    } else {
      const result = await pool.query('SELECT id FROM employees WHERE id = $1 AND role = $2', [
        userId,
        normalizedRole,
      ])
      if (result.rows.length === 0) {
        clearAuthCookies(response)
        throw new HttpError(401, 'Invalid authentication session')
      }
    }

    request.auth = {
      userId,
      role: normalizedRole,
    }

    next()
  } catch (error) {
    next(error)
  }
}

export function requireRoles(allowedRoles) {
  return (request, response, next) => {
    if (!request.auth || !allowedRoles.includes(request.auth.role)) {
      return next(new HttpError(403, 'Forbidden'))
    }

    return next()
  }
}