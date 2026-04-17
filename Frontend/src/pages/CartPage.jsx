import { useEffect, useState } from 'react'
import { apiClient } from '../api/client'
import { useGyanPustak } from '../context/GyanPustakContext'
import './CartPage.css'

function CartPage() {
  const { activeRole, cart, cartBooks, books, student, reloadCart, reloadOrders } = useGyanPustak()
  const [shippingType, setShippingType] = useState('standard')
  const [quantityDrafts, setQuantityDrafts] = useState({})
  const [paymentDetails, setPaymentDetails] = useState({
    creditCardNumber: '',
    creditCardExpirationDate: '',
    creditCardHolderName: '',
    creditCardType: 'Visa',
  })
  const [actionMessage, setActionMessage] = useState('')
  const [actionType, setActionType] = useState('info')
  const [isActionLoading, setIsActionLoading] = useState(false)

  const isValidCardNumber = (cardNumber) => {
    const digitsOnly = cardNumber.replace(/\s+/g, '')
    return /^\d{16}$/.test(digitsOnly)
  }

  const isValidExpiry = (expiry) => {
    return /^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry.trim())
  }

  useEffect(() => {
    setQuantityDrafts(
      Object.fromEntries(cartBooks.map((book) => [book.isbn, String(book.quantity ?? 1)])),
    )
  }, [cartBooks])

  const getAvailableQuantity = (bookIsbn) => {
    const bookDetails = books.find((book) => String(book.isbn) === String(bookIsbn))
    return Number(bookDetails?.quantity ?? 0)
  }

  const handleRemove = async (bookIsbn) => {
    setActionMessage('Removing from cart...')
    setActionType('info')
    setIsActionLoading(true)

    try {
      await apiClient.removeCartItem(bookIsbn)
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

  const handleQuantityDraftChange = (bookIsbn, quantity) => {
    setQuantityDrafts((previous) => ({
      ...previous,
      [bookIsbn]: quantity,
    }))
  }

  const handleSaveQuantity = async (bookIsbn) => {
    const draftQuantity = quantityDrafts[bookIsbn]
    const parsedQuantity = Number(draftQuantity)
    const availableQuantity = getAvailableQuantity(bookIsbn)

    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 0) {
      setActionMessage('Quantity must be a non-negative integer')
      setActionType('error')
      return
    }

    if (parsedQuantity > availableQuantity) {
      setActionMessage(`Quantity cannot exceed available stock (${availableQuantity})`)
      setActionType('error')
      return
    }

    setActionMessage('Updating quantity...')
    setActionType('info')
    setIsActionLoading(true)

    try {
      await apiClient.updateCartItemQuantity(bookIsbn, { quantity: parsedQuantity })
      await reloadCart()
      setActionMessage(parsedQuantity === 0 ? 'Item removed successfully' : 'Quantity updated successfully')
      setActionType('success')
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to update quantity')
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

    if (
      !paymentDetails.creditCardNumber.trim() ||
      !paymentDetails.creditCardExpirationDate.trim() ||
      !paymentDetails.creditCardHolderName.trim() ||
      !paymentDetails.creditCardType.trim()
    ) {
      setActionMessage('Card number, expiry date, holder name and card type are required')
      setActionType('error')
      return
    }

    if (!isValidCardNumber(paymentDetails.creditCardNumber)) {
      setActionMessage('Invalid card number format (use 16 digits)')
      setActionType('error')
      return
    }

    if (!isValidExpiry(paymentDetails.creditCardExpirationDate)) {
      setActionMessage('Invalid expiry format (use MM/YY)')
      setActionType('error')
      return
    }

    setActionMessage('Placing order...')
    setActionType('info')
    setIsActionLoading(true)

    try {
      await apiClient.createOrderFromCart({
        studentId: student.email,
        shippingType,
        creditCardNumber: paymentDetails.creditCardNumber.replace(/\s+/g, ''),
        creditCardExpirationDate: paymentDetails.creditCardExpirationDate.trim(),
        creditCardHolderName: paymentDetails.creditCardHolderName.trim(),
        creditCardType: paymentDetails.creditCardType.trim(),
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

  const total = cartBooks.reduce(
    (sum, book) => (book.purchaseOption === 'buy' ? sum + book.price * book.quantity : sum),
    0,
  )

  return (
    <section className="section-stack cart-page">
      <div className="cart-header">
        <h2>Shopping Cart</h2>
        <div className="cart-header-meta">
          <span className="cart-count-pill">{cartBooks.length} items</span>
          <span className="cart-total-pill">Total: ₹{total}</span>
        </div>
      </div>

      <article className="card cart-meta-card">
        <div className="cart-meta-row">
          <span className="meta-label">Cart ID</span>
          <span className="meta-value">{cart.id || 'N/A'}</span>
        </div>
        <div className="cart-meta-row">
          <span className="meta-label">Last Updated</span>
          <span className="meta-value">{cart.updatedAt || 'N/A'}</span>
        </div>
      </article>

      {actionMessage && <article className={`status-message ${actionType}`}>{actionMessage}</article>}

      {cartBooks.length === 0 ? (
        <article className="card">
          <p>Your cart is currently empty.</p>
        </article>
      ) : (
        <div className="cart-layout">
          <div className="cart-items-grid">
            {cartBooks.map((book) => (
              <article key={book.isbn} className="card cart-book-card">
                <div className="card-header">
                  <h3>{book.title}</h3>
                  {book.purchaseOption === 'buy' ? <span className="badge">₹{book.price}</span> : null}
                </div>
                <p className="book-meta">{book.format} • {book.type}</p>
                <p className="book-option">Option: {book.purchaseOption || 'buy'}</p>
                <div className="inline-actions">
                  <label className="meta-label" htmlFor={`quantity-${book.isbn}`}>
                    Qty
                  </label>
                  <span className="meta-label">Available: {getAvailableQuantity(book.isbn)}</span>
                  <input
                    id={`quantity-${book.isbn}`}
                    className="input"
                    type="number"
                    min="0"
                    step="1"
                    max={Math.max(getAvailableQuantity(book.isbn), Number(book.quantity ?? 1))}
                    value={quantityDrafts[book.isbn] ?? String(book.quantity ?? 1)}
                    onChange={(event) => handleQuantityDraftChange(book.isbn, event.target.value)}
                    disabled={isActionLoading}
                    style={{ maxWidth: '110px' }}
                  />
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => handleSaveQuantity(book.isbn)}
                    disabled={isActionLoading}
                  >
                    Save
                  </button>
                </div>
                <button className="button button-secondary" onClick={() => handleRemove(book.isbn)} disabled={isActionLoading}>
                  Remove
                </button>
              </article>
            ))}
          </div>

          <article className="card form checkout-card">
            <div className="checkout-header">
              <h3>Checkout</h3>
              <p className="checkout-total">₹{total}</p>
            </div>
            <input
              className="input"
              placeholder="Card number"
              value={paymentDetails.creditCardNumber}
              onChange={(event) =>
                setPaymentDetails((previous) => ({
                  ...previous,
                  creditCardNumber: event.target.value,
                }))
              }
            />
            <div className="inline-actions">
              <input
                className="input"
                placeholder="Expiry date (MM/YY)"
                value={paymentDetails.creditCardExpirationDate}
                onChange={(event) =>
                  setPaymentDetails((previous) => ({
                    ...previous,
                    creditCardExpirationDate: event.target.value,
                  }))
                }
              />
              <select
                className="input"
                value={paymentDetails.creditCardType}
                onChange={(event) =>
                  setPaymentDetails((previous) => ({
                    ...previous,
                    creditCardType: event.target.value,
                  }))
                }
              >
                <option value="Visa">Visa</option>
                <option value="Mastercard">Mastercard</option>
                <option value="RuPay">RuPay</option>
                <option value="Amex">Amex</option>
              </select>
            </div>
            <input
              className="input"
              placeholder="Card holder name"
              value={paymentDetails.creditCardHolderName}
              onChange={(event) =>
                setPaymentDetails((previous) => ({
                  ...previous,
                  creditCardHolderName: event.target.value,
                }))
              }
            />
            <select
              className="input"
              value={shippingType}
              onChange={(event) => setShippingType(event.target.value)}
            >
              <option value="standard">Standard shipping</option>
              <option value="2-day">2-day shipping</option>
              <option value="1-day">1-day shipping</option>
            </select>
            <button className="button checkout-button" onClick={handlePlaceOrder} disabled={isActionLoading}>
              {isActionLoading ? 'Processing...' : 'Place Order'}
            </button>
          </article>
        </div>
      )}

    </section>
  )
}

export default CartPage
