import { useMemo, useState } from 'react'
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
  const [roleFilter, setRoleFilter] = useState('all')

  const filteredEmployees = useMemo(() => {
    if (roleFilter === 'all') {
      return employees
    }

    return employees.filter((employee) => employee.role === roleFilter)
  }, [employees, roleFilter])

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const isValidPhone = (phone) => {
    const cleaned = phone.replace(/[\s-]/g, '')
    const plusFormat = /^\+91\d{10}$/
    const plainFormat = /^\d{10}$/
    return plusFormat.test(cleaned) || plainFormat.test(cleaned)
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
      setActionMessage('Invalid phone format (10 digits or +91 followed by 10 digits)')
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

      {activeRole === "superadmin" ? (
        <>
          <h2>Employee Management</h2>
          <form className="card form" onSubmit={submitEmployee}>
            <h3>Add Employee</h3>
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
              placeholder="Phone number (10 digits or +91 followed by 10 digits)"
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
        </>
      ) : (
          <h2>Employees</h2>
      )}

      <article className="card form">
        <h3>Filter Employees</h3>
        <select
          className="input"
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
        >
          <option value="all">All</option>
          <option value="admin">Administrator</option>
          <option value="support">Customer Support</option>
        </select>
      </article>

      <div className="stack">
        <p>All Employees ({filteredEmployees.length})</p>
        {filteredEmployees.map((employee) => (
          <article key={employee.id} className="card">
            <div className="card-header">
              <h3>
                {employee.id} - {employee.firstName} {employee.lastName}
              </h3>
              <span className="badge">{employee.role}</span>
            </div>
            <p>Email: {employee.email}</p>
            <p>Phone: {employee.phone}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default EmployeesPage
