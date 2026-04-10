import { useState } from 'react'
import { apiClient } from '../api/client'
import { useGyanPustak } from '../context/GyanPustakContext'
import './EmployeesPage.css'

function EmployeesPage() {
  const { activeRole, employees, reloadEmployees } = useGyanPustak()

  const [formState, setFormState] = useState({
    firstName: '',
    lastName: '',
    role: 'support',
    email: '',
    phone: '',
    aadhaar: '',
  })
  const [actionMessage, setActionMessage] = useState('')
  const [actionType, setActionType] = useState('info')
  const [isActionLoading, setIsActionLoading] = useState(false)

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const isValidPhone = (phone) => {
    const phoneRegex = /^(\+91)?[6-9]\d{9}$/
    return phoneRegex.test(phone.replace(/[\s-]/g, ''))
  }

  const isValidAadhaar = (aadhaar) => {
    const aadhaarRegex = /^\d{12}$/
    return aadhaarRegex.test(aadhaar.replace(/[\s-]/g, ''))
  }

  const submitEmployee = async (event) => {
    event.preventDefault()

    if (activeRole !== 'superadmin') {
      setActionMessage('Only superadmin can add employees')
      setActionType('error')
      return
    }

    if (!formState.firstName.trim()) {
      setActionMessage('First name is required')
      setActionType('error')
      return
    }

    if (!formState.lastName.trim()) {
      setActionMessage('Last name is required')
      setActionType('error')
      return
    }

    if (!formState.email.trim()) {
      setActionMessage('Email is required')
      setActionType('error')
      return
    }

    if (!isValidEmail(formState.email.trim())) {
      setActionMessage('Invalid email format (e.g., user@example.com)')
      setActionType('error')
      return
    }

    if (!formState.phone.trim()) {
      setActionMessage('Phone number is required')
      setActionType('error')
      return
    }

    if (!isValidPhone(formState.phone.trim())) {
      setActionMessage('Invalid phone format (10 digits or +91XXXXXXXXXX)')
      setActionType('error')
      return
    }

    if (!formState.aadhaar.trim()) {
      setActionMessage('Aadhaar number is required')
      setActionType('error')
      return
    }

    if (!isValidAadhaar(formState.aadhaar.trim())) {
      setActionMessage('Invalid Aadhaar format (12 digits)')
      setActionType('error')
      return
    }

    const nextEmployee = {
      id: `E${5000 + employees.length + 1}`,
      firstName: formState.firstName.trim(),
      lastName: formState.lastName.trim(),
      role: formState.role,
      gender: 'Not specified',
      salary: 0,
      aadhaar: formState.aadhaar.trim(),
      email: formState.email.trim(),
      phone: formState.phone.trim(),
    }

    setActionMessage('Adding employee...')
    setActionType('info')
    setIsActionLoading(true)

    try {
      await apiClient.createEmployee({
        id: nextEmployee.id,
        firstName: nextEmployee.firstName,
        lastName: nextEmployee.lastName,
        gender: nextEmployee.gender,
        salary: nextEmployee.salary,
        aadhaarNumber: nextEmployee.aadhaar,
        email: nextEmployee.email,
        address: '',
        telephoneNumber: nextEmployee.phone,
        role: nextEmployee.role,
      })
      await reloadEmployees()
      setFormState({ firstName: '', lastName: '', role: 'support', email: '', phone: '', aadhaar: '' })
      setActionMessage('Employee added successfully')
      setActionType('success')
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to add employee')
      setActionType('error')
    } finally {
      setIsActionLoading(false)
      setTimeout(() => setActionMessage(''), 1800)
    }
  }

  return (
    <section className="section-stack employees-page">
      <h2>Employee Management</h2>

      {activeRole === "superadmin" ? (
        <form className="card form" onSubmit={submitEmployee}>
          <h3>Add Customer Support/Admin Employee</h3>
          <input
            className="input"
            placeholder="First name"
            value={formState.firstName}
            onChange={(event) =>
              setFormState((previous) => ({
                ...previous,
                firstName: event.target.value,
              }))
            }
          />
          <input
            className="input"
            placeholder="Last name"
            value={formState.lastName}
            onChange={(event) =>
              setFormState((previous) => ({
                ...previous,
                lastName: event.target.value,
              }))
            }
          />
          <input
            className="input"
            placeholder="Email"
            value={formState.email}
            onChange={(event) =>
              setFormState((previous) => ({
                ...previous,
                email: event.target.value,
              }))
            }
          />
          <input
            className="input"
            placeholder="Phone number (10 digits or +91XXXXXXXXXX)"
            value={formState.phone}
            onChange={(event) =>
              setFormState((previous) => ({
                ...previous,
                phone: event.target.value,
              }))
            }
          />
          <input
            className="input"
            placeholder="Aadhaar number (12 digits)"
            value={formState.aadhaar}
            onChange={(event) =>
              setFormState((previous) => ({
                ...previous,
                aadhaar: event.target.value,
              }))
            }
          />
          <select
            className="input"
            value={formState.role}
            onChange={(event) =>
              setFormState((previous) => ({
                ...previous,
                role: event.target.value,
              }))
            }
          >
            <option value="support">Customer Support</option>
            <option value="admin">Administrator</option>
          </select>
          {actionMessage && <article className={`status-message ${actionType}`}>{actionMessage}</article>}

          <button className="button" type="submit" disabled={isActionLoading}>
            {isActionLoading ? "Working..." : "Add Employee"}
          </button>
        </form>
      ) : (
        <article className="card">
          <p>
            Only the super administrator can add new support and admin
            employees.
          </p>
        </article>
      )}

      <div className="stack">
        {employees.map((employee) => (
          <article key={employee.id} className="card">
            <h3>
              {employee.id} - {employee.firstName} {employee.lastName}
            </h3>
            <p>Role: {employee.role} </p>
            <p>Email: {employee.email}</p>
            <p>Phone: {employee.phone}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default EmployeesPage
