# Payment Link Platform

A full-stack Payment Link Platform that allows merchants to create products and generate shareable payment links for customers to pay via Mobile Money (MTN MoMo / Orange Money).

This project was built as part of a technical assessment and demonstrates real-world backend and frontend architecture, security practices, caching, idempotency, and third-party API integration.

# Product Management Scope

For the purpose of this assessment, basic product creation and inventory handling were implemented to support the payment flow.

However, the primary focus of the system is on payment link generation, payment processing, idempotency, caching, and checkout reliability.

This mirrors real-world payment platforms, where payment services typically integrate with an existing product or order system rather than managing the full product lifecycle.

# Features
## Merchant Features

Merchant registration and login

Secure password hashing (bcrypt)

JWT-based authentication

Protected merchant endpoints

# Product creation

Generation of shareable payment links

Payment status tracking

Automatic product quantity reduction on successful payment

Customer Features

Public payment page (no login required)

Product details display

Payment via Mobile Money (MoMo / Orange Money)

Downloadable receipt after successful payment

# Tech Stack
## Backend

NestJS (TypeScript)

REST API

PostgreSQL

Prisma ORM

Redis (idempotency and caching)

JWT authentication

PDFKit (receipt generation)

Mansa Transfers API (staging environment)

# Frontend

Next.js (App Router, TypeScript)

React Query (server state management)

Zustand (client state management)

Modern React patterns

Proper API integration

# Project Structure
payment-link-platform/
├── backend/
│   ├── src/
│   ├── prisma/
│   └── .env.example
│
└── frontend/
    ├── app/
    ├── stores/
    ├── hooks/
    └── .env.example

# Environment Variables

This project uses environment variables for configuration.

For security reasons, real credentials are not committed to the repository.

# Backend

Create a .env file from the example: .env.example .env
Example (backend/.env.example):

PORT=3001

DATABASE_URL=postgresql://user:password@localhost:5432/payment_link_db

JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1d

REDIS_URL=redis://127.0.0.1:6379

MANSA_BASE_URL=https://api-stage.mansatransfers.com
MANSA_CLIENT_KEY=your_client_key
MANSA_CLIENT_SECRET=your_client_secret

# Frontend

Create .env.local from the example:

cp .env.example .env.local

NEXT_PUBLIC_API_URL=http://localhost:3001

## How to Run Locally
### Backend
git clone https://github.com/<julianne-glitch>/payment-link-platform.git
cd backend
npm install
npx prisma migrate dev
npm run start:dev

Backend runs on:
http://localhost:3001

### Frontend
cd frontend
npm install
npm run dev

Frontend runs on:
http://localhost:3000

## How to Test the System
testing can be done using postman and a web browser
Step 1: Register Merchant
POST /auth/register

Step 2: Login Merchant
POST /auth/login


Copy the returned JWT token.

Step 3: Create Product & Payment Link
POST /payment-links
Authorization: Bearer <JWT_TOKEN>

Step 4: Open Public Payment Page
http://localhost:3000/pay/<payment-link-slug>

Step 5: Submit Payment

Enter customer name

Email address

Mobile Money number

Select provider (MoMo / Orange Money)

Click Pay

Payments use Mansa staging APIs.
No real money is transferred.

Step 6: Complete Payment (Mock / Webhook)
POST /payments/:id/status

Step 7: Download Receipt
GET /payments/:id/receipt

Receipt Contents

Merchant name

Product title and description

Amount paid

Payment reference

Customer name and email

Date of payment

Security Measures

Password hashing with bcrypt

JWT authentication

Route guards (backend and frontend)

Input validation

Redis-backed idempotency protection

Merchant data isolation
# Merchant Dashboard & Access Control

Merchant access is implemented through JWT-protected, merchant-scoped API endpoints, which collectively form the merchant dashboard.

Authenticated merchants can:

Create and manage products

Generate payment links

View and track payment statuses

All merchant routes are protected using authentication guards, and data access is strictly scoped to the authenticated merchant.

This approach mirrors real-world payment platforms, where the backend enforces access control and the dashboard UI is simply a consumer of these protected APIs. A lightweight frontend integration is provided to demonstrate this flow, while the core access control and business logic remain backend-driven.

## Payment Status Lifecycle

Payments follow a controlled status lifecycle:

1. PENDING
   - Set immediately after payment initialization
   - Indicates that the Mobile Money request has been sent
   - A unique payment reference is generated and stored

2. SUCCESSFUL
   - Set when the backend confirms a successful payment
   - Triggered via a simulated webhook or status update endpoint
   - Idempotency checks ensure the status is applied only once
   - Product quantity is reduced (if limited)
   - Receipt becomes available for download

3. FAILED(optional / extendable)
   - Reserved for unsuccessful or timed-out payments

This mirrors real-world payment systems where status confirmation
is asynchronous and decoupled from payment initialization.

## Design Decisions

The public payment page is intentionally minimal and focused on the payment flow.
This mirrors real-world payment link platforms, where checkout reliability, clarity,
and backend enforcement are prioritized over visual complexity.

All validation, payment integrity, and access control are handled server-side,
while the frontend serves as a thin, reliable interface to the payment system.

## Payment Status Handling
After a customer submits a payment on the public payment page, the frontend
periodically polls the backend to retrieve the current payment status.

Payments are initially created with a PENDING status.

For the purpose of this assessment, payment completion is handled in one of the
following ways:

Through a mocked completion endpoint that simulates a successful or failed payment, or

Via a staging Mobile Money provider response (Mansa Transfers API)

Once the backend confirms the payment as SUCCESS, the payment status is updated
in the database, and the frontend UI automatically reflects the change.

# Upon successful payment:

The payment status updates from PENDING to SUCCESS

Product quantity is reduced if the product is limited

The receipt download button becomes available to the client

This approach mirrors real-world payment systems, where asynchronous payment
confirmation is handled via polling or webhook-based updates.
# Assumptions

Mobile Money provider operates in staging mode

Payment success may be simulated

No real financial transactions occur

Limitations & Possible Improvements

Webhook signature verification

# recommended screnshots
## merchant account creation
![alt text](image.png)
## merchant loggin
![alt text](image-1.png)
## merchant product creation
![alt text](image-2.png)
## payment link creation
![alt text](image-3.png)
## plublic link with product and info
![alt text](image-4.png)
## status change when payment info is submitted
![alt text](image-5.png)
## webhooks calls backend and status change
![alt text](image-7.png)
![alt text](image-6.png)
#  reciept generation
![alt text](image-8.png)
![alt text](image-9.png)