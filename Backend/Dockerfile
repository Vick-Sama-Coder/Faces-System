# ---------- Etapa 1: instalar dependencias ----------
FROM node:22-bookworm-slim AS deps

WORKDIR /app

# Ferramentas de compilacao para o caso de o bcrypt nao encontrar um binario
# pre-compilado para a plataforma. Ficam apenas nesta etapa (nao vao para a imagem final).
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Copiar primeiro os manifestos para aproveitar a cache do Docker
COPY package.json package-lock.json ./

# Apenas dependencias de producao (nodemon/drizzle-kit nao sao necessarios em runtime)
RUN npm ci --omit=dev

# ---------- Etapa 2: imagem final ----------
FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
# O Render injeta a sua propria PORT; este valor e apenas o fallback/local
ENV PORT=10000

WORKDIR /app

# Copiar dependencias ja instaladas
COPY --from=deps --chown=node:node /app/node_modules ./node_modules

# Codigo e migracoes necessarios em runtime
COPY --chown=node:node package.json ./
COPY --chown=node:node drizzle.config.js ./
COPY --chown=node:node drizzle ./drizzle
COPY --chown=node:node src ./src

# Correr sem root
USER node

EXPOSE 10000

# O arranque aplica as migracoes do Drizzle e so depois abre a porta
CMD ["node", "src/server.js"]
