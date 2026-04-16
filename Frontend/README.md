# Frontend Documentation - GyanPustak UI

This README explains frontend architecture, state model, role-based routing, page behavior, and API integration.

## 1. Stack

- React 19
- React Router 7
- Vite 8
- Context API for global shared state
- Fetch-based API client

Scripts:

- npm run dev
- npm run build
- npm run preview
- npm run lint

## 2. Entry and Shell

- src/main.jsx
  - Mounts app in StrictMode
- src/App.jsx
  - Wraps app with GyanPustakProvider
  - Handles authentication-aware routing
  - Builds role-sensitive navigation menu
  - Displays loading and backend error states

## 3. Routing and Access Rules

Configured in App.jsx:

- / -> Dashboard
- /books
- /universities
- /courses
- /instructors
- /tickets
- /cart (student only)
- /orders (student only)
- /students (support, admin, superadmin)
- /employees
- /login
- /signup

If not authenticated:

- Login and signup routes are available
- All other paths redirect to /login

## 4. Global State Layer

File: src/context/GyanPustakContext.jsx

Responsibilities:

- Reads auth role from cookies
- Maintains all core datasets:
  - books, universities, courses, instructors
  - students, employees
  - tickets
  - cart and orders
- Maps backend response shapes to frontend-friendly objects
- Exposes reload functions per domain:
  - reloadBooks, reloadUniversities, reloadCourses
  - reloadStudents, reloadEmployees, reloadInstructors
  - reloadTickets, reloadCart, reloadOrders

Load strategy:

- On authenticated load, fetches core datasets in parallel
- For student role, additionally loads cart and orders

Auth actions:

- loginAsRole(credentials)
- logout()

## 5. API Integration Layer

File: src/api/client.js

Single request helper:

- Base URL from VITE_API_BASE_URL (default /api)
- JSON requests/responses
- Throws user-friendly Error for non-OK responses

Exposed API methods cover:

- auth, books, universities, departments
- instructors, courses
- students, employees
- tickets
- cart and orders
- reviews

## 6. Page-by-Page Feature Documentation

### 6.1 LoginPage

- Email, password, role selection
- Client-side required field checks
- Calls loginAsRole and transitions into authenticated app

### 6.2 SignupPage

- Public student registration form
- Captures all student attributes required by students table
- Loads university options using public auth signup API
- Validates email, phone, password, and confirm-password match
- Shows status messages and redirects to login on success

### 6.3 DashboardPage

- Shows current role
- Student: ticket count, order count, profile card, and editable student profile form
- Staff: ticket and employee summary blocks, with editable employee profile form
- Student profile edit supports first name, last name, email, address, phone number, date of birth, university affiliation, major field of study, and year of study
- Employee profile edit supports first name, last name, gender, Aadhaar number, email, address, and phone number
- Save actions call the authenticated PATCH endpoints and refresh the dashboard data after update

### 6.4 BooksPage

Student features:

- Search by title, author, ISBN, category, keyword
- Add to cart with purchase option buy or rent
- Expand reviews per book
- Loading indicator while reviews fetch
- Average review display in reviews section
- Review create restricted to student role
- Review form hidden once current student already reviewed
- Delete button shown only for current student's own review

Admin and superadmin features:

- Add book form with metadata fields:
  - purchase options
  - authors
  - keywords
  - category/subcategories
  - publication and pricing fields

### 6.5 UniversitiesPage

- List universities and departments
- Admin/superadmin can add universities
- Admin/superadmin can add departments under selected university
- Email and phone validation for representative fields

### 6.6 CoursesPage

- List courses with filters by university and instructor
- Admin/superadmin can add courses
- Supports selecting departments and instructors by university
- Supports attaching books as required/recommended

### 6.7 InstructorsPage

- List instructors with university and department
- Filter by university
- Admin/superadmin can add instructor
- Department selection is optional but university-bound

### 6.8 TicketsPage

- Student/support can create tickets
- Status filtering UI
- Support can assign new tickets
- Admin/superadmin can progress assigned/in-process tickets
- Requires solution text before completion transition
- Timeline view for status history with actor names

### 6.9 CartPage

- Student-only checkout page
- Displays cart items and selected purchase option
- Buy-only items contribute to total calculation
- Remove item action
- Checkout with shipping + card detail validation
- Places order from cart via backend API

### 6.10 OrdersPage

- Student order list
- Displays status, shipping, card summary, and item IDs
- Allows cancellation unless shipped/canceled

### 6.11 StudentsPage

- Staff/admin view of student list with university filter
- Admin/superadmin can add student
- Validates email and phone format
- University choices loaded from backend

### 6.12 EmployeesPage

- Employee listing with role filter
- Superadmin can add employee
- Validates email, phone, Aadhaar, and salary formatting
- Captures role, gender, salary, address, and identity fields

### 6.13 Profile Update Behavior

- Student dashboard edits are restricted to the authenticated student account
- Employee dashboard edits are restricted to the authenticated employee account

## 7. Styling and UI Pattern Notes

- Page-level CSS modules under src/pages/*.css
- Shared shell styles in App.css and index.css
- Standardized message pattern:
  - status-message info
  - status-message success
  - status-message error

## 8. Development Server and Backend Proxy

Vite config:

- Dev proxy forwards /api to http://localhost:5000
- This enables cookie/session flows without changing API paths in code

## 9. Frontend Data Model Highlights

Mapped frontend objects include:

- Student: universityName + universityId support
- Book: purchaseOption array, authors, keywords, courseLinks
- Ticket: createdByName/resolvedByName + normalized history entries
- Cart item: purchaseOption per item
- Instructor: university and department names

## 10. Known Implementation Notes

- Current student identity in BooksPage delete visibility is inferred from loaded students data.
- Some IDs in create forms are generated client-side before API calls.
- Mock data file exists but active data source is backend API after login.

## 11. Running Frontend Locally

1. Install dependencies:

   npm install

2. Start development server:

   npm run dev

3. Ensure backend is running on port 5000 (or override VITE_API_BASE_URL).

## 12. Recommended Improvements

- Add unit/integration tests for page actions and context mapping
- Replace ad-hoc client validations with shared schema
- Add optimistic UI for selected actions (ticket updates, cart updates)
- Add pagination and server-side filtering for large lists
- Improve date/time localization consistency across pages
