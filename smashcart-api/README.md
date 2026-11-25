# SmashCart API

The Express + MongoDB backend of [SmashCart](https://github.com/opahmad759-cloud/SmashCart), a badminton e-commerce store.

**Live API:** https://smashcart-api-ude6.onrender.com
**Website:** https://smash-cart.vercel.app

## What it does

- Products, orders, users, contact messages, shop settings and chat logs stored in MongoDB (Mongoose)
- JWT login with `customer` and `admin` roles; admin routes are protected on the server
- Server-side price calculation: quantity discounts, first-order discount, delivery fee and the free gift rule
- Atomic stock updates, and stock (including the gift) goes back when an order is cancelled
- Password reset emails through Brevo
- Product photo upload to Cloudinary
- AI shopping assistant endpoint powered by Google Gemini, built from live shop data
- Rate limiting on the contact form and the chatbot

## Main routes

| Route | Who | Purpose |
| --- | --- | --- |
| `POST /api/auth/register`, `/login` | everyone | create an account, log in |
| `POST /api/auth/forgot-password`, `/reset-password/:token` | everyone | password reset by email |
| `GET /api/products`, `/api/products/:id` | everyone | product catalog |
| `GET /api/settings` | everyone | public shop settings |
| `POST /api/messages` | everyone | contact form |
| `POST /api/chat` | everyone | AI assistant |
| `POST /api/orders`, `GET /api/orders/mine`, `GET /api/orders/offer` | logged in | place and see orders, first-order and gift offer |
| `PATCH /api/orders/:id/cancel` | order owner | cancel a pending order |
| `/api/admin/*` | admin only | stats, products, upload, orders, customers, settings, chats |

## Run it

```bash
npm install
npm start
```

Create a `.env` file (never commit it):

```
MONGO_URI=your-mongodb-connection-string
JWT_SECRET=a-long-random-string
CLIENT_URL=http://localhost:3000
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=choose-a-strong-password
BREVO_API_KEY=...
MAIL_FROM=your-verified-sender@example.com
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.5-flash-lite
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

Create sample products and the admin account:

```bash
node seed.js         # deletes and recreates all products, run only on an empty database
node createAdmin.js  # creates or upgrades the admin from ADMIN_EMAIL / ADMIN_PASSWORD
```

## Deploy on Render

Root directory `smashcart-api`, build command `npm install`, start command `npm start`, and add the variables above. `CLIENT_URL` must match the website address exactly, without a trailing slash.
