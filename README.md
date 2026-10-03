<div align="center">

# 🍽️ Best Kitchen Delivery API

**A REST API for restaurant discovery, menu management, ordering, payments, and real-time delivery tracking.**

Built with **Node.js, Express 5, PostgreSQL, and Prisma ORM 7**.

![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-Realtime-010101?logo=socketdotio&logoColor=white)

[Quick Start](#-getting-started) · [API Reference](#-api-reference) · [Data Models](#-data-models) · [Authentication](#-authentication) · [Project Structure](#-project-structure)

</div>

---

## 📖 Table of Contents

- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Authentication](#-authentication)
- [Real-Time Events](#-real-time-events)
- [Data Models](#-data-models)
- [Validation and Errors](#-validation-and-errors)
- [Development and Testing](#-development-and-testing)

## ✨ Features

- Customer registration, login, logout, and current-user lookup.
- Public restaurant discovery with city, cuisine, and pagination filters.
- Restaurant creation and management for restaurant owners and administrators.
- Public menu and category browsing; owner/admin menu and category management.
- Customer carts scoped to a restaurant, with add, update, remove, and clear operations.
- Checkout, order history, order details, and order status transitions.
- Driver profiles, online/offline availability, location updates, and delivery listings.
- Delivery assignment and lifecycle operations for administrators and drivers.
- Payment records, Stripe PaymentIntent creation, and signed Stripe webhooks.
- Authenticated Socket.IO connections for notifications and order/delivery updates.
- Zod request validation and centralized JSON error responses.

## 🧰 Technology Stack

| Area | Technology |
| --- | --- |
| Runtime | Node.js with ES modules |
| HTTP API | Express 5 |
| Database | PostgreSQL |
| ORM and migrations | Prisma ORM 7 with the PostgreSQL driver adapter |
| Request validation | Zod |
| Authentication | JSON Web Tokens in HTTP-only cookies; bcrypt password hashing |
| Real-time communication | Socket.IO |
| Payments | Stripe REST API and webhook signature verification |
| Development server | nodemon and tsx |

## 🏗️ Architecture

The application is organized into Express routes, controllers, services, validators, middleware, and shared libraries. `app.js` configures middleware and mounts the REST API. `server.js` starts the HTTP server and initializes Socket.IO. Services contain database and business operations and use the Prisma client in `src/lib/prisma.js`.

```text
HTTP client / Socket.IO client
             |
       server.js + Socket.IO
             |
          app.js
             |
 Routes -> Middleware/Validators -> Controllers -> Services
                                                |       |
                                            Prisma   Stripe
                                                |
                                           PostgreSQL
```

## 📁 Project Structure

```text
.
├── app.js                         # Express app, middleware, and route mounts
├── server.js                      # HTTP and Socket.IO server entry point
├── prisma7.config.ts              # Prisma CLI schema, migrations, and datasource config
├── prisma/
│   ├── schema.prisma              # PostgreSQL data model
│   └── migrations/                # Versioned database migrations
└── src/
    ├── controllers/               # HTTP request handlers
    ├── generated/prisma/          # Generated Prisma Client; do not edit manually
    ├── lib/                       # Prisma and Redis client modules
    ├── middleware/                # Authentication, roles, and error handling
    ├── routes/                    # REST endpoint definitions
    ├── services/                  # Business logic and persistence operations
    ├── sockets/                   # Socket.IO authentication and event handlers
    └── validators/                # Zod request schemas
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20.19 or newer.
- npm.
- A PostgreSQL database and its connection string.
- A strong JWT signing secret.
- Stripe credentials only if using card-payment intents or Stripe webhooks.

### Install

```bash
git clone <repository-url>
cd Best_Kitchen_Dilivery
npm ci
```

Create a `.env` file in the project root using the variables in [Environment Variables](#-environment-variables). Do not commit `.env` or put real secrets in source control.

Apply the checked-in database migrations and generate the Prisma client:

```bash
npx prisma migrate dev
npx prisma generate
```

Start the development server:

```bash
npm run dev
```

By default, the API listens at `http://localhost:3000`. Verify the server with:

```http
GET http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok"
}
```

## 🔐 Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma. Include the provider-required SSL options for hosted databases. |
| `JWT_SECRET` | Yes for authentication | Secret used to sign and verify access tokens. Use a long, random value. |
| `PORT` | No | HTTP port. Defaults to `3000`. |
| `NODE_ENV` | No | Set to `production` to mark the auth cookie as `Secure`. |
| `CLIENT_ORIGIN` | No | Comma-separated allowed origins for Socket.IO CORS. |
| `STRIPE_SECRET_KEY` | For card payments | Stripe secret API key used to create PaymentIntents. |
| `STRIPE_WEBHOOK_SECRET` | For Stripe webhooks | Signing secret used to verify incoming webhook requests. |

Example template (replace placeholders locally):

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
JWT_SECRET="replace-with-a-long-random-secret"
PORT=3000
NODE_ENV=development
CLIENT_ORIGIN="http://localhost:5173"

# Optional: Stripe integration
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
```

## 🌐 API Reference

All REST endpoints are prefixed with `/api`, except `GET /health`. Request and response bodies use JSON unless the endpoint is the Stripe webhook. Protected endpoints use the `accessToken` cookie issued by registration or login.

### Health

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/health` | Public | API health check |

### Authentication — `/api/auth`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/register` | Public | Register a customer and set the session cookie |
| `POST` | `/login` | Public | Authenticate and set the session cookie |
| `POST` | `/logout` | Public | Clear the session cookie |
| `GET` | `/me` | Authenticated | Return the current user |

Registration body:

```json
{
  "email": "customer@example.com",
  "password": "at-least-8-characters",
  "firstName": "Taylor",
  "lastName": "Example",
  "phone": "+15551234567"
}
```

Login body:

```json
{
  "email": "customer@example.com",
  "password": "at-least-8-characters"
}
```

### Restaurants — `/api/restaurants`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/` | Public | Browse restaurants; supports `city`, `cuisine`, `page`, and `limit` query parameters |
| `GET` | `/:restaurantId` | Public | Get a restaurant by UUID |
| `GET` | `/mine` | Restaurant owner, admin | List restaurants owned by the current user |
| `POST` | `/` | Restaurant owner, admin | Create a restaurant |
| `PATCH` | `/:restaurantId` | Restaurant owner, admin | Update restaurant details |
| `PATCH` | `/:restaurantId/status` | Admin | Set status to `PENDING`, `ACTIVE`, `PAUSED`, or `CLOSED` |

Creating a restaurant requires `name`, `street`, `city`, and `country`. Optional fields include `description`, `phone`, `email`, `region`, `postalCode`, `latitude`, `longitude`, `cuisine`, and `imageUrl`.

### Menus and Categories — `/api/restaurants/:restaurantId/menu`

Menu reads are public. Menu and category changes require a restaurant-owner or admin session.

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/:restaurantId/menu` | Public | List menu items |
| `GET` | `/:restaurantId/menu/categories` | Public | List menu categories |
| `POST` | `/:restaurantId/menu` | Restaurant owner, admin | Create a menu item |
| `PATCH` | `/:restaurantId/menu/:menuItemId` | Restaurant owner, admin | Update a menu item |
| `DELETE` | `/:restaurantId/menu/:menuItemId` | Restaurant owner, admin | Delete a menu item |
| `POST` | `/:restaurantId/menu/categories` | Restaurant owner, admin | Create a category |
| `PATCH` | `/:restaurantId/menu/categories/:categoryId` | Restaurant owner, admin | Update a category |
| `DELETE` | `/:restaurantId/menu/categories/:categoryId` | Restaurant owner, admin | Delete a category |

A menu item requires `name` and a positive numeric `price`. A category requires `name`. Optional fields are validated by the API; for example, `categoryId` must be a UUID and `imageUrl` must be a URL.

### Cart — `/api/cart`

All cart routes require a customer session.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/` | Get the current customer's carts |
| `GET` | `/:restaurantId` | Get the cart for a restaurant |
| `POST` | `/:restaurantId/items` | Add a menu item; body: `menuItemId`, optional `quantity` |
| `PATCH` | `/items/:cartItemId` | Set item quantity; body: `quantity` |
| `DELETE` | `/items/:cartItemId` | Remove a cart item |
| `DELETE` | `/:restaurantId` | Clear one restaurant cart |
| `DELETE` | `/` | Clear all current-customer carts |

### Orders — `/api/orders`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/` | Customer, restaurant owner, admin | List orders visible to the current user; supports `status`, `page`, and `limit` |
| `POST` | `/checkout` | Customer | Create an order from the customer's cart |
| `GET` | `/:orderId` | Customer, restaurant owner, admin | Get an order by UUID, subject to ownership/visibility rules |
| `PATCH` | `/:orderId/status` | Customer, restaurant owner, admin | Request a status change; allowed values are `CONFIRMED`, `PREPARING`, `READY_FOR_PICKUP`, and `CANCELLED` |

Checkout accepts either an existing `addressId` or a new `address`, but not both. It also requires a `restaurantId` and `paymentMethod` (`CARD`, `CASH`, or `WALLET`); `tip` is optional.

### Drivers — `/api/drivers`

All driver routes require a driver session.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/me` | Get the driver's profile |
| `PATCH` | `/me` | Update vehicle/profile fields |
| `PATCH` | `/availability` | Set availability to `ONLINE` or `OFFLINE` |
| `POST` | `/location` | Record latitude and longitude |
| `GET` | `/deliveries` | List deliveries for the current driver; supports status and pagination filters |

### Deliveries — `/api/deliveries`

All delivery routes require authentication. Role restrictions are listed for each operation.

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/mine` | Customer | List the current customer's deliveries |
| `GET` | `/available` | Driver | List available deliveries |
| `GET` | `/` | Admin | List deliveries; supports status and pagination filters |
| `POST` | `/orders/:orderId` | Admin | Create a delivery for an order |
| `GET` | `/:deliveryId` | Authenticated | Get a delivery, subject to visibility rules |
| `POST` | `/:deliveryId/accept` | Driver | Accept an assigned delivery |
| `POST` | `/:deliveryId/pickup` | Driver | Mark a delivery picked up; optional `note` |
| `POST` | `/:deliveryId/complete` | Driver | Mark a delivery completed; optional `note` |
| `PATCH` | `/:deliveryId/assign` | Admin | Assign a driver; body: `driverId` |

### Payments — `/api/payments`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/webhook` | Stripe signature | Verify and process a Stripe event |
| `GET` | `/:orderId` | Customer, admin | Get payment information for an order |
| `POST` | `/:orderId/intent` | Customer | Create or retrieve a Stripe PaymentIntent for an eligible card order |

The webhook expects the raw Stripe request body and a valid `Stripe-Signature` header. Configure the webhook endpoint in Stripe with `STRIPE_WEBHOOK_SECRET` set in the application environment.

## 🔑 Authentication

Registration creates a `CUSTOMER` account. Successful registration and login return an HTTP-only `accessToken` cookie with a seven-day lifetime. The cookie uses `SameSite=Lax` and is marked `Secure` when `NODE_ENV=production`. Logout clears the cookie.

The current user roles are:

| Role | Typical capabilities |
| --- | --- |
| `CUSTOMER` | Manage own cart, place orders, and view eligible order/delivery/payment data |
| `RESTAURANT_OWNER` | Manage owned restaurants and menus; view eligible orders |
| `DRIVER` | Manage driver profile and availability, update location, and process assigned deliveries |
| `ADMIN` | Manage restaurants and delivery assignment; access administrative listings |

Clients should retain the cookie using their HTTP client's cookie jar. The API does not document a separate bearer-token REST authentication flow; Socket.IO additionally accepts a token in its handshake as described below.

## ⚡ Real-Time Events

Socket.IO is attached to the same HTTP server. Connections must authenticate using one of these handshake credentials:

- `auth: { "token": "<access-token>" }`
- `Authorization: Bearer <access-token>`
- The `accessToken` cookie

Clients can join and leave authorized resource rooms:

| Client event | Payload | Description |
| --- | --- | --- |
| `order:join` | `orderId` | Join an order room after visibility checks |
| `order:leave` | `orderId` | Leave an order room |
| `delivery:join` | `deliveryId` | Join a delivery room after visibility checks |
| `delivery:leave` | `deliveryId` | Leave a delivery room |

The server emits `notification`, `order:status`, `delivery:status`, and `delivery:location` events when corresponding business operations occur. Join/leave events can receive an acknowledgement such as `{ "ok": true }` or `{ "ok": false, "error": "..." }`.

## 🗃️ Data Models

The Prisma schema defines these PostgreSQL models:

- **User** and **Address** — account identity, role, and delivery addresses.
- **Restaurant**, **MenuCategory**, and **MenuItem** — restaurant information and catalog.
- **Cart** and **CartItem** — customer carts grouped by restaurant.
- **Order** and **OrderItem** — order lifecycle and item snapshots.
- **Payment** — payment method, status, amount, and provider references.
- **DriverProfile**, **DriverLocation**, **Delivery**, and **DeliveryStatusUpdate** — driver state and delivery tracking.

Enums in the schema define user roles, restaurant/order/payment/delivery statuses, payment methods, and driver availability. See [`prisma/schema.prisma`](prisma/schema.prisma) for the authoritative fields, relations, defaults, and constraints.

## ⚠️ Validation and Errors

Request bodies, query parameters, and UUID path parameters are validated with Zod. Invalid input returns HTTP `400` with a JSON error and, for validation failures, a `details` array containing field paths and messages.

| Status | Meaning |
| --- | --- |
| `400` | Invalid JSON, request body, query, or path parameter |
| `401` | Missing, invalid, or expired authentication |
| `403` | Authenticated user lacks permission for the resource or operation |
| `404` | Route or requested record was not found |
| `409` | Conflict, such as a duplicate unique value or invalid state transition |
| `5xx` | Unexpected server or upstream-provider failure |

Typical error response:

```json
{
  "error": "Invalid request data",
  "details": [
    {
      "path": "fieldName",
      "message": "Validation message"
    }
  ]
}
```

## 🧪 Development and Testing

The available npm script is:

```bash
npm run dev
```

Useful Prisma commands:

```bash
npx prisma validate
npx prisma migrate status
npx prisma migrate dev --name describe_your_change
npx prisma generate
```

No automated `npm test` script is currently defined. For manual API checks, run the server, import or create requests in Postman, and use `http://localhost:<PORT>` as the base URL. Start with `GET /health`, then register/log in to exercise protected routes. Use separate accounts for customer, restaurant-owner, driver, and admin workflows; public registration creates customers only.

---

<div align="center">

Made for restaurant ordering and delivery workflows.

</div>