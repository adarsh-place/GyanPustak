import { useGyanPustak } from '../context/GyanPustakContext'
import './DashboardPage.css'

function DashboardPage() {
  const { activeRole, student, tickets, cartBooks, orders } = useGyanPustak()

  return (
    <section className="section-stack dashboard-page">
      <h2>Dashboard</h2>
      <div className="grid-3">
        <article className="card">
          <h3>Current Role</h3>
          <p>{activeRole.toUpperCase()}</p>
        </article>
        <article className="card">
          <h3>Total Tickets</h3>
          <p>{tickets.length}</p>
        </article>
        <article className="card">
          <h3>Total Orders</h3>
          <p>{orders.length}</p>
        </article>
      </div>

      <article className="card">
        <h3>Primary Student Profile</h3>
        <p>
          {student.firstName} {student.lastName} • {student.university} • {student.major}
        </p>
        <p>
          {student.status} • {student.yearOfStudy} • Cart items: {cartBooks.length}
        </p>
      </article>
    </section>
  )
}

export default DashboardPage
