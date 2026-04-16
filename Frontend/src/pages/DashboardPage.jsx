import { useMemo } from 'react'
import { useGyanPustak } from '../context/GyanPustakContext'
import './DashboardPage.css'

function DashboardPage() {
  const { activeRole, student, employees, tickets, orders } = useGyanPustak()

  const currentEmployee = useMemo(() => {
    const matchingEmployee = employees.find((employee) => employee.role === activeRole)
    return matchingEmployee || null
  }, [activeRole, employees])

  const ticketCount = useMemo(() => {
    if(activeRole === 'support') {
      return tickets.filter((ticket) => ticket.createdBy === 'support').length
    }
    return tickets.length
  }, [tickets, activeRole])

  const orderCount = useMemo(() => {
    return orders.length
  }, [orders])

  return (
    <section className="section-stack dashboard-page">
      <h2>Dashboard</h2>

      <article className="card">
        <h3>Current Role</h3>
        <p>{activeRole.toUpperCase()}</p>
      </article>

      {activeRole === 'student' ? (
        <>
          <div className="grid-3">
            <article className="card">
              <h3>My Tickets</h3>
              <p>{ticketCount}</p>
            </article>
            <article className="card">
              <h3>My Orders</h3>
              <p>{orderCount}</p>
            </article>
          </div>

          <article className="card">
            <h3>Student Profile</h3>
            <p>
              {student.firstName.toUpperCase()} {student.lastName.toUpperCase()}
            </p>
            <p>• {student.university}</p>
            <p>
              • {student.yearOfStudy} {student.major} ({student.status})
            </p>
          </article>
        </>
      ) : (
      <>
        {activeRole === 'support' &&
          <article className="card">
            <h3>My Tickets</h3>
            <p>{ticketCount}</p>
          </article>
        }
        <article className="card">
          <h3>My Employee Profile</h3>
          {currentEmployee ? (
            <>
              <p>
                {currentEmployee.id} - {currentEmployee.firstName.toUpperCase()} {currentEmployee.lastName.toUpperCase()}
              </p>
              <p>• Role: {currentEmployee.role}</p>
              <p>• Email: {currentEmployee.email}</p>
              <p>• Phone: {currentEmployee.phone}</p>
            </>
          ) : (
            <p>No employee record found for this role.</p>
          )}
        </article>
      </>
      )}
    </section>
  )
}

export default DashboardPage
