import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { roles } from './data/mockData'
import { GyanPustakProvider, useGyanPustak } from './context/GyanPustakContext'
import BooksPage from './pages/BooksPage'
import CartPage from './pages/CartPage'
import DashboardPage from './pages/DashboardPage'
import EmployeesPage from './pages/EmployeesPage'
import OrdersPage from './pages/OrdersPage'
import TicketsPage from './pages/TicketsPage'
import UniversitiesPage from './pages/UniversitiesPage'

const visibleNavLinks = [
  { to: '/', label: 'Dashboard' },
  { to: '/books', label: 'Books' },
  { to: '/universities', label: 'Universities' },
  { to: '/tickets', label: 'Tickets' },
  { to: '/cart', label: 'Cart' },
  { to: '/orders', label: 'Orders' },
  { to: '/employees', label: 'Employees' },
]

function App() {
  return (
    <GyanPustakProvider>
      <AppContent />
    </GyanPustakProvider>
  )
}

function AppContent() {
  const {
    activeRole,
    setActiveRole,
    isLoading,
    error,
  } = useGyanPustak()

  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="topbar">
          <div>
            <h1>GyanPustak</h1>
            <p>Buy, rent and manage college textbooks</p>
          </div>

          <label className="role-selector">
            Active user role
            <select value={activeRole} onChange={(event) => setActiveRole(event.target.value)}>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
        </header>

        <nav className="nav-links">
          {visibleNavLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <main className="page-content">
          {error && <article className="card">Backend error: {error}</article>}
          {isLoading ? (
            <article className="card">Loading GyanPustak data from the backend...</article>
          ) : (
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/books" element={<BooksPage />} />
              <Route path="/universities" element={<UniversitiesPage />} />
              <Route path="/tickets" element={<TicketsPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/employees" element={<EmployeesPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
