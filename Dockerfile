# Multi-stage build for production Next.js 16 deployment
FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma 7 needs DATABASE_URL even for generate — provide a dummy value
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
# Prisma CLI is a devDependency but needed in production for `prisma migrate deploy`.
# Must install locally (not globally) so prisma.config.ts can resolve `prisma/config`.
RUN npm install --no-save prisma@7
USER nextjs
EXPOSE 3000
ENV PORT=3000
# Next.js standalone uses HOSTNAME to determine bind address.
# Docker sets HOSTNAME to container ID by default, causing the server
# to bind only to the container's specific IP. Override to 0.0.0.0
# so it listens on all interfaces (required for healthchecks + Traefik).
ENV HOSTNAME=0.0.0.0
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD node -e "fetch('http://localhost:3000').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
