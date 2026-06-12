# shur.click URL Shortener

Full-stack URL shortener with:

- Spring Boot backend (JWT auth, URL APIs, redirects, stats)
- React + TypeScript frontend (home shortener, auth pages, dashboard)

## Features

- Public (guest) short URL creation upto 5 URL creation
- Authenticated short URL creation tied to user account
- SaaS plan limits:
  - Free plan: up to 15 generated links
  - Pro plan: $3/month for unlimited link generation
- User registration and login with JWT
- Dashboard to create, view, copy, and delete your links
- QR code support:
  - Home shortener result QR
  - Dashboard per-link QR toggle (`[+] show qr`)
- Public redirect endpoint by short code
- Public click stats endpoint

## Project Structure

- `urlShorter-backend` - Spring Boot API
- `urlshorter-frontend` - React + Vite web app

## Tech Stack

- Java 17
- Spring Boot 3
- Spring Security (JWT)
- Spring Data JPA + PostgreSQL
- React 19 + TypeScript + Vite
- Tailwind CSS

## API Summary

- `POST /api/auth/register` - register
- `POST /api/auth/login` - login
- `GET /api/me` - current user (auth required)
- `POST /api/urls` - create short URL (public or auth)
- `GET /api/urls` - list user URLs (auth required)
- `DELETE /api/urls/{id}` - delete user URL (auth required)
- `GET /api/billing/status` - current plan and usage (auth required)
- `POST /api/billing/razorpay-order` - create Razorpay order (auth required)
- `POST /api/billing/verify-payment` - verify Razorpay signature + activate Pro (auth required)
- `GET /api/urls/{code}/stats` - public stats for code
- `GET /{code}` - redirect to long URL

## Notes

- Guest links are stored under a dedicated guest user internally so DB `user_id` remains non-null.
- The backend currently supports legacy DB schemas requiring both:
  - `users.name`
  - `users.password`
    alongside newer `full_name` and `password_hash`.
