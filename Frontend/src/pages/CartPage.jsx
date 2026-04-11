import { useState } from 'react'
import { apiClient } from '../api/client'
import { useGyanPustak } from '../context/GyanPustakContext'
import './CartPage.css'

function CartPage() {
  const { activeRole, cart, cartBooks, student, reloadCart, reloadOrders } = useGyanPustak()
  const [shippingType, setShippingType] = useState('standard')
  const [actionMessage, setActionMessage] = useState('')
  const [actionType, setActionType] = useState('info')
  const [isActionLoading, setIsActionLoading] = useState(false)

  const handleRemove = async (bookId) => {
    setActionMessage('Removing from cart...')
    setActionType('info')
    setIsActionLoading(true)

    try {
      await apiClient.removeCartItem(bookId)
      await reloadCart()
      setActionMessage('Item removed successfully')
      setActionType('success')
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to remove item')
      setActionType('error')
    } finally {
      setIsActionLoading(false)
      setTimeout(() => setActionMessage(''), 1800)
    }
  }

  const handlePlaceOrder = async () => {
    if (cartBooks.length === 0) {
      return
    }

    setActionMessage('Placing order...')
    setActionType('info')
    setIsActionLoading(true)

    try {
      await apiClient.createOrderFromCart({
        studentId: student.id,
        shippingType,
        creditCardNumber: '**** **** **** 1245',
        creditCardExpirationDate: '11/29',
        creditCardHolderName: `${student.firstName} ${student.lastName}`,
        creditCardType: 'Visa',
        status: 'new',
      })
      await Promise.all([reloadCart(), reloadOrders()])
      setActionMessage('Order placed successfully')
      setActionType('success')
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to place order')
      setActionType('error')
    } finally {
      setIsActionLoading(false)
      setTimeout(() => setActionMessage(''), 1800)
    }
  }

  if (activeRole !== 'student') {
    return (
      <section className="section-stack">
        <h2>Cart</h2>
        <article className="card">
          <p>Only students can manage a shopping cart.</p>
        </article>
      </section>
    )
  }

  const total = cartBooks.reduce((sum, book) => sum + book.price, 0)

  return (
    <section className="section-stack cart-page">
      <h2>Shopping Cart</h2>
      <article className="card">
        <p>
          Cart ID: {cart.id || 'N/A'} 
          {/* | Date created: {cart.createdAt || 'N/A'}  */}
        </p>
        <p>
          Last updated:{' '}
          {cart.updatedAt || 'N/A'}
        </p>
      </article>

      {actionMessage && <article className={`status-message ${actionType}`}>{actionMessage}</article>}

      {cartBooks.length === 0 ? (
        <article className="card">
          <p>Your cart is currently empty.</p>
        </article>
      ) : (
        <div className="stack">
          {cartBooks.map((book) => (
            <article key={book.id} className="card">
              <div className="card-header">
                <h3>{book.title}</h3>
                <span className="badge">₹{book.price}</span>
              </div>
              <p>{book.format} • {book.type}</p>
              <button className="button button-secondary" onClick={() => handleRemove(book.id)} disabled={isActionLoading}>
                Remove
              </button>
            </article>
          ))}

          <article className="card form">
            <h3>Checkout</h3>
            <p>Total amount: ₹{total}</p>
            <select
              className="input"
              value={shippingType}
              onChange={(event) => setShippingType(event.target.value)}
            >
              <option value="standard">standard</option>
              <option value="2-day">2-day</option>
              <option value="1-day">1-day</option>
            </select>
            <button className="button" onClick={handlePlaceOrder} disabled={isActionLoading}>
              Place Order
            </button>
          </article>
        </div>
      )}
    </section>
  )
}

export default CartPage
