# ServiceConnect

ServiceConnect is a full-stack service marketplace and booking application. Customers can find services and request bookings. Providers can publish services and manage requests.

**GitHub repository:** [ServiceConnect](https://github.com/divyarani-vemulawada/ServiceConnect)

## Features

- Register and sign in as a customer or service provider
- Browse services with descriptions, categories, prices, and provider details
- Publish services as a provider
- Request a service booking for a future date and time
- View bookings associated with your account
- Cancel a pending booking as a customer
- Confirm, decline, or complete bookings as a provider
- Role-based access to protected backend actions

## Tech stack

**Frontend**
- React
- Vite
- React Router
- Axios
- CSS

**Backend**
- Node.js
- Express
- Prisma ORM
- PostgreSQL
- JSON Web Tokens (JWT)
- bcrypt

## Repository structure

```text
ServiceConnect/
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   ├── db.js
│   ├── prisma.config.ts
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   └── package.json
└── .gitignore
```

The Prisma client is generated locally from the schema and is excluded from Git.

## Prerequisites

Install:

- [Node.js](https://nodejs.org/) and npm
- PostgreSQL
- Git

## Run locally

### 1. Clone the repository

```bash
git clone https://github.com/divyarani-vemulawada/ServiceConnect.git
cd ServiceConnect
```

### 2. Configure PostgreSQL and the backend

Create a PostgreSQL database for the project. Then create a file named `.env` inside the `backend/` directory:

```env
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/DATABASE_NAME?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
PORT=5000
```

Replace the database URL values with your PostgreSQL username, password, and database name. Set `JWT_SECRET` to a long, random value. Keep this file private; do not commit it to GitHub.

Install backend dependencies, generate the Prisma client, and apply the database migrations:

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
```

Start the backend:

```bash
npm run dev
```

The API runs at `http://localhost:5000` by default. The root route (`http://localhost:5000/`) returns a message confirming that the server is running.

### 3. Install and start the frontend

Open a second terminal at the repository root, then run:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite in your browser. During local development, the frontend sends API requests to `http://localhost:5000`.

## Available commands

Run backend commands from `backend/`:

```bash
npm run dev       # Start the backend with nodemon
npm start         # Start the backend with Node.js
npx prisma generate
npx prisma migrate deploy
```

Run frontend commands from `frontend/`:

```bash
npm run dev       # Start the Vite development server
npm run build     # Create a production build
npm run lint      # Run ESLint
npm run preview   # Preview the production build
```

## API overview

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| `GET` | `/` | Check that the API is running | Public |
| `POST` | `/api/auth/register` | Register a customer or provider | Public |
| `POST` | `/api/auth/login` | Sign in and receive a JWT | Public |
| `GET` | `/api/services` | List available services | Public |
| `GET` | `/api/services/:id` | Get a service by ID | Public |
| `POST` | `/api/services` | Publish a service | Provider |
| `POST` | `/api/bookings` | Request a booking | Customer |
| `GET` | `/api/bookings` | List the signed-in user's bookings | Signed-in user |
| `PATCH` | `/api/bookings/:id/status` | Update an eligible booking status | Booking owner/provider |

Protected endpoints require an authorization header:

```text
Authorization: Bearer YOUR_JWT
```

## Booking statuses

- `PENDING` — a customer has requested the booking
- `CONFIRMED` — the provider accepted the request
- `COMPLETED` — the provider marked the booking complete
- `CANCELLED` — the customer or provider cancelled the booking, subject to the allowed status transitions

## Database

The PostgreSQL schema is in `backend/prisma/schema.prisma`. Migration files are in `backend/prisma/migrations/`. When setting up a new database, configure `DATABASE_URL` before running Prisma commands.

## Security

- Never commit `.env` files, passwords, database credentials, or JWT secrets.
- Passwords are hashed before they are stored.
- The backend uses JWT authentication and role checks for protected actions.
- Change the example secret values before running the project.

## Project status

The application has been run locally. The frontend production build and ESLint checks have completed successfully.

## Author

**Divya Rani Vemulawada**