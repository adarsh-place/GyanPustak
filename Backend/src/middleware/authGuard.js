import { HttpError } from '../utils/httpError.js'

export function requireRoles(allowedRoles) {
  return (request, response, next) => {
    if (!request.auth || !allowedRoles.includes(request.auth.role)) {
      return next(new HttpError(403, 'Forbidden'))
    }

    return next()
  }
}