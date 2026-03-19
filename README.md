# QR Code & Barcode Scanner

Mobile-first web application that scans QR codes and EAN-13 barcodes directly from the browser camera. Every scan is persisted to a cloud database in real time and displayed in a searchable history view. No app install required — works on iOS Safari and Android Chrome.

## Tech Stack

Next.js 16 (App Router) · React 19 · TypeScript 5.8 (strict mode) · Tailwind CSS 4 · Prisma 7 · PostgreSQL · ESLint 9 · Vitest 3 · Docker · Traefik

## Prerequisites

- Node.js 22+
- Docker & Docker Compose
- PostgreSQL 16 (via Docker for local dev, AWS RDS for production)

## Local Development

```bash
# Clone the repository
git clone https://github.com/Raju-H/qr-scanner.git && cd qr-scanner

# Install dependencies
npm install --legacy-peer-deps

# Start local Postgres
docker compose up -d

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL

# Generate Prisma client (requires DATABASE_URL)
npx prisma generate

# Push database schema
npx prisma db push

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your phone (same Wi-Fi network) to test the camera scanner.

> **Note:** Camera access requires HTTPS on mobile browsers. On `localhost` it works without HTTPS. For local network testing from a phone, you'll need to deploy to a server with SSL or use a tunneling tool.

## Production Deployment

The app deploys automatically via **GitHub Actions CI/CD**. Every push to `main` triggers: Test → Build Docker image → Push to ghcr.io → SSH deploy to EC2.

See `DEPLOYMENT_GUIDE.md` for detailed AWS (EC2 + RDS) + Cloudflare DNS + Traefik SSL setup.

For manual deployment fallback:
```bash
ssh -i qr-scanner-key.pem ubuntu@<Elastic-IP>
cd /home/ubuntu/qr-scanner
docker pull ghcr.io/raju-h/qr-scanner:latest
docker compose -f docker-compose.ci.yml up -d
```

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
| `npm run lint` | ESLint 9 check (flat config) |
| `npm run type-check` | TypeScript compiler check (no emit) |
| `npm run test` | Run Vitest 3 test suite (69 tests) |
| `npm run test:watch` | Vitest in watch mode |
| `npx prisma generate` | Regenerate Prisma client into `src/generated/prisma/` |
| `npx prisma db push` | Push schema to database |
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
├── types/                # Shared TypeScript types
└── generated/            # Prisma 7 generated client (gitignored)
```

## Architecture Decisions

- **@zxing/browser** for scanning — best QR + EAN-13 support, actively maintained.
- **SSE over WebSocket** — simpler for one-way push, works natively in Next.js route handlers.
- **Cursor pagination over offset** — better performance at scale, no skip-count drift.
- **Prisma 7 with driver adapters** — type safety, `@prisma/adapter-pg` for PostgreSQL, generated client in `src/generated/`.
- **Tailwind CSS 4** — CSS-first configuration via `@import "tailwindcss"` and `@theme`, no JS config file.
- **ESLint 9 flat config** — `eslint.config.mjs` with `eslint-config-next` exporting flat arrays natively.
- **Traefik over Nginx** — Docker-native, built-in ACME SSL, entire infra in one compose file.
- **Vitest 3 over Jest** — faster, ESM-native, better TypeScript DX.
- **GitHub Actions CI/CD** — automated test → build → deploy pipeline on every push to main.
