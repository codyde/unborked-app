# Unborked Server (Node.js)

This is the Node.js backend server for the Unborked application. It handles API requests, user authentication, and database operations.

## Table of Contents
- [Technologies](#technologies)
- [Getting Started](#getting-started)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)

## Technologies

- Node.js with Express
- TypeScript
- PostgreSQL with Drizzle ORM
- JWT for authentication
- Sentry for error monitoring

## Getting Started

### Prerequisites

- Node.js >= 16
- PostgreSQL database

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in a `.env` file:
```
DATABASE_URL=postgresql://username:password@localhost:5432/unborked
JWT_SECRET=your_jwt_secret
PORT=3000
```

3. Build the application:
```bash
npm run build
```

4. Run database migrations:
```bash
npm run migrate
```

5. Start the server:
```bash
npm start
```

For development with hot-reloading:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and get JWT token

### Products
- `GET /products` - Get all products
- `GET /products/:id` - Get product by ID
- `POST /products` - Create a new product (admin only)

### Purchases
- `POST /purchases` - Create a new purchase (auth required)
- `GET /purchases` - Get user purchase history (auth required)

## Database Schema

### Users
- id (PK)
- username
- password
- createdAt
- updatedAt

### Products
- id (PK)
- name
- description
- price
- image
- category
- createdAt
- updatedAt

### Purchases
- id (PK)
- userId (FK)
- items (JSON)
- total
- createdAt