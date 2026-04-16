import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { roles } from './data/mockData'
import { GyanPustakProvider, useGyanPustak } from './context/GyanPustakContext'
import LoadingBlock from './components/LoadingBlock'
import BookDetailsPage from './pages/BookDetailsPage'
import BooksPage from './pages/BooksPage'
import CartPage from './pages/CartPage'
import CoursesPage from './pages/CoursesPage'
import DashboardPage from './pages/DashboardPage'
import EmployeesPage from './pages/EmployeesPage'
import InstructorsPage from './pages/InstructorsPage'
import LoginPage from './pages/LoginPage'
import OrdersPage from './pages/OrdersPage'
import SignupPage from './pages/SignupPage'
import StudentsPage from './pages/StudentsPage'
import TicketsPage from './pages/TicketsPage'
import UniversitiesPage from './pages/UniversitiesPage'

const visibleNavLinks = [
  { to: '/', label: 'Dashboard' },
  { to: '/books', label: 'Books' },
  { to: '/universities', label: 'Universities' },
  { to: '/courses', label: 'Courses' },
  { to: '/instructors', label: 'Instructors' },
  { to: '/tickets', label: 'Tickets' },
  { to: '/cart', label: 'Cart', studentOnly: true },
  { to: '/orders', label: 'Orders', studentOnly: true },
  { to: '/students', label: 'Students', staffOnly: true },
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
    isAuthenticated,
    activeRole,
    logout,
    isLoading,
    isCheckingAuth,
    error,
  } = useGyanPustak()

  const roleLabel = roles.find((role) => role.id === activeRole)?.label || activeRole
  const allowedNavLinks = visibleNavLinks.filter((link) => {
    if (link.studentOnly && activeRole !== 'student') return false
    if (link.adminOnly && activeRole !== 'admin' && activeRole !== 'superadmin') return false
    if (link.staffOnly && !['support', 'admin', 'superadmin'].includes(activeRole)) return false
    return true
  })

  if (isCheckingAuth) {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div>
            <h1>GyanPustak</h1>
            <p>Buy, rent and manage college textbooks</p>
          </div>
        </header>
        <main className="page-content">
          <article className="card">Checking authentication...</article>
        </main>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="topbar">
          <div>
            <h1>GyanPustak</h1>
            <p>Buy, rent and manage college textbooks</p>
          </div>

          {isAuthenticated && (
            <div className="role-pill-wrap">
              {/* <p className="role-pill-label">Role</p>  */}
              <p className="role-pill-value">{roleLabel}</p>
              <button className="button button-secondary" onClick={logout} type="button">
                Logout
              </button>
            </div>
          )}
        </header>

        {isAuthenticated && (
          <nav className="nav-links">
            {allowedNavLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        )}

        <main className="page-content">
          {error && <article className="card">Backend error: {error}</article>}
          <Routes>
            {!isAuthenticated ? (
              <>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </>
            ) : isLoading ? (
              <Route
                path="*"
                element={<LoadingBlock message="Loading Data..." />}
              />
            ) : (
              <>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/books" element={<BooksPage />} />
                <Route path="/books/:id" element={<BookDetailsPage />} />
                <Route path="/universities" element={<UniversitiesPage />} />
                <Route path="/courses" element={<CoursesPage />} />
                <Route path="/instructors" element={<InstructorsPage />} />
                <Route path="/tickets" element={<TicketsPage />} />
                <Route
                  path="/cart"
                  element={activeRole === 'student' ? <CartPage /> : <Navigate to="/" replace />}
                />
                <Route
                  path="/orders"
                  element={activeRole === 'student' ? <OrdersPage /> : <Navigate to="/" replace />}
                />
                <Route
                  path="/students"
                  element={
                    activeRole === 'support' || activeRole === 'admin' || activeRole === 'superadmin' ? (
                      <StudentsPage />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  }
                />
                <Route path="/employees" element={<EmployeesPage />} />
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            )}
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
