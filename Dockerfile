# Stage 1: Build the frontend
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Final production image
FROM node:20-slim
WORKDIR /app

# Install dependencies needed for SQLite
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev
RUN npm install -g tsx

# Copy the built frontend and the backend server code
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/expense_tracker.db ./

EXPOSE 3008

# Run the server using tsx
CMD ["tsx", "server.ts"]
