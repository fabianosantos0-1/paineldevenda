# Stage 1: Build Frontend (Landing Page)
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Admin Panel
FROM node:18-alpine AS admin-build
WORKDIR /app/admin
COPY admin/package*.json ./
RUN npm ci
COPY admin/ ./
RUN npm run build

# Stage 3: Python Backend
FROM python:3.11-slim

WORKDIR /app

# Instala dependências Python
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copia código do backend
COPY backend/main.py ./

# Copia builds do frontend e admin
COPY --from=frontend-build /app/frontend/build ./frontend/build
COPY --from=admin-build /app/admin/build ./admin/build

# Cria diretório de dados
RUN mkdir -p /app/data

# Expõe porta
EXPOSE 8000

# Comando para iniciar
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
