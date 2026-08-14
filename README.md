# Eventful

A ticketing platform for concerts, theater, sports, and cultural events. Creators publish events, eventees discover and buy tickets, QR codes handle check-in.

## Stack

- **Runtime:** Node.js + TypeScript (strict mode)
- **Framework:** Express 5
- **Database:** MongoDB + Mongoose 8
- **Cache:** Redis (cache-aside pattern on all read-heavy queries, including analytics)
- **Realtime:** Socket.IO (JWT-authed handshake, same access token as the REST API)
- **Auth:** JWT (short-lived access token + httpOnly-cookie refresh token, with reuse detection)
- **Payments:** Paystack
- **QR codes:** signed tokens (`ticketId.signature`), not bare IDs — can't be forged by guessing

## Getting started

```bash
npm install
cp .env.example .env   # fill in the values below
npm run dev
```

Confirm it's alive:

```bash
curl http://localhost:5000/health
```

### Environment variables

| Variable                                   | Required | Notes                                               |
| ------------------------------------------ | -------- | --------------------------------------------------- |
| `MONGO_URI`                                | yes      | local or Atlas connection string                    |
| `REDIS_URL`                                | yes      | local or hosted Redis                               |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | yes      | any long random string, must differ from each other |
| `PAYSTACK_SECRET_KEY`                      | yes      | from Paystack dashboard (test key is fine)          |
| `QR_SIGNING_SECRET`                        | yes      | any long random string                              |
| `CLIENT_URL`                               | no       | defaults to `*`                                     |

See `.env.example` for the full list with defaults.

## API overview

Base path: `/api/v1`

### **Auth** — `/auth`

- `POST /register`
- `POST /login`
- `POST /refresh`
- `POST /logout`
- `GET /me`

### **Events** — `/events`

- `GET /` (public browse, filter + search + pagination)
- `GET /mine` (creator)
- `POST /` (creator)
- `GET /:id`
- `PATCH /:id` (creator)
- `POST /:id/cancel` (creator)
- `DELETE /:id` (creator, draft only)

### **Tickets** — `/tickets`

- `POST /` (eventee, buy a ticket)
- `GET /mine` (eventee)
- `GET /mine/:id/qr` (eventee)
- `POST /mine/:id/verify` (eventee, manual payment check)
- `PATCH /mine/:id/reminders` (eventee, custom reminder schedule)
- `GET /event/:eventId` (creator)
- `POST /scan` (creator, check-in)

**Payments** — `/payments`

- `POST /webhook` (Paystack calls this, not for direct use)

**Notifications** — `/notifications`

- `GET /mine`
- `PATCH /:id/read`

**Analytics** — `/analytics` (creator only)

- `GET /overview` (all-time totals)
- `GET /events/:id` (per-event breakdown)

**API Docs** - `/docs`: Swagger UI, or fetch **`/docs.json`** for the raw OpenAPI spec.

## Testing

```bash
npm run test
```

Or watch

```bash
npm run test:watch
```
