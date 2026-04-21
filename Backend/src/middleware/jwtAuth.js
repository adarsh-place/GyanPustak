import { verifyToken } from '../utils/jwt.js'

export function jwtAuth(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }
  const payload = verifyToken(token)
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
  req.auth = {
    userId: payload.userId,
    role: payload.role,
  }
  next()
}