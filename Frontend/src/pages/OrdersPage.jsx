import { useState } from 'react'
import { apiClient } from '../api/client'
import { useGyanPustak } from '../context/GyanPustakContext'
import './OrdersPage.css'

function OrdersPage() {
  const { orders, books, reloadOrders } = useGyanPustak()
  const [actionMessage, setActionMessage] = useState('')
  const [actionType, setActionType] = useState('info')
  const [isActionLoading, setIsActionLoading] = useState(false)

  const getBookDetailsById = (bookId) => books.find((book) => String(book.id) === String(bookId))

  const handleCancelOrder = async (orderId) => {
    setActionMessage('Canceling order...')
    setActionType('info')
    setIsActionLoading(true)

    try {
      await apiClient.cancelOrder(orderId)
      await reloadOrders()
      setActionMessage('Order canceled successfully')
      setActionType('success')
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to cancel order')
      setActionType('error')
    } finally {
      setIsActionLoading(false)
      setTimeout(() => setActionMessage(''), 1800)
    }
  }

  return (
    <section className="section-stack orders-page">
      <div className="orders-header">
        <h2>Orders</h2>
        <p className="orders-count">My Orders ({orders.length})</p>
      </div>

      {actionMessage && <article className={`status-message ${actionType}`}>{actionMessage}</article>}

      <div className="orders-grid">
        {orders.length === 0 ? (
          <article className="card">
            <p>No orders yet.</p>
          </article>
        ) : (
          orders.map((order) => (
            <article key={order.orderId} className="card order-card">
              <div className="card-header order-card-header">
                <h3 className="order-id">{order.orderId}</h3>
                <span
                  className={`status-chip status-${String(order.status).toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {order.status}
                </span>
              </div>

              <div className="order-meta-grid">
                <p>
                  <span className="meta-label">Student</span>
                  <span className="meta-value">{order.studentId}</span>
                </p>
                <p>
                  <span className="meta-label">Created</span>
                  <span className="meta-value">{order.dateCreated}</span>
                </p>
                <p>
                  <span className="meta-label">Shipping</span>
                  <span className="meta-value">{order.shippingType}</span>
                </p>
              </div>

              <div className="order-books">
                <p className="meta-label">Books</p>
                <div className="ordered-book-list">
                  {order.items.map((item, index) => {
                    const bookDetails = getBookDetailsById(item)

                    if (!bookDetails) {
                      return (
                        <article key={`${item}-${index}`} className="ordered-book-card ordered-book-card-muted">
                          <p className="ordered-book-title">Book #{item}</p>
                          <p className="ordered-book-subtitle">Details unavailable</p>
                        </article>
                      )
                    }

                    return (
                      <article key={bookDetails.id} className="ordered-book-card">
                        <div className="ordered-book-row">
                          <p className="ordered-book-title">{bookDetails.title}</p>
                          {bookDetails.purchaseOption === 'buy' ? (
                            <span className="ordered-book-price">₹{bookDetails.price}</span>
                          ) : null}
                        </div>
                        <p className="ordered-book-subtitle">
                          {(bookDetails.authors || []).length > 0
                            ? (bookDetails.authors || []).join(', ')
                            : 'Author unavailable'}
                        </p>
                        <p className="ordered-book-meta">
                          {bookDetails.format || 'Format N/A'} • {bookDetails.type || 'Type N/A'}
                        </p>
                      </article>
                    )
                  })}
                </div>
              </div>

              <p className="card-details">
                Card: {order.cardType} {order.cardNumber} ({order.cardExpiry})
              </p>

              {order.status !== 'canceled' && order.status !== 'shipped' && (
                <button className="button button-secondary" onClick={() => handleCancelOrder(order.orderId)} disabled={isActionLoading}>
                  Cancel Order
                </button>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  )
}

export default OrdersPage
