FROM node:22-slim

WORKDIR /app

# ponytail: only openssl needed for prisma, skip everything else
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm install && npx prisma generate

COPY src ./src/
COPY tsconfig.json ./

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://localhost:4000/health').then(r=>{process.exit(r.ok?0:1)}).catch(()=>process.exit(1))"

CMD ["npx", "tsx", "src/index.ts"]
