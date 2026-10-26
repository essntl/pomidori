# Pomidori — self-hosted image.
# User data lives in each visitor's browser. The container itself is stateless; optional
# cross-device sync stores end-to-end encrypted data in Postgres (see docker-compose.yml).
#
# Multi-arch without CPU emulation: the app is built once on the build machine's own CPU
# ($BUILDPLATFORM). Next.js's standalone output is plain JavaScript; the only native piece at
# runtime is sharp (image optimisation), which is fetched prebuilt for the target CPU.
# Building Next.js under QEMU emulation crashed at random ("Illegal instruction").

FROM --platform=$BUILDPLATFORM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && node -p "require('sharp/package.json').version" > .sharp-version

# sharp's prebuilt binaries for the image's CPU, downloaded (not run) on the build machine.
FROM --platform=$BUILDPLATFORM node:22-alpine AS sharp
ARG TARGETARCH
WORKDIR /sharp
COPY --from=build /app/.sharp-version ./
RUN npm init -y >/dev/null \
  && npm install --no-audit --no-fund --os=linux --libc=musl \
       --cpu="$([ "$TARGETARCH" = amd64 ] && echo x64 || echo "$TARGETARCH")" \
       "sharp@$(cat .sharp-version)"

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
# Overlay sharp for this image's CPU (the build machine's copy may be for another CPU).
COPY --from=sharp --chown=nextjs:nodejs /sharp/node_modules ./node_modules

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1

CMD ["node", "server.js"]
