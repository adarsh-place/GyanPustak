export function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    return next(error)
  }

  const statusCode = error.statusCode || 500
  const message = error.message || 'Internal Server Error'

  response.status(statusCode).json({
    success: false,
    message,
  })
}
