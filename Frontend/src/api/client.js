const DEFAULT_API_BASE_URL = '/api'

function resolveBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
  return configuredBaseUrl.endsWith('/') ? configuredBaseUrl.slice(0, -1) : configuredBaseUrl
}

async function request(path, options = {}) {
  const response = await fetch(`${resolveBaseUrl()}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json') ? await response.json() : null

  if (!response.ok) {
    const message = payload?.message || `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return payload
}

export const apiClient = {
  getSignupUniversities() {
    return request('/auth/signup/universities')
  },
  signupStudent(payload) {
    return request('/auth/signup/student', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  login(payload) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  getSession() {
    return request('/auth/session')
  },
  logout() {
    return request('/auth/logout', {
      method: 'POST',
    })
  },
  getBooks() {
    return request(`/books`)
  },
  getBookById(bookId) {
    return request(`/books/${bookId}`)
  },
  createBook(payload) {
    return request('/books/add', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  getUniversities() {
    return request('/universities')
  },
  getInstructors() {
    return request('/instructors')
  },
  createInstructor(payload) {
    return request('/instructors/add', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  createUniversity(payload) {
    return request('/universities/add', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  createDepartment(universityId, payload) {
    return request(`/universities/${universityId}/departments/add`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  getCourses() {
    return request('/courses')
  },
  createCourse(payload) {
    return request('/courses/add', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  getStudents() {
    return request('/students')
  },
  getEmployees() {
    return request('/employees')
  },
  getTickets() {
    return request('/tickets')
  },
  createTicket(payload) {
    return request('/tickets/add', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  updateTicketStatus(ticketId, payload) {
    return request(`/tickets/${ticketId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
  getCart() {
    return request(`/carts`)
  },
  addCartItem(payload) {
    return request(`/carts/items/add`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  removeCartItem(bookId) {
    return request(`/carts/items/${bookId}`, {
      method: 'DELETE',
    })
  },
  getOrders() {
    return request('/orders')
  },
  createOrderFromCart(payload) {
    return request('/orders/from-cart/add', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  cancelOrder(orderId) {
    return request(`/orders/${orderId}/cancel`, {
      method: 'PATCH',
    })
  },
  createEmployee(payload) {
    return request('/employees/add', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  createStudent(payload) {
    return request('/students/add', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  getBookReviews(bookId) {
    return request(`/reviews/book/${bookId}`)
  },
  createReview(payload) {
    return request('/reviews/add', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  deleteReview(reviewId) {
    return request(`/reviews/${reviewId}`, {
      method: 'DELETE',
    })
  },
}
