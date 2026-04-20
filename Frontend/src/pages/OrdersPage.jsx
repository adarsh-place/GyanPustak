import { useState } from 'react'
import { apiClient } from '../api/client'
import { useGyanPustak } from '../context/GyanPustakContext'
import './OrdersPage.css'

function OrdersPage() {
  const { orders, books, reloadOrders, activeRole } = useGyanPustak()
  const [actionMessage, setActionMessage] = useState('')
  const [actionType, setActionType] = useState('info')
  const [isActionLoading, setIsActionLoading] = useState(false)

  const canManageOrderStatus = ['support', 'admin', 'superadmin'].includes(activeRole)
  const orderStatusOptions = ['new', 'processed', 'awaiting shipping', 'shipped', 'canceled']

  const getBookDetailsByIsbn = (bookIsbn) => books.find((book) => String(book.isbn) === String(bookIsbn))

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

  const handleUpdateOrderStatus = async (orderId, status) => {
    setActionMessage('Updating order status...')
    setActionType('info')
    setIsActionLoading(true)

    try {
      await apiClient.updateOrderStatus(orderId, { status })
      await reloadOrders()
      setActionMessage('Order status updated successfully')
      setActionType('success')
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to update order status')
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
        <p className="orders-count">{canManageOrderStatus ? 'All Orders' : 'My Orders'} ({orders.length})</p>
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
                <p>
                  <span className="meta-label">Total</span>
                  <span className="meta-value">₹{order.totalAmount?.toFixed(2) ?? '0.00'}</span>
                </p>
              </div>

              <div className="order-books">
                <p className="meta-label">Books</p>
                <div className="ordered-book-list">
                  {order.items.map((item, index) => {
                    const bookDetails = getBookDetailsByIsbn(item.bookId)

                    if (!bookDetails) {
                      return (
                        <article key={`${item.bookId}-${index}`} className="ordered-book-card ordered-book-card-muted">
                          <p className="ordered-book-title">{item.title || `Book #${item.bookId}`}</p>
                          <p className="ordered-book-subtitle">Qty: {item.quantity}</p>
                          <p className="ordered-book-subtitle">Details unavailable</p>
                        </article>
                      )
                    }

                    return (
                      <article key={bookDetails.isbn} className="ordered-book-card">
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
                        <p className="ordered-book-subtitle">Qty: {item.quantity}</p>
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

              {canManageOrderStatus ? (
                <div className="order-status-actions">
                  <label htmlFor={`order-status-${order.orderId}`} className="meta-label">
                    Update status
                  </label>
                  <div className="inline-actions">
                    <select
                      id={`order-status-${order.orderId}`}
                      className="input"
                      value={order.status}
                      onChange={(event) => handleUpdateOrderStatus(order.orderId, event.target.value)}
                      disabled={isActionLoading || order.status === 'canceled'}
                    >
                      {orderStatusOptions.map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {statusOption}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : null}

              {!canManageOrderStatus && order.status !== 'canceled' && order.status !== 'shipped' && (
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
