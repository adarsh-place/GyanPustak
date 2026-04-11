import { useState } from 'react'
import { apiClient } from '../api/client'
import { useGyanPustak } from '../context/GyanPustakContext'
import './OrdersPage.css'

function OrdersPage() {
  const { orders, reloadOrders } = useGyanPustak()
  const [actionMessage, setActionMessage] = useState('')
  const [actionType, setActionType] = useState('info')
  const [isActionLoading, setIsActionLoading] = useState(false)

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
      <h2>Orders</h2>
      {actionMessage && <article className={`status-message ${actionType}`}>{actionMessage}</article>}
      <div className="stack">
        {orders.length === 0 ? (
          <article className="card">
            <p>No orders yet.</p>
          </article>
        ) : (
          orders.map((order) => (
            <article key={order.orderId} className="card">
              <div className="card-header">
                <h3>{order.orderId}</h3>
                <span className="badge">{order.status}</span>
              </div>
              <p>Student: {order.studentId} | Created: {order.dateCreated}</p>
              <p>Books: {order.items.join(', ')}</p>
              <p>Shipping: {order.shippingType}</p>
              <p>
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
