# Production Dockerfile for Course Platform on Render / Cloud Run
FROM node:20-bookworm-slim

# Install LibreOffice, Poppler-utils (pdftoppm), and librsvg for high-fidelity PPTX rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-impress \
    libreoffice-calc \
    libreoffice-writer \
    libreoffice-core \
    libreoffice-common \
    poppler-utils \
    librsvg2-bin \
    imagemagick \
    curl \
    ca-certificates \
    fonts-liberation \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps || npm install

# Copy application files
COPY . .

# Build frontend and server
RUN npm run build

# Expose port (Render sets $PORT, default 3000)
ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000

# Start server
CMD ["npm", "start"]
