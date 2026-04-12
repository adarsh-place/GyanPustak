import { useMemo, useState } from 'react'
import { apiClient } from '../api/client'
import { useGyanPustak } from '../context/GyanPustakContext'
import './BooksPage.css'

function BooksPage() {
  const { books, activeRole, cartBooks, students, reloadCart, reloadBooks } = useGyanPustak()
  const [searchTerm, setSearchTerm] = useState('')
  const [reviewsByBook, setReviewsByBook] = useState({})
  const [hasReviewedByBook, setHasReviewedByBook] = useState({})
  const [loadingReviewsByBook, setLoadingReviewsByBook] = useState({})
  const [expandedBookId, setExpandedBookId] = useState(null)
  const [reviewFormState, setReviewFormState] = useState({
    rating: 5,
    reviewText: '',
  })
  const [formState, setFormState] = useState({
    title: '',
    type: 'new',
    price: '',
    quantity: '',
    authors: '',
    isbn: '',
    publisher: '',
    publicationDate: '',
    edition: '',
    language: '',
    format: 'softcover',
    category: '',
    subcategories: '',
    keywords: '',
    rating: '',
    purchaseOption: 'buy',
  })
  const [actionMessage, setActionMessage] = useState('')
  const [actionType, setActionType] = useState('info')
  const [isActionLoading, setIsActionLoading] = useState(false)

  const handleAddToCart = async (bookId, purchaseOption = 'buy', optionLabel = 'book') => {
    if (activeRole !== 'student') {
      return
    }

    setActionMessage(`Adding ${optionLabel} option to cart...`)
    setActionType('info')
    setIsActionLoading(true)

    try {
      await apiClient.addCartItem({ bookId, quantity: 1, purchaseOption })
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

  const loadBookReviews = async (bookId) => {
    setLoadingReviewsByBook((prev) => ({
      ...prev,
      [bookId]: true,
    }))

    try {
      const response = await apiClient.getBookReviews(bookId)
      const responseData = response.data
      const reviews = Array.isArray(responseData) ? responseData : responseData?.reviews || []
      const currentUserHasReviewed =
        Array.isArray(responseData)
          ? false
          : Boolean(responseData?.currentUserHasReviewed)

      setReviewsByBook((prev) => ({
        ...prev,
        [bookId]: reviews,
      }))
      setHasReviewedByBook((prev) => ({
        ...prev,
        [bookId]: currentUserHasReviewed,
      }))
    } catch (error) {
      console.error('Failed to load reviews:', error)
    } finally {
      setLoadingReviewsByBook((prev) => ({
        ...prev,
        [bookId]: false,
      }))
    }
  }

  const handleSubmitReview = async (event, bookId) => {
    event.preventDefault()

    if (activeRole !== 'student') {
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
        bookId,
        rating: Number(reviewFormState.rating),
        reviewText: reviewFormState.reviewText.trim(),
      })
      await loadBookReviews(bookId)
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

  const handleDeleteReview = async (reviewId, bookId) => {
    setActionMessage('Deleting review...')
    setActionType('info')
    setIsActionLoading(true)

    try {
      await apiClient.deleteReview(reviewId)
      await loadBookReviews(bookId)
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

  const handleAddBook = async (event) => {
    event.preventDefault()
    if (activeRole !== 'admin' && activeRole !== 'superadmin') {
      return
    }

    if (!formState.title.trim() || !formState.isbn.trim() || !formState.publisher.trim() || !formState.category.trim()) {
      setActionMessage('Title, ISBN, publisher, and category are required')
      setActionType('error')
      return
    }

    setActionMessage('Adding book...')
    setActionType('info')
    setIsActionLoading(true)

    try {
      await apiClient.createBook({
        id: `B${Date.now()}`,
        title: formState.title.trim(),
        type: formState.type,
        purchaseOption: formState.purchaseOption === 'both' ? ['buy', 'rent'] : [formState.purchaseOption],
        price: Number(formState.price || 0),
        quantity: Number(formState.quantity || 0),
        authors: formState.authors
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
        isbn: formState.isbn.trim(),
        publisher: formState.publisher.trim(),
        publicationDate: formState.publicationDate || new Date().toISOString().slice(0, 10),
        edition: Number(formState.edition || 1),
        language: formState.language.trim(),
        format: formState.format.trim().toLowerCase() === 'paperback' ? 'softcover' : formState.format.trim().toLowerCase(),
        category: formState.category.trim(),
        subcategories: formState.subcategories
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
        keywords: formState.keywords
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
        rating: Number(formState.rating || 0),
      })

      await reloadBooks?.()
      setFormState({
        title: '',
        type: 'new',
        price: '',
        quantity: '',
        authors: '',
        isbn: '',
        publisher: '',
        publicationDate: '',
        edition: '',
        language: '',
        format: 'softcover',
        category: '',
        subcategories: '',
        keywords: '',
        rating: '',
        purchaseOption: 'buy',
      })
      setActionMessage('Book added successfully')
      setActionType('success')
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to add book')
      setActionType('error')
    } finally {
      setIsActionLoading(false)
      setTimeout(() => setActionMessage(''), 1800)
    }
  }

  const filteredBooks = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) {
      return books
    }

    return books.filter((book) => {
      const searchableFields = [
        book.title,
        book.isbn,
        book.category,
        ...book.authors,
        ...book.keywords,
      ]
      return searchableFields.join(' ').toLowerCase().includes(query)
    })
  }, [books, searchTerm])

  const cartBookIds = useMemo(
    () => new Set(cartBooks.map((book) => book.id)),
    [cartBooks],
  )
  
  const currentStudentId = students[0] ? students[0].id : null;  

  return (
    <section className="section-stack books-page">
      <h2>Books</h2>

      {(activeRole === 'admin' || activeRole === 'superadmin') && (
        <form className="card form" onSubmit={handleAddBook}>
          <h3>Add Book</h3>
          <input className="input" placeholder="Title" value={formState.title} onChange={(event) => setFormState((previous) => ({ ...previous, title: event.target.value }))} />
          <div className="books-form-row">
            <input className="input" placeholder="ISBN" value={formState.isbn} onChange={(event) => setFormState((previous) => ({ ...previous, isbn: event.target.value }))} />
            <input className="input" placeholder="Publisher" value={formState.publisher} onChange={(event) => setFormState((previous) => ({ ...previous, publisher: event.target.value }))} />
          </div>
          <div className="books-form-row">
            <input className="input" placeholder="Category" value={formState.category} onChange={(event) => setFormState((previous) => ({ ...previous, category: event.target.value }))} />
            <input className="input" placeholder="Subcategories (comma separated)" value={formState.subcategories} onChange={(event) => setFormState((previous) => ({ ...previous, subcategories: event.target.value }))} />
          </div>
          <div className="books-form-row">
            <input className="input" placeholder="Authors (comma separated)" value={formState.authors} onChange={(event) => setFormState((previous) => ({ ...previous, authors: event.target.value }))} />
            <input className="input" placeholder="Keywords (comma separated)" value={formState.keywords} onChange={(event) => setFormState((previous) => ({ ...previous, keywords: event.target.value }))} />
          </div>
          <div className="books-form-row">
            <input className="input" type="number" min="0" step="0.01" placeholder="Price" value={formState.price} onChange={(event) => setFormState((previous) => ({ ...previous, price: event.target.value }))} />
            <input className="input" type="number" min="0" placeholder="Quantity" value={formState.quantity} onChange={(event) => setFormState((previous) => ({ ...previous, quantity: event.target.value }))} />
            <input className="input" type="date" placeholder="Publication date" value={formState.publicationDate} onChange={(event) => setFormState((previous) => ({ ...previous, publicationDate: event.target.value }))} />
          </div>
          <div className="books-form-row">
            <select className="input" value={formState.type} onChange={(event) => setFormState((previous) => ({ ...previous, type: event.target.value }))}>
              <option value="new">New</option>
              <option value="used">Used</option>
            </select>
            <select className="input" value={formState.format} onChange={(event) => setFormState((previous) => ({ ...previous, format: event.target.value }))}>
              <option value="hardcover">Hardcover</option>
              <option value="softcover">Softcover (Paperback)</option>
              <option value="electronic">Electronic</option>
            </select>
            <input className="input" placeholder="Language (Ex. English)" value={formState.language} onChange={(event) => setFormState((previous) => ({ ...previous, language: event.target.value }))} />
          </div>
          <div className="books-form-row">
            <input className="input" type="number" min="1" placeholder="Edition" value={formState.edition} onChange={(event) => setFormState((previous) => ({ ...previous, edition: event.target.value }))} />
            <input className="input" type="number" min="0" max="5" step="0.1" placeholder="Rating" value={formState.rating} onChange={(event) => setFormState((previous) => ({ ...previous, rating: event.target.value }))} />
            <select className="input" value={formState.purchaseOption} onChange={(event) => setFormState((previous) => ({ ...previous, purchaseOption: event.target.value }))}>
              <option value="buy">Buy</option>
              <option value="rent">Rent</option>
              <option value="both">Buy and Rent</option>
            </select>
          </div>

          <button className="button" type="submit" disabled={isActionLoading}>
            {isActionLoading ? 'Working...' : 'Add Book'}
          </button>
        </form>
      )}

      {actionMessage && (
        <article className={`status-message ${actionType}`}>{actionMessage}</article>
      )}

      <input
        className="input"
        placeholder="Search by title, author, ISBN, category or keyword"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
      />
      
      <p>Books ({filteredBooks.length})</p>
      <div className="stack">
        {filteredBooks.map((book) => (
          <article key={book.id} className="card">
            <div className="card-header">
              <h3>{book.title}</h3>
              <span className="badge">Rating {book.rating}</span>
            </div>
            <p>
              {book.type.toUpperCase()} • {book.format} • ₹{book.price} • Qty {book.quantity}
            </p>
            <p>
              Authors: {book.authors.join(', ')} | ISBN: {book.isbn}
            </p>
            <p>
              Category: {book.category} • Subcategories: {book.subcategories.join(', ')}
            </p>
            <p>Purchase options: {book.purchaseOption.join(' / ')}</p>

            <div className="inline-actions">
              {activeRole === 'student' && !cartBookIds.has(book.id) ? (
                (book.purchaseOption || []).map((option) => (
                  <button
                    key={option}
                    className="button"
                    onClick={() => handleAddToCart(book.id, option, option === 'buy' ? 'Buy' : 'Rent')}
                    disabled={isActionLoading}
                  >
                    {option === 'buy' ? 'Buy' : 'Rent'}
                  </button>
                ))
              ) : activeRole === 'student' ? (
                <span className="badge">Already in cart</span>
              ) : null}
              <button
                className="button"
                onClick={() => {
                  if (expandedBookId === book.id) {
                    setExpandedBookId(null)
                  } else {
                    setExpandedBookId(book.id)
                    if (!reviewsByBook[book.id]) {
                      loadBookReviews(book.id)
                    }
                  }
                }}
              >
                {expandedBookId === book.id ? 'Hide' : 'Show'} Reviews
              </button>
            </div>

            {expandedBookId === book.id && (
              <div className="reviews-section">
                <h4>Reviews ({(reviewsByBook[book.id] || []).length})</h4>
                {!loadingReviewsByBook[book.id] && (
                  <p className="average-review">
                    Average Review:{' '}
                    {(reviewsByBook[book.id] || []).length > 0
                      ? (
                        (reviewsByBook[book.id] || []).reduce((sum, review) => sum + Number(review.rating || 0), 0) /
                        (reviewsByBook[book.id] || []).length
                      ).toFixed(1)
                      : 'N/A'}
                    {(reviewsByBook[book.id] || []).length > 0 ? ' / 5' : ''}
                  </p>
                )}

                {!loadingReviewsByBook[book.id] && activeRole === 'student' && !hasReviewedByBook[book.id] && (
                  <form className="review-form" onSubmit={(e) => handleSubmitReview(e, book.id)}>
                    <h5>Write a Review</h5>
                    <div>
                      <label>Rating: </label>
                      <select
                        value={reviewFormState.rating}
                        onChange={(e) =>
                          setReviewFormState((prev) => ({
                            ...prev,
                            rating: Number(e.target.value),
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
                      onChange={(e) =>
                        setReviewFormState((prev) => ({
                          ...prev,
                          reviewText: e.target.value,
                        }))
                      }
                      rows="3"
                    />
                    <button type="submit" className="button" disabled={isActionLoading}>
                      {isActionLoading ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </form>
                )}

                {activeRole === 'student' && hasReviewedByBook[book.id] && (
                  <p className="no-reviews">You have already reviewed this book.</p>
                )}

                {loadingReviewsByBook[book.id] && (
                  <p className="no-reviews">Loading reviews...</p>
                )}

                <div className="reviews-list">
                  {!loadingReviewsByBook[book.id] && reviewsByBook[book.id] && reviewsByBook[book.id].length > 0 ? (
                    reviewsByBook[book.id].map((review) => (
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
                          {activeRole === 'student' && review.student_id === currentStudentId && (
                            <button
                              className="button-small"
                              onClick={() => handleDeleteReview(review.id, book.id)}
                              disabled={isActionLoading}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : !loadingReviewsByBook[book.id] ? (
                    <p className="no-reviews">No reviews yet. Be the first to review!</p>
                  ) : null}
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
      
    </section>
  )
}

export default BooksPage
