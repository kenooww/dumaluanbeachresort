# Amihan Cove Resort

A tropical beach-resort website with a hero image carousel, a public rooms listing pulled live from
MongoDB, and an admin dashboard for managing rooms (with photo upload) and staff/admin user accounts.

## Stack

- **Backend:** Node.js, Express, MongoDB + Mongoose, Multer (image upload), JWT auth, bcrypt
- **Frontend:** Plain HTML / CSS / JS (no build step) — served directly by Express
- **Database:** MongoDB (local or MongoDB Atlas)

## Project structure

```
amihan-cove-resort/
├── server.js              # Express app entry point
├── seed.js                # Creates the first admin account + sample rooms
├── config/db.js           # MongoDB connection
├── models/                # Mongoose schemas (User, Room)
├── routes/                # /api/auth, /api/rooms, /api/users
├── middleware/auth.js      # JWT auth guard
├── utils/upload.js        # Multer config for room photo uploads
├── uploads/rooms/          # Uploaded room photos are stored here (served at /uploads/rooms/...)
└── public/
    ├── index.html          # Public landing page (hero carousel, rooms, amenities, booking)
    ├── css/style.css
    ├── js/main.js
    └── admin/
        ├── login.html
        ├── dashboard.html
        ├── css/admin.css
        └── js/admin.js
```

## 1. Install dependencies

```bash
npm install
```

## 2. Set up Cloudinary (for room photo uploads)

Room photos are uploaded to [Cloudinary](https://cloudinary.com) rather than saved to local disk, so
uploads work correctly on serverless hosts like Vercel (which don't allow writing files to a
persistent local folder).

1. Create a free account at https://cloudinary.com
2. Go to your [Cloudinary console](https://cloudinary.com/console) — the dashboard shows your
   **Cloud name**, **API Key**, and **API Secret** right at the top.
3. You'll paste these into your `.env` file in the next step.

## 3. Configure environment variables

Copy the example file and edit it:

```bash
cp .env.example .env
```

Set at minimum:

- `MONGODB_URI` — your MongoDB connection string
  - Local MongoDB: `mongodb://127.0.0.1:27017/amihan-cove`
  - MongoDB Atlas: `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/amihan-cove`
- `JWT_SECRET` — any long random string
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — credentials for the first admin account (used by the seed script)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — from your Cloudinary console

## 4. Create the first admin account (and sample rooms)

```bash
npm run seed
```

This creates one admin user from your `.env` values and, if the `rooms` collection is empty, seeds
4 sample rooms so the site isn't empty on first run.

## 5. Run the server

```bash
npm start        # production
npm run dev       # auto-restart on file changes (requires the nodemon devDependency)
```

Then open:

- **Public site:** http://localhost:5000
- **Admin login:** http://localhost:5000/admin

Log in with the email/password you set in `.env` (or the defaults in `.env.example` if you didn't
change them — change the password after your first login).

## How the pieces fit together

- The **landing page** (`public/index.html`) fetches `GET /api/rooms` on load and renders each room as
  a postcard-style card. If the API isn't reachable, it falls back to a few sample rooms so the design
  is still visible while you're setting things up.
- The **admin dashboard** (`public/admin/dashboard.html`) requires a JWT, obtained by logging in at
  `/admin`. The token is stored in `localStorage` and sent as `Authorization: Bearer <token>` on every
  request to `/api/rooms` (write routes) and `/api/users`.
- **Room photo uploads** go through `POST /api/rooms` and `PUT /api/rooms/:id` as
  `multipart/form-data`, handled by Multer, and uploaded directly to **Cloudinary** (see
  `utils/upload.js`). The Cloudinary secure URL is saved in `Room.image`, and the Cloudinary
  `public_id` is saved in `Room.imagePublicId` so old photos are properly deleted when a room's photo
  is replaced or the room itself is deleted.
- **Users** created in the dashboard can be `staff` or `admin`. Only `admin` accounts can manage users;
  both roles can manage rooms (adjust `middleware/auth.js` / `routes/rooms.js` if you'd like to restrict
  room editing to admins only).

## Customizing

- Colors, fonts and the postcard/travel-poster styling live in `public/css/style.css` — the CSS custom
  properties at the top (`--lagoon-deep`, `--coral`, `--sand`, etc.) control the whole palette.
- Hero carousel slides are defined directly in `public/index.html` under `.hero-slides` — add or remove
  `<article class="hero-slide">` blocks to change the carousel.
- Room types are defined in `models/Room.js` (`enum` on the `type` field) and mirrored in the `<select>`
  in `public/admin/dashboard.html`.

## Deploying

Works on any Node host, including serverless platforms like **Vercel**, since room photos are stored on
Cloudinary rather than local disk. A few notes either way:

1. Set the same environment variables on the host (including the `CLOUDINARY_*` ones) — a `.env` file
   is never deployed, so these must be added through your host's dashboard.
2. Use **MongoDB Atlas** rather than a local MongoDB instance in production, and under Atlas's
   **Network Access**, allow access from anywhere (`0.0.0.0/0`) — serverless hosts don't have a fixed
   IP you could whitelist individually.
3. If deploying to Vercel specifically, add a `vercel.json` that routes all traffic to `server.js`, and
   make sure `server.js` only calls `app.listen()` when *not* running on Vercel (check
   `process.env.VERCEL`), exporting `app` instead so Vercel can wrap it as a serverless function.
