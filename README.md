# 🚀 Dockerized Expense Tracker - DevOps Architecture

This project is a full-stack expense tracker designed with a **DevOps-first approach**, focusing on automation, containerization, and continuous delivery.

## 🏗️ DevOps Tech Stack
- **Containerization**: Docker & Docker Compose
- **CI/CD Pipeline**: GitHub Actions
- **Web Server & Reverse Proxy**: Nginx
- **Infrastructure as Code**: Docker Compose for environment orchestration
- **Automation**: Node-cron for recurring expense processing
- **Monitoring**: Integrated server-side logging

## 🛠️ DevOps Features

### 1. Multi-Stage Docker Build
The `Dockerfile` uses a multi-stage build process:
- **Build Stage**: Compiles the React frontend and installs dependencies.
- **Production Stage**: Creates a lightweight image containing only the necessary production artifacts, reducing the attack surface and image size.

### 2. Microservices Orchestration
Using `docker-compose.yml`, the application is split into two services:
- **App Service**: The Node.js/Express backend and React frontend (running on port 3008).
- **Nginx Service**: Acts as a reverse proxy, handling incoming traffic on port 80 and forwarding it to the app service. This mimics a real-world production environment.

### 3. Automated CI/CD Pipeline
The `.github/workflows/deploy.yml` automates the following:
- **Linting**: Ensures code quality on every push.
- **Testing**: Placeholder for automated unit/integration tests.
- **Docker Build & Push**: Automatically builds the Docker image and pushes it to Docker Hub upon merging to the main branch.
- **Deployment**: Ready-to-use hooks for automated deployment to cloud providers.

### 4. Background Job Automation
A `node-cron` job runs daily at midnight to process fixed/recurring expenses, demonstrating automated state management without manual intervention.

## 🚀 Getting Started

### Local Development
```bash
npm install
npm run dev
```

### Docker Deployment
```bash
docker-compose up --build
```
The application will be accessible at `http://localhost`.

## 📈 Monitoring & Maintenance
- Logs are output to the standard Docker stream for easy monitoring.
- SQLite database is persisted via Docker volumes in the `./data` directory.
