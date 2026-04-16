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
    gender: '',
    salary: '',
    email: '',
    address: '',
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

    if (formState.salary && Number.isNaN(Number(formState.salary))) {
      setActionMessage('Salary must be a valid number')
      setActionType('error')
      return
    }

    const nextEmployee = {
      id: `E${5000 + employees.length + 1}`,
      firstName: formState.firstName.trim(),
      lastName: formState.lastName.trim(),
      role: formState.role,
      gender: formState.gender.trim() || 'Not specified',
      salary: Number(formState.salary || 0),
      aadhaar: formState.aadhaar.trim(),
      email: formState.email.trim(),
      address: formState.address.trim(),
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
        address: nextEmployee.address,
        telephoneNumber: nextEmployee.phone,
        role: nextEmployee.role,
      })
      await reloadEmployees()
      setFormState({
        firstName: '',
        lastName: '',
        role: 'support',
        gender: '',
        salary: '',
        email: '',
        address: '',
        phone: '',
        aadhaar: '',
      })
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
          <div className="employees-header">
            <div>
              <h2>Employee Management</h2>
            </div>
          </div>

          <form className="card form employee-form-card" onSubmit={submitEmployee}>
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
              placeholder="Gender"
              value={formState.gender}
              onChange={(event) =>
                setFormState((previous) => ({
                  ...previous,
                  gender: event.target.value,
                }))
              }
            />
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              placeholder="Salary"
              value={formState.salary}
              onChange={(event) =>
                setFormState((previous) => ({
                  ...previous,
                  salary: event.target.value,
                }))
              }
            />
            <input
              className="input"
              placeholder="Address"
              value={formState.address}
              onChange={(event) =>
                setFormState((previous) => ({
                  ...previous,
                  address: event.target.value,
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
        <div className="employees-header">
          <h2>Employees</h2>
        </div>
      )}

      <article className="card form employee-filter-card">
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

      <p className="employees-count">All Employees ({filteredEmployees.length})</p>
      <div className="employees-grid">
        {filteredEmployees.map((employee) => (
          <article key={employee.id} className="card employee-card">
            <div className="employee-card-header">
              <div>
                <p className="employee-id">{employee.id}</p>
                <h3 className="employee-name">
                  {employee.firstName} {employee.lastName}
                </h3>
              </div>
              <span className="employee-badge">{employee.role}</span>
            </div>
            <div className="employee-meta-grid">
              <div className="employee-meta-item">
                <span className="employee-meta-label">Email</span>
                <span className="employee-meta-value">{employee.email}</span>
              </div>
              <div className="employee-meta-item">
                <span className="employee-meta-label">Phone</span>
                <span className="employee-meta-value">{employee.phone || 'N/A'}</span>
              </div>
              <div className="employee-meta-item">
                <span className="employee-meta-label">Gender</span>
                <span className="employee-meta-value">{employee.gender || 'Not specified'}</span>
              </div>
              <div className="employee-meta-item">
                <span className="employee-meta-label">Salary</span>
                <span className="employee-meta-value">{employee.salary}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default EmployeesPage
