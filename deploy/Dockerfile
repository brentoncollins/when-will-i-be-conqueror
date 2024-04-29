# Stage 1: Build the Go app
FROM golang:1.22 as go-builder
WORKDIR /app
COPY api-processor/go.mod api-processor/go.sum ./
RUN go mod download
COPY api-processor/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd

# Stage 2: Build the React app
FROM node:16 as react-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 3: Create the final container
FROM alpine:latest
WORKDIR /app
VOLUME /mnt/user/appdata
# Install Node.js, npm, and supervisord
RUN apk add --update nodejs npm supervisor

# Install serve globally
RUN npm install -g serve

# Copy necessary files
COPY --from=go-builder /app/main /app/main
COPY --from=react-builder /app/build /app/build

ENV REACT_APP_PROD_API_URL=https://api.when-will-i-be-conqueror.com
ENV REACT_APP_DEV_API_URL=http://localhost:9999
ENV NODE_ENV=production
# Add supervisord configuration file
COPY deploy/supervisord.conf /etc/supervisord.conf

EXPOSE 9999 5000

# Command to run supervisord
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]