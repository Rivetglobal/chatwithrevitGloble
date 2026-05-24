# Client Docker Deployment

This directory contains the Docker configuration for deploying the client-side React application.

## Files

- `Dockerfile` - Multi-stage Docker build configuration
- `nginx.conf` - Nginx configuration for serving the React app
- `.dockerignore` - Files and directories to exclude from Docker build
- `docker-compose.yml` - Docker Compose configuration for easy deployment

## Building the Docker Image

```bash
# Build the image
docker build -t chat-client .

# Or use Docker Compose
docker-compose build
```

## Running the Container

```bash
# Run with Docker
docker run -p 80:80 chat-client

# Or use Docker Compose
docker-compose up -d
```

## Environment Variables

The application uses the following environment variable:

- `VITE_API_URL` - Backend API URL (configured in `.env`)

## Features

- Multi-stage build for optimized production image
- Nginx server with gzip compression
- React Router support with proper fallback
- Security headers
- Static asset caching
- Health checks

## Production Notes

- The application is built using Vite and optimized for production
- Nginx serves static files with appropriate caching headers
- All routes fallback to `index.html` for React Router support
- The container exposes port 80 by default
