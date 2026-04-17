# Backend Documentation - GyanPustak API

This README documents backend architecture, startup flow, schema integration, middleware, and all API modules.

## 1. Stack and Runtime

- Node.js with ES Modules
- Express 5
- PostgreSQL through pg Pool
- bcryptjs for password hashing
- cookie-parser for cookie-based session access
- helmet, cors, morgan for baseline HTTP security and logging

Package scripts:

- npm run dev -> node --watch src/server.js
- npm start -> node src/server.js

## 2. Entry Points

- src/server.js:
  - Loads env variables
  - Initializes database bootstrap logic
  - Validates DB connection
  - Starts Express listener
- src/app.js:
  - Configures middleware
  - Mounts API router at /api
  - Handles 404 fallback
  - Handles centralized errors

## 3. Configuration

Required/important environment variables:

- DATABASE_URL: PostgreSQL connection string
- PORT: API server port (default 5000)
- NODE_ENV: production enables SSL mode in DB pool
- CORS_ORIGIN: comma-separated allowlist (optional)
- DB_AUTO_SEED: if true, startup resets and reseeds database

## 4. Database Boot Process

File: src/db/initializeDatabase.js

Behavior:

- If DB_AUTO_SEED is not true:
  - Skip reset and seed
- If DB_AUTO_SEED=true:
  - Drops domain tables
  - Executes db/schema.sql
  - Executes db/seed.sql
  - Replaces placeholder bcrypt hashes with real hashed password123

DB connection is defined in src/db/pool.js using DATABASE_URL.

## 5. Middleware

### Authentication middleware

File: src/middleware/authGuard.js

- Reads auth_user_id and auth_role cookies
- Validates role against allowed set
- Verifies user exists in students or employees table
- Adds request.auth = { userId, role }

Role guard helper:

- requireRoles([...roles]) validates request.auth.role

### Error middleware

File: src/middleware/errorHandler.js

- Converts thrown HttpError or generic errors to JSON response:
  - success: false
  - message
  - status code (default 500)

## 6. Utility Helpers

- src/utils/httpError.js
  - Custom HttpError with statusCode
- src/utils/asyncHandler.js
  - Wraps async route handlers and forwards thrown errors

## 7. API Routing Topology

Router entry: src/routes/index.js

Public routes:

