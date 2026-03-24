# --- Stage 1: Build frontend ---
FROM node:20-slim AS frontend-build
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Production ---
FROM python:3.12-slim
WORKDIR /app

RUN pip install --no-cache-dir fastapi uvicorn[standard] psycopg2-binary

COPY backend/ ./backend/
COPY main.py ./
COPY --from=frontend-build /build/dist ./static

RUN mkdir -p data

EXPOSE 8000
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
