# QR Code & Barcode Scanner

Mobile-first web application that scans QR codes and EAN-13 barcodes directly from the browser camera. Every scan is persisted to a cloud database in real time and displayed in a searchable history view. No app install required — works on iOS Safari and Android Chrome.

## Tech Stack

Next.js 14 (App Router) · TypeScript (strict mode) · Tailwind CSS · Prisma ORM · PostgreSQL · Docker · Traefik · Vitest

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16 (via Docker for local dev, AWS RDS for production)

## Local Development

```bash
# Clone the repository
git clone <repo-url> && cd qr-scanner

# Install dependencies
npm install

# Start local Postgres
docker compose up -d

# Copy environment variables
cp .env.example .env.local

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your phone (same Wi-Fi network) to test the camera scanner.

## Production Deployment

The app runs on AWS EC2 with Docker Compose and Traefik for automatic SSL. See `DEPLOYMENT_GUIDE.md` for detailed EC2 + RDS setup instructions.

```bash
# On the EC2 instance:
./deploy.sh
```

This pulls the latest code, builds the Docker image, runs Prisma migrations, restarts all services, and runs a health check.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NODE_ENV` | `development` or `production` | Yes |
| `NEXT_PUBLIC_APP_URL` | Public app URL for metadata | Yes |
| `APP_DOMAIN` | Domain for Traefik routing | Production |
| `ACME_EMAIL` | Email for Let's Encrypt SSL | Production |

Copy `.env.example` to `.env.local` (dev) or `.env.production` (prod) and fill in values.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 3000) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint check |
| `npm run type-check` | TypeScript compiler check (no emit) |
| `npm run test` | Run Vitest test suite |
| `npm run test:watch` | Vitest in watch mode |
| `npx prisma migrate dev` | Apply migrations locally |
| `npx prisma generate` | Regenerate Prisma client |
| `docker compose up -d` | Start local dev database |

## Project Structure

```
src/
├── app/                  # Next.js App Router pages and API routes
│   ├── api/scans/        # REST API: GET, POST, SSE stream, CSV export
│   ├── history/          # History screen with infinite scroll
│   └── page.tsx          # Scanner screen
├── components/
│   ├── scanner/          # Camera feed, overlay, feedback, manual entry
│   ├── history/          # Scan cards, list, search, empty state
│   └── ui/               # Shared: badge, button, skeleton, toast
├── hooks/                # useScanner, useScans, useDeviceInfo
├── lib/                  # Prisma client, SSE manager, validators, utils
└── types/                # Shared TypeScript types
```

## Architecture Decisions

- **@zxing/browser** for scanning — best QR + EAN-13 support, actively maintained.
- **SSE over WebSocket** — simpler for one-way push, works natively in Next.js route handlers.
- **Cursor pagination over offset** — better performance at scale, no skip-count drift.
- **Traefik over Nginx** — Docker-native, built-in ACME SSL, entire infra in one compose file.
- **Vitest over Jest** — faster, ESM-native, better TypeScript DX.
