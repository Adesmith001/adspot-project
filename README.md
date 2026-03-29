# Adspot Final Year Project MVP

Adspot is a reduced but complete MVP of a geolocation-based billboard rental and management system. It focuses on the exact final-year-project flow:

1. Billboard owners create and manage billboard listings.
2. Admins approve or reject listings and supervise users, bookings, and payments.
3. Advertisers discover approved billboards on a map, filter them, book them, and complete payment with a realistic simulation fallback.

## Implemented Scope

### Public pages
- Landing page
- Listings page with filters
- Billboard details page
- Login
- Sign up

### Owner features
- Owner dashboard
- Create billboard listing
- Edit billboard listing
- Delete billboard listing
- Upload billboard images to Firebase Storage
- Set title, description, location text, latitude, longitude, price, dimensions, and availability
- View bookings for owned billboards

### Advertiser features
- Advertiser dashboard
- Browse approved listings
- Search and filter by keyword, location, price range, dimensions, and availability
- Interactive Google Maps view
- Booking with start and end dates
- Booking conflict checks
- Payment simulation fallback with Firestore payment records
- Confirmation page with printable and downloadable summary

### Admin features
- Admin dashboard
- Manage users
- Approve or reject listings
- View and manage all bookings
- Track payment records
- Manage simple dispute and refund statuses
- Reports overview with basic dashboard stats

## Excluded Scope

This MVP intentionally excludes:

- IoT or hardware integration
- Analytics and forecasting
- AI optimization
- Chat or social features
- Internationalization
- Large-scale enterprise architecture

## Tech Stack

- Frontend: Vite + React + TypeScript
- Styling: Tailwind CSS
- State: Redux Toolkit
- Backend/BaaS: Firebase Auth, Firestore, Firebase Storage
- Maps: Google Maps JavaScript API
- Payment: Simulated payment flow for presentation reliability

Note: `api/korapay/*` stubs from the previous project are still present as an optional extension path, but this MVP defaults to the simulated flow for stable demo use.

## Firestore Collections

The MVP uses these collections:

- `users`
- `listings`
- `bookings`
- `payments`

## Demo Accounts

Create or seed these accounts in Firebase Authentication for your presentation:

- Owner: `owner@adspot.demo` / `Owner123!`
- Advertiser: `advertiser@adspot.demo` / `Advertiser123!`
- Admin: `admin@adspot.demo` / `Admin123!`

This MVP also allows selecting `admin` during signup so the full role flow can be demonstrated locally without extra backend tooling.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and provide your Firebase and Google Maps values.

```bash
copy .env.example .env
```

Required variables:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_GOOGLE_MAPS_API_KEY=
```

Optional variables:

```env
VITE_KORAPAY_PUBLIC_KEY=
VITE_KORAPAY_SECRET_KEY=
```

### 3. Firebase configuration

Enable these services in Firebase:

- Authentication
  - Email/Password
- Firestore Database
- Storage

### 4. Run the project

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Presentation Flow

Use this order for demo:

1. Sign in as owner and create a listing.
2. Sign in as admin and approve the listing.
3. Sign in as advertiser and find the billboard on the listings page or map.
4. Create a booking with dates.
5. Complete the simulated payment.
6. Show the confirmation page and print/download actions.
7. Return to owner and admin dashboards to show the same booking.

## Notes

- Booking conflicts are checked before a booking draft is created and again before simulated payment succeeds.
- Listing edits send the listing back to `pending` approval for admin review.
- The app is local-first and presentation-focused rather than production-scaled.
