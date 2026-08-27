FROM node:20-alpine AS builder
WORKDIR /workspace
COPY package*.json ./
RUN npm install
COPY . .
# Set NEXT_PUBLIC_API_URL or accept build arguments if needed
ENV NEXT_PUBLIC_API_URL=http://localhost:8000
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=builder /workspace/package*.json ./
COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/.next ./.next
COPY --from=builder /workspace/public ./public
COPY --from=builder /workspace/src ./src

EXPOSE 3000

CMD ["npm", "run", "start"]
