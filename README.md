# GyanPustak - Full Stack Project Documentation

GyanPustak is a role-based textbook platform for university workflows. It supports student purchasing and renting flows, staff operational workflows, and administrative catalog and academic data management.

This root README gives a complete project-level view. For implementation-level details, use:

- Backend docs: [Backend/README.md](Backend/README.md)
- Frontend docs: [Frontend/README.md](Frontend/README.md)

## 1. Project Purpose

The platform models a university textbook ecosystem where:

- Students can browse books, add items to cart, place orders, raise support tickets, and write reviews.
- Students can update their own profile details from the dashboard.
- New students can self-register from the signup page using full student profile attributes.
- Support staff can create and assign tickets.
- Admin and superadmin can manage universities, departments, instructors, courses, and books.
- Employees can update their own profile details from the dashboard.
- Superadmin can additionally manage employees.

## 2. Tech Stack

### Frontend

- React 19
- React Router 7
- Vite 8
- Context API for global app state

### Backend

- Node.js (ES Modules)
- Express 5
- PostgreSQL with pg driver
- Cookie-based auth session
- bcryptjs for password hashing

### Database

- PostgreSQL schema-first setup via SQL files
- Relational model with role-aware entities and transactional operations

## 3. High-Level Architecture

Frontend (React SPA)

- Authenticates through /api/auth/login and stores role + user id in cookies.
- Loads shared application data through a centralized context provider.
- Uses role-based route guards and conditional UI actions.
- Talks to backend through a small API client module.

Backend (Express API)

- Exposes /api routes and enforces auth/role constraints.
- Validates role session from cookies on each protected request.
- Encapsulates each domain in dedicated route modules.
- Uses SQL transactions for multi-step operations (course creation, order from cart, etc.).

Database (PostgreSQL)

- Stores users (students/employees), academic structure, books, tickets, cart, orders, and reviews.
- Uses constraints for data integrity (unique, check constraints, foreign keys).

## 4. Core Domain Modules

- Identity and access control:
  - Roles: student, support, admin, superadmin
  - Cookie-based auth with request-level role checks
- Academic hierarchy:
  - Universities -> Departments -> Instructors -> Courses
- Catalog:
  - Books with authors, keywords, course links, purchase options
- Service desk:
  - Trouble tickets with status history timeline
- Commerce:
  - Cart, cart items, orders, order items, cancel rules, and staff status progression
- Community:
  - Book reviews with rating 1-5 and one review per student per book

## 5. Role Matrix (Functional Overview)

Student

- View books, universities, courses, instructors
- Add to cart and place order
- Cancel eligible own orders
- View own tickets, create new tickets
- Add one review per book, delete own review

Support

- View tickets
- Create tickets
- Assign tickets to admin
- View all orders
- Update order status (new, processed, awaiting shipping, shipped, canceled)
- Cannot update an order once it is canceled
- Students tab is hidden for support in navigation

Admin

- Manage books, universities, departments, instructors, courses
- Progress assigned/in-process tickets
- View reviews and optionally remove reviews through API role policy

Superadmin

- Everything admin can do
- Manage employees

## 6. End-to-End Flows

### Login flow

1. User submits email, password, role on login page.
2. Backend validates user credentials from students or employees table.
3. Backend sets auth_user_id and auth_role cookies.
4. Frontend context loads all relevant datasets.

### Student signup flow

1. Unauthenticated user opens the signup page.
2. Frontend fetches university options from public signup-universities endpoint.
3. User submits all student profile fields plus password and confirm password.
4. Backend validates the payload and password match, creates student, hashes password, and creates a cart.
5. Frontend shows success message and redirects user to login.

### Book purchase flow

1. Student selects buy or rent from books listing.
2. Item enters cart with purchase option and quantity.
3. Student can adjust cart quantities before checkout.
4. Checkout validates card and shipping details.
5. Backend creates order, moves cart items to order items, reduces book stock by ordered quantity, and clears cart.
6. If an order is canceled, the stock is restored by the order quantity.

### Ticket workflow

1. Student/support creates ticket with initial status new.
2. Support can assign ticket.
3. Admin/superadmin progresses ticket to in-process then completed.
4. Status history entries are appended for timeline view.

### Review workflow

1. Any role can open and read reviews.
2. Student can submit rating 1-5 with text.
3. One review per student per book is enforced in DB and API.
4. Student can delete own review; admin/superadmin can moderate via delete endpoint.

### Profile update workflow

1. Student opens the dashboard and edits first name, last name, email, address, phone number, date of birth, university affiliation, major, and year of study.
2. Employee opens the dashboard and edits first name, last name, gender, Aadhaar number, email, address, and phone number.
3. Backend validates ownership and persists the update through the dedicated PATCH endpoints.

## 7. Local Development Setup

## Prerequisites

- Node.js 18+
- npm
- PostgreSQL instance

## Backend

1. Go to Backend folder.
2. Install dependencies: npm install
3. Configure environment variables in Backend/.env
4. Run server: npm run dev

## Frontend

1. Go to Frontend folder.
2. Install dependencies: npm install
3. Run dev server: npm run dev

Vite proxy forwards /api requests to http://localhost:5000 in local development.

## 8. Environment Variables

Backend expected variables:

- DATABASE_URL
- PORT (optional, defaults to 5000)
- NODE_ENV (production enables SSL in pg pool)
- CORS_ORIGIN (comma-separated, optional)
- DB_AUTO_SEED (true to reset and seed on startup)

Frontend optional variables:

- VITE_API_BASE_URL (defaults to /api)

## 9. Database Initialization Behavior

- On startup, backend calls initializeDatabase().
- If DB_AUTO_SEED=true:
  - Existing tables are dropped
  - schema.sql is re-applied
  - seed.sql is inserted
  - placeholder passwords are re-hashed
- If DB_AUTO_SEED is not true:
  - No reset or seed is performed

## 10. Project Structure

- Backend:
  - src/app.js, src/server.js
  - src/routes/* domain routers
  - src/middleware/* auth and error handling
  - src/db/* pool and init
  - db/schema.sql, db/seed.sql
- Frontend:
  - src/App.jsx route shell
  - src/context/GyanPustakContext.jsx global state provider
  - src/api/client.js API wrapper
  - src/pages/* role-based feature pages

## 11. Security and Validation Notes

- Backend is the source of truth for authorization.
- Cookies identify authenticated role and user id.
- DB constraints enforce key business invariants (status enums, uniqueness, FKs).
- Frontend adds UX validation but should be treated as convenience only.

## 12. Current Scope and Known Notes

- ID generation in several write routes uses Date.now() + random suffix patterns.
- Credit card values are stored as plain text fields in current schema and should be tokenized/encrypted in production.
- Student and employee dashboard profile updates are supported through authenticated PATCH routes.
- There is no automated test suite yet in this repo.

## 13. Detailed Docs

- Backend: [Backend/README.md](Backend/README.md)
- Frontend: [Frontend/README.md](Frontend/README.md)
