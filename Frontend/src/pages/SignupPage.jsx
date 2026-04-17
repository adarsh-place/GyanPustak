import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client'
import './LoginPage.css'

function SignupPage() {
  const navigate = useNavigate()
  const [universities, setUniversities] = useState([])
  const [isLoadingUniversities, setIsLoadingUniversities] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('info')

  const [formState, setFormState] = useState({
    firstName: '',
    lastName: '',
    email: '',
    address: '',
    phoneNumber: '',
    dateOfBirth: '',
    universityId: '',
    majorFieldOfStudy: '',
    studentStatus: 'undergraduate',
    yearOfStudy: '1st Year',
    password: '',
    confirmPassword: '',
  })

  useEffect(() => {
    const fetchUniversities = async () => {
      setIsLoadingUniversities(true)
      try {
        const response = await apiClient.getSignupUniversities()
        setUniversities(response.data || [])
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Failed to load universities')
        setMessageType('error')
      } finally {
        setIsLoadingUniversities(false)
      }
    }

    fetchUniversities()
  }, [])

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const isValidPhone = (phone) => {
    const cleaned = phone.replace(/[\s-]/g, '')
    const plusFormat = /^\+91\d{10}$/
    const plainFormat = /^\d{10}$/
    return plusFormat.test(cleaned) || plainFormat.test(cleaned)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage('')

    if (!formState.firstName.trim() || !formState.lastName.trim()) {
      setMessage('First name and last name are required')
      setMessageType('error')
      return
    }

    if (!formState.email.trim() || !isValidEmail(formState.email.trim())) {
      setMessage('Please enter a valid email address')
      setMessageType('error')
      return
    }

    if (!formState.phoneNumber.trim() || !isValidPhone(formState.phoneNumber.trim())) {
      setMessage('Please enter a valid phone number')
      setMessageType('error')
      return
    }

    if (!formState.universityId) {
      setMessage('Please select a university')
      setMessageType('error')
      return
    }

    if (!formState.majorFieldOfStudy.trim()) {
      setMessage('Major field of study is required')
      setMessageType('error')
      return
    }

    if (!formState.password || formState.password.length < 6) {
      setMessage('Password must be at least 6 characters')
      setMessageType('error')
      return
    }

    if (formState.password !== formState.confirmPassword) {
      setMessage('Password and confirm password do not match')
      setMessageType('error')
      return
    }

    setIsSubmitting(true)
    setMessage('Creating your account...')
    setMessageType('info')

    try {
      await apiClient.signupStudent({
        firstName: formState.firstName.trim(),
        lastName: formState.lastName.trim(),
        email: formState.email.trim(),
        address: formState.address.trim(),
        phoneNumber: formState.phoneNumber.trim(),
        dateOfBirth: formState.dateOfBirth || null,
        universityId: formState.universityId,
        majorFieldOfStudy: formState.majorFieldOfStudy.trim(),
        studentStatus: formState.studentStatus,
        yearOfStudy: formState.yearOfStudy,
        password: formState.password,
        confirmPassword: formState.confirmPassword,
      })

      setMessage('Signup successful. Redirecting to login...')
      setMessageType('success')
      setTimeout(() => navigate('/login'), 1200)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Signup failed')
      setMessageType('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="login-page">
      <article className="card login-card">
        <div className="login-header">
          <span className="login-kicker">Student Signup</span>
          <h2>Create your account</h2>
          <p>Register as a student to start browsing, ordering and reviewing books.</p>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <input
            className="input"
            placeholder="First name"
            value={formState.firstName}
            onChange={(event) => setFormState((prev) => ({ ...prev, firstName: event.target.value }))}
            disabled={isSubmitting}
          />
          <input
            className="input"
            placeholder="Last name"
            value={formState.lastName}
            onChange={(event) => setFormState((prev) => ({ ...prev, lastName: event.target.value }))}
            disabled={isSubmitting}
          />
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={formState.email}
            onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
            disabled={isSubmitting}
          />
          <input
            className="input"
            placeholder="Address"
            value={formState.address}
            onChange={(event) => setFormState((prev) => ({ ...prev, address: event.target.value }))}
            disabled={isSubmitting}
          />
          <input
            className="input"
            placeholder="Phone number (10 digits or +91XXXXXXXXXX)"
            value={formState.phoneNumber}
            onChange={(event) => setFormState((prev) => ({ ...prev, phoneNumber: event.target.value }))}
            disabled={isSubmitting}
          />
          <input
            className="input"
            type="date"
            value={formState.dateOfBirth}
            onChange={(event) => setFormState((prev) => ({ ...prev, dateOfBirth: event.target.value }))}
            disabled={isSubmitting}
          />
          <select
            className="input"
            value={formState.universityId}
            onChange={(event) => setFormState((prev) => ({ ...prev, universityId: event.target.value }))}
            disabled={isSubmitting || isLoadingUniversities}
          >
            <option value="">Select university</option>
            {universities.map((university) => (
              <option key={university.id} value={university.id}>
                {university.name}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Major field of study"
            value={formState.majorFieldOfStudy}
            onChange={(event) => setFormState((prev) => ({ ...prev, majorFieldOfStudy: event.target.value }))}
            disabled={isSubmitting}
          />
          <select
            className="input"
            value={formState.studentStatus}
            onChange={(event) => setFormState((prev) => ({ ...prev, studentStatus: event.target.value }))}
            disabled={isSubmitting}
          >
            <option value="undergraduate">Undergraduate</option>
            <option value="graduate">Graduate</option>
          </select>
          <select
            className="input"
            value={formState.yearOfStudy}
            onChange={(event) => setFormState((prev) => ({ ...prev, yearOfStudy: event.target.value }))}
            disabled={isSubmitting}
          >
            <option value="1st Year">1st Year</option>
            <option value="2nd Year">2nd Year</option>
            <option value="3rd Year">3rd Year</option>
            <option value="4th Year">4th Year</option>
            <option value="5th Year">5th Year</option>
          </select>
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={formState.password}
            onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
            disabled={isSubmitting}
          />
          <input
            className="input"
            type="password"
            placeholder="Confirm password"
            value={formState.confirmPassword}
            onChange={(event) => setFormState((prev) => ({ ...prev, confirmPassword: event.target.value }))}
            disabled={isSubmitting}
          />

          {message && <article className={`status-message ${messageType}`}>{message}</article>}

          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p style={{ marginTop: '12px', textAlign: 'center' }}>
          Already have an account? <Link style={{color:'blue'}} to="/login">Login</Link>
        </p>
      </article>
    </section>
  )
}

export default SignupPage
