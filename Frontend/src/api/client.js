const DEFAULT_API_BASE_URL = '/api'

function resolveBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
  return configuredBaseUrl.endsWith('/') ? configuredBaseUrl.slice(0, -1) : configuredBaseUrl
}

async function request(path, options = {}) {
  const response = await fetch(`${resolveBaseUrl()}${path}`, {
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
  getBooks(search) {
    const query = search ? `?search=${encodeURIComponent(search)}` : ''
    return request(`/books${query}`)
  },
  getUniversities() {
    return request('/universities')
  },
  getCourses() {
    return request('/courses')
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
    return request('/tickets', {
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
  getCart(studentId) {
    return request(`/carts/${studentId}`)
  },
  addCartItem(studentId, payload) {
    return request(`/carts/${studentId}/items`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  removeCartItem(studentId, bookId) {
    return request(`/carts/${studentId}/items/${bookId}`, {
      method: 'DELETE',
    })
  },
  getOrders(studentId) {
    return request(`/orders/${studentId}`)
  },
  createOrderFromCart(payload) {
    return request('/orders/from-cart', {
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
    return request('/employees', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}
