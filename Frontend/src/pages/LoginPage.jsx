import { useState } from 'react'
import { roles } from '../data/mockData'
import { useGyanPustak } from '../context/GyanPustakContext'
import './LoginPage.css'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState('student')
  const [errorMessage, setErrorMessage] = useState('')
  const { loginAsRole, isLoading } = useGyanPustak()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    if (!email.trim()) {
      setErrorMessage('Email is required')
      return
    }

    if (!password.trim()) {
      setErrorMessage('Password is required')
      return
    }

    try {
      await loginAsRole({ email: email.trim(), password, role: selectedRole })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Login failed')
    }
  }

  return (
    <section className="login-page">
      <article className="card login-card">
        <div className="login-header">
          <span className="login-kicker">GyanPustak Access</span>
          <h2>Welcome back</h2>
          <p>Sign in with your email, password, and role to continue.</p>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            {/* <span className="field-label">Email</span> */}
            <input
              className="input"
              type="email"
              placeholder="student@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isLoading}
            />
          </label>

          <label className="field">
            {/* <span className="field-label">Password</span> */}
            <input
              className="input"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isLoading}
            />
          </label>

          <label className="field">
            {/* <span className="field-label">Role</span> */}
            <select
              className="input"
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value)}
              disabled={isLoading}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>

          {errorMessage && <article className="status-message error">{errorMessage}</article>}

          <button className="button" type="submit" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </article>
    </section>
  )
}

export default LoginPage
