import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiClient } from '../api/client'
import { useGyanPustak } from '../context/GyanPustakContext'
import './BookDetailsPage.css'

function BookDetailsPage() {
  const { id: bookIsbn } = useParams()
  const { books, activeRole, cartBooks, student, reloadCart } = useGyanPustak()

  const [book, setBook] = useState(() => books.find((item) => item.isbn === bookIsbn) || null)
  const [isLoadingBook, setIsLoadingBook] = useState(false)
  const [bookError, setBookError] = useState('')

  const [reviews, setReviews] = useState([])
  const [hasReviewed, setHasReviewed] = useState(false)
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [reviewFormState, setReviewFormState] = useState({ rating: 5, reviewText: '' })

  const [actionMessage, setActionMessage] = useState('')
  const [actionType, setActionType] = useState('info')
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)

  const cartBookIds = useMemo(() => new Set(cartBooks.map((item) => item.isbn)), [cartBooks])
  const isBookInCart = Boolean(bookIsbn) && cartBookIds.has(bookIsbn)
  const currentStudentEmail = student?.email || null
  const isOutOfStock = Number(book?.quantity ?? 0) <= 0
  const averageRating = useMemo(() => {
    if (!reviews.length) {
      return null
    }

    const sum = reviews.reduce((total, review) => total + Number(review.rating || 0), 0)
    return (sum / reviews.length).toFixed(1)
  }, [reviews])

  const coverUrl = useMemo(() => {
    if (!book?.isbn) {
      return ''
    }

    return `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(book.isbn)}-L.jpg`
  }, [book?.isbn])

  useEffect(() => {
    const selectedBook = books.find((item) => item.isbn === bookIsbn) || null
    setBook(selectedBook)
    setImageFailed(false)
  }, [books, bookIsbn])

  useEffect(() => {
    let isMounted = true

    async function loadBookDetails() {
      if (!bookIsbn) {
        return
      }

      setIsLoadingBook(true)
      setBookError('')

      try {
        const response = await apiClient.getBookByIsbn(bookIsbn)
        if (!isMounted) {
          return
        }

        setBook(response?.data || null)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setBookError(error instanceof Error ? error.message : 'Failed to load book details')
      } finally {
        if (isMounted) {
          setIsLoadingBook(false)
        }
      }
    }

    loadBookDetails()

    return () => {
      isMounted = false
    }
  }, [bookIsbn])

  useEffect(() => {
    let isMounted = true

    async function loadBookReviews() {
      if (!bookIsbn) {
        return
      }

      setLoadingReviews(true)

      try {
        const response = await apiClient.getBookReviews(bookIsbn)
        if (!isMounted) {
          return
        }

        const responseData = response.data
        const loadedReviews = Array.isArray(responseData) ? responseData : responseData?.reviews || []
        const currentUserHasReviewed = Array.isArray(responseData) ? false : Boolean(responseData?.currentUserHasReviewed)

        setReviews(loadedReviews)
        setHasReviewed(currentUserHasReviewed)
      } catch (error) {
        if (isMounted) {
          setActionMessage(error instanceof Error ? error.message : 'Failed to load reviews')
          setActionType('error')
        }
      } finally {
        if (isMounted) {
          setLoadingReviews(false)
        }
      }
    }

    loadBookReviews()

    return () => {
      isMounted = false
    }
  }, [bookIsbn])

  const handleAddToCart = async (purchaseOption = 'buy') => {
    if (activeRole !== 'student' || !bookIsbn) {
      return
    }

    const optionLabel = purchaseOption === 'buy' ? 'Buy' : 'Rent'

    setActionMessage(`Adding ${optionLabel} option to cart...`)
    setActionType('info')
    setIsActionLoading(true)

    try {
      await apiClient.addCartItem({ bookId: bookIsbn, quantity: 1, purchaseOption })
      await reloadCart()
      setActionMessage(`${optionLabel} option added successfully`)
      setActionType('success')
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to add book to cart')
      setActionType('error')
    } finally {
      setIsActionLoading(false)
      setTimeout(() => setActionMessage(''), 1800)
    }
  }

  const handleSubmitReview = async (event) => {
    event.preventDefault()

    if (activeRole !== 'student' || !bookIsbn) {
      setActionMessage('Only students can write reviews')
      setActionType('error')
      return
    }

    if (!reviewFormState.reviewText.trim()) {
      setActionMessage('Review text cannot be empty')
      setActionType('error')
      return
    }

    if (reviewFormState.rating < 1 || reviewFormState.rating > 5) {
      setActionMessage('Rating must be between 1 and 5')
      setActionType('error')
      return
    }

    setActionMessage('Submitting review...')
    setActionType('info')
    setIsActionLoading(true)

    try {
      await apiClient.createReview({
        bookId: bookIsbn,
        rating: Number(reviewFormState.rating),
        reviewText: reviewFormState.reviewText.trim(),
      })

      const response = await apiClient.getBookReviews(bookIsbn)
      const responseData = response.data
      const loadedReviews = Array.isArray(responseData) ? responseData : responseData?.reviews || []
      const currentUserHasReviewed = Array.isArray(responseData) ? false : Boolean(responseData?.currentUserHasReviewed)

      setReviews(loadedReviews)
      setHasReviewed(currentUserHasReviewed)
      setReviewFormState({ rating: 5, reviewText: '' })
      setActionMessage('Review submitted successfully')
      setActionType('success')
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to submit review')
      setActionType('error')
    } finally {
      setIsActionLoading(false)
      setTimeout(() => setActionMessage(''), 1800)
    }
  }

  const handleDeleteReview = async (reviewId) => {
    setActionMessage('Deleting review...')
    setActionType('info')
    setIsActionLoading(true)

    try {
      await apiClient.deleteReview(reviewId)

      const response = await apiClient.getBookReviews(bookIsbn)
      const responseData = response.data
      const loadedReviews = Array.isArray(responseData) ? responseData : responseData?.reviews || []
      const currentUserHasReviewed = Array.isArray(responseData) ? false : Boolean(responseData?.currentUserHasReviewed)

      setReviews(loadedReviews)
      setHasReviewed(currentUserHasReviewed)
      setActionMessage('Review deleted successfully')
      setActionType('success')
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to delete review')
      setActionType('error')
    } finally {
      setIsActionLoading(false)
      setTimeout(() => setActionMessage(''), 1800)
    }
  }

  if (isLoadingBook && !book) {
    return <section className="section-stack"><article className="card">Loading book details...</article></section>
  }

  if (!book) {
    return (
      <section className="section-stack">
        <article className="card book-details-empty">
          <h2>Book not found</h2>
          <p>{bookError || 'The requested book could not be loaded.'}</p>
          <Link className="button button-link" to="/books">Back to Books</Link>
        </article>
      </section>
    )
  }

  return (
    <section className="section-stack book-details-page">
      <div className="inline-actions">
        <Link className="button button-secondary button-link" to="/books">Back to Books</Link>
      </div>

      {actionMessage && <article className={`status-message ${actionType}`}>{actionMessage}</article>}

      <article className="card book-details-card">
        <div className="book-cover-wrap">
          {coverUrl && !imageFailed ? (
            <img
              className="book-cover"
              src={coverUrl}
              alt={`${book.title} cover`}
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="book-cover-fallback">No Image</div>
          )}
        </div>

        <div className="book-details-content">
          <div className="book-hero">
            <div className="book-hero-top">
              <div className="book-title-wrap">
                <span className="book-eyebrow">Book Details</span>
                <h2>{book.title}</h2>
                <p className="book-subtitle">
                  {book.category || 'General'} • {book.type?.toUpperCase() || 'N/A'}
                </p>
              </div>
              <span className="badge book-rating-badge">Rating {book.rating}</span>
            </div>

            <div className="book-summary-grid">
              <div className="detail-chip">
                <span className="detail-chip-label">Price</span>
                <strong>₹{book.price}</strong>
              </div>
              <div className="detail-chip">
                <span className="detail-chip-label">Quantity</span>
                <strong>{book.quantity}</strong>
              </div>
              <div className="detail-chip">
                <span className="detail-chip-label">Format</span>
                <strong>{book.format || 'N/A'}</strong>
              </div>
              <div className="detail-chip">
                <span className="detail-chip-label">Edition</span>
                <strong>{book.edition || 'N/A'}</strong>
              </div>
            </div>
          </div>

          <div className="book-info-grid">
            <div className="info-panel">
              <h3>Overview</h3>
              <p><span>Authors:</span> {(book.authors || []).join(', ') || 'N/A'}</p>
              <p><span>ISBN:</span> {book.isbn || 'N/A'}</p>
              <p><span>Publisher:</span> {book.publisher || 'N/A'}</p>
              <p><span>Publication Date:</span> {book.publicationDate || 'N/A'}</p>
              <p><span>Language:</span> {book.language || 'N/A'}</p>
            </div>

            <div className="info-panel">
              <h3>Classification</h3>
              <p><span>Category:</span> {book.category || 'N/A'}</p>
              <p><span>Subcategories:</span> {(book.subcategories || []).join(', ') || 'N/A'}</p>
              <p><span>Keywords:</span> {(book.keywords || []).join(', ') || 'N/A'}</p>
              {!isBookInCart && !isOutOfStock && (
                <p><span>Purchase options:</span> {(book.purchaseOption || []).join(' / ') || 'N/A'}</p>
              )}
            </div>
          </div>

          <div className="inline-actions book-details-actions">
            {activeRole === 'student' && !isBookInCart && !isOutOfStock ? (
              (book.purchaseOption || []).map((option) => (
                <button
                  key={option}
                  className="button"
                  onClick={() => handleAddToCart(option)}
                  disabled={isActionLoading}
                >
                  {option === 'buy' ? 'Buy' : 'Rent'}
                </button>
              ))
            ) : activeRole === 'student' && isOutOfStock ? (
              <span className="badge">Out of stock</span>
            ) : activeRole === 'student' ? (
              <span className="badge">Already in cart</span>
            ) : null}
          </div>
        </div>
      </article>

      <article className="card reviews-section">
        <div className="reviews-header">
          <div>
            <span className="reviews-eyebrow">Community Feedback</span>
            <h3>Reviews ({reviews.length})</h3>
          </div>
          <div className="reviews-stats">
            <span className="reviews-stat">
              <strong>{averageRating ? `${averageRating}` : 'N/A'}</strong>
              <small>Average</small>
            </span>
            <span className="reviews-stat">
              <strong>{reviews.length}</strong>
              <small>Total</small>
            </span>
          </div>
        </div>

        {!loadingReviews && activeRole === 'student' && !hasReviewed && (
          <form className="review-form" onSubmit={handleSubmitReview}>
            <h5>Write a Review</h5>
            <div>
              <label htmlFor="rating">Rating:</label>
              <select
                id="rating"
                value={reviewFormState.rating}
                onChange={(event) =>
                  setReviewFormState((previous) => ({
                    ...previous,
                    rating: Number(event.target.value),
                  }))
                }
              >
                <option value="1">1 ⭐</option>
                <option value="2">2 ⭐</option>
                <option value="3">3 ⭐</option>
                <option value="4">4 ⭐</option>
                <option value="5">5 ⭐</option>
              </select>
            </div>
            <textarea
              placeholder="Write your review..."
              value={reviewFormState.reviewText}
              onChange={(event) =>
                setReviewFormState((previous) => ({
                  ...previous,
                  reviewText: event.target.value,
                }))
              }
              rows="3"
            />
            <button type="submit" className="button" disabled={isActionLoading}>
              {isActionLoading ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        )}

        {activeRole === 'student' && hasReviewed && (
          <p className="review-note">You have already reviewed this book.</p>
        )}

        {loadingReviews && <p className="no-reviews">Loading reviews...</p>}

        <div className="reviews-list">
          {!loadingReviews && reviews.length > 0 ? (
            reviews.map((review) => (
              <div key={review.id} className="review-item">
                <div className="review-header">
                  <span className="review-author">
                    {review.first_name} {review.last_name}
                  </span>
                  <span className="review-rating">{review.rating} ⭐</span>
                </div>
                <p className="review-text">{review.review_text}</p>
                <div className="review-footer">
                  <small className="review-date">
                    {new Date(review.created_at).toLocaleDateString()}
                  </small>
                  {((activeRole === 'student' && review.student_id === currentStudentEmail) || activeRole === 'admin' || activeRole === 'superadmin') && (
                    <button
                      className="button-small"
                      onClick={() => handleDeleteReview(review.id)}
                      disabled={isActionLoading}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : !loadingReviews ? (
            <div className="no-reviews empty-reviews">
              <strong>No reviews yet</strong>
              <span>Be the first to share what you think about this book.</span>
            </div>
          ) : null}
        </div>
      </article>
    </section>
  )
}

export default BookDetailsPage
