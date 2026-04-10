import { Router } from 'express'

export const healthRouter = Router()

healthRouter.get('/', (request, response) => {
  response.json({
    success: true,
    message: 'GyanPustak API is healthy',
    timestamp: new Date().toISOString(),
  })
})