- /api/auth/*
- /api/health/*

All other modules require auth middleware:

- /api/books
- /api/universities
- /api/instructors
- /api/courses
- /api/students
- /api/employees
- /api/tickets
- /api/reviews
- /api/carts
- /api/orders

## 8. Module-by-Module API Behavior

### 8.1 Auth

File: src/routes/auth.js

- GET /api/auth/signup/universities
  - Public endpoint used by signup UI to load university options
  - Returns university id and name list
- POST /api/auth/signup/student
  - Public student registration endpoint
  - Accepts student profile fields with password and confirmPassword
  - Validates required fields and password match
  - Hashes password and stores in students.password_hash
  - Creates linked cart row in the same transaction
- POST /api/auth/login
  - Input: email, password, role
  - Role-specific lookup:
    - student -> students table
    - support/admin/superadmin -> employees table
  - Verifies bcrypt password hash
  - Sets auth cookies for user id and role
- POST /api/auth/logout
  - Clears auth cookies

### 8.2 Health

File: src/routes/health.js

- GET /api/health
  - Returns API health status and timestamp

### 8.3 Books

File: src/routes/books.js

- GET /api/books
  - Lists books with enriched details:
    - authors
    - keywords
    - course links
- GET /api/books/:id
  - Retrieves one enriched book
- POST /api/books/add
  - Roles: admin, superadmin
  - Creates book and dependent rows in:
    - book_authors
    - book_keywords
  - Transactional insert

### 8.4 Universities and Departments

File: src/routes/universities.js

- GET /api/universities
  - Returns universities with nested departments and instructors
- GET /api/universities/:id
  - Returns one university aggregate
- POST /api/universities/add
  - Roles: admin, superadmin
  - Generates unique id server-side with retry loop
- POST /api/universities/:universityId/departments/add
  - Roles: admin, superadmin
  - Validates university existence
  - Creates department with generated id

### 8.5 Instructors

File: src/routes/instructors.js

- GET /api/instructors
  - Returns instructor rows with university and department names
- GET /api/instructors/:id
  - Returns one instructor
- POST /api/instructors/add
  - Roles: admin, superadmin
  - Validates university
  - Validates department-university relation when department provided
  - Creates instructor with generated id

### 8.6 Courses

File: src/routes/courses.js

- GET /api/courses
  - Lists courses with departments, instructors, and course-book relation labels
- GET /api/courses/:id
  - Retrieves one course aggregate
- POST /api/courses/add
  - Roles: admin, superadmin
  - Validates university
  - Creates course with generated id
  - Accepts course book references using bookId, bookIsbn, or isbn
  - Validates course book relation in required or recommended
  - Inserts junction records for:
    - course_departments
    - course_instructors
    - course_books
  - Uses transaction

### 8.7 Students

File: src/routes/students.js

- GET /api/students
  - Student role sees only own record
  - Staff/admin roles see all students
  - Includes university_name through join
- POST /api/students/add
  - Roles: admin, superadmin
  - Creates student with default hashed password
  - Also creates cart record for student
  - Uses transaction
- PATCH /api/students/:studentId
  - Student role can update only own profile
  - Updates first name, last name, email, address, phone number, date of birth, university affiliation, major, year of study, and optional password
  - Validates email, phone, university existence, and password length

### 8.8 Employees

File: src/routes/employees.js

- GET /api/employees
  - Superadmin sees all employees
  - Support/admin see only their own employee record
- POST /api/employees/add
  - Role: superadmin
  - Validates required fields including aadhaar number
  - Validates role in support/admin/superadmin
  - Creates employee with default hashed password
- PATCH /api/employees/:employeeId
  - Support/admin can update only their own employee profile
  - Superadmin can update employee profiles
  - Updates first name, last name, gender, Aadhaar number, email, address, phone number, and optional password
  - Salary remains read-only for self-service edits and can only be changed by superadmin
  - Validates email, phone, Aadhaar uniqueness, and password length

### 8.9 Tickets

File: src/routes/tickets.js

- GET /api/tickets
  - Student sees only own student-created tickets
  - Staff/admin roles see all tickets
  - Includes creator/resolver names and status history timeline data
- POST /api/tickets/add
  - Creates new ticket and initial status history record
  - Student role is forced to student creator identity from auth
- PATCH /api/tickets/:id/status
  - Updates ticket status and optional resolver/solution fields
  - Appends ticket_status_history row
  - Student updates limited to own tickets

### 8.10 Cart

File: src/routes/cart.js

- Router is restricted to student role
- GET /api/carts
  - Returns cart aggregate with book metadata and purchase option
- POST /api/carts/items/add
  - Adds or increments item
  - Stores purchase_option buy or rent
  - Creates cart automatically if absent
- DELETE /api/carts/items/:bookId
  - Removes item and updates cart timestamp

### 8.11 Orders

File: src/routes/orders.js

- GET /api/orders
  - Student sees own orders, staff sees all
- POST /api/orders/from-cart/add
  - Role: student
  - Validates payment and shipping fields
  - Creates order from cart items
  - Creates order_items rows
  - Clears cart
  - Uses transaction
- PATCH /api/orders/:orderId/cancel
  - Role: student
  - Cancels non-shipped and non-canceled order
- PATCH /api/orders/:orderId/status
  - Roles: support, admin, superadmin
  - Allowed status values: new, processed, awaiting shipping, shipped, canceled
  - Once order status is canceled, the order cannot be updated again

### 8.12 Reviews

File: src/routes/reviews.js

- GET /api/reviews/book/:bookId
  - Returns review list with student names
  - Also returns currentUserHasReviewed for student UX control
- POST /api/reviews/add
  - Role: student only
  - Validates rating 1-5 and non-empty review text
  - Prevents duplicate review by same student for same book
- DELETE /api/reviews/:reviewId
  - Roles: student, admin, superadmin
  - Student can delete own review
  - Admin/superadmin can delete any review

## 9. Database Schema Summary

Defined in db/schema.sql

Core tables:

- students
- employees
- universities
- departments
- instructors
- courses
- course_departments
- course_instructors
- books
- book_authors
- book_keywords
- course_books
- book_reviews
- trouble_tickets
- ticket_status_history
- carts
- cart_items
- orders
- order_items

Notable constraints:

- Role/status enum checks via CHECK constraints
- Unique keys such as email, ISBN, aadhaar, and per-book-per-student review
- Foreign keys with ON DELETE cascade or set null where appropriate

## 10. Seed Data

Defined in db/seed.sql

Includes:

- One baseline student
- Support/admin/superadmin employees
- One university and departments
- Instructors and courses
- Multiple books, authors, keywords
- Sample tickets/history
- One cart and one order sample

## 11. Security and Limitations

Current behavior:

- Cookie session role checks on every protected route
- Role-based middleware for sensitive actions
- Input validation exists in route handlers

Important production considerations:

- IDs are generated in code using Date.now-based patterns in many routes
- Payment card details are persisted as plain fields in orders table
- No refresh token or JWT strategy; session is cookie and DB-backed identity check

## 12. Running Backend Locally

1. Install dependencies:

   npm install

2. Configure Backend/.env with DATABASE_URL and optional values.

3. Run development server:

   npm run dev

4. Health check:

   GET /api/health

## 13. Recommended Next Improvements

- Add migration framework (for example, drizzle-kit, knex, or prisma migrations)
- Introduce centralized request validation schema (for example, zod)
- Tokenize/encrypt payment data
- Add automated test coverage for route modules
- Add pagination and query filtering for large datasets
