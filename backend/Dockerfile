FROM python:3.11-slim

WORKDIR /app

# Instala dependências do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copia requirements e instala
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o código
COPY new_api.py main.py

# Cria diretório de dados (para persistência)
RUN mkdir -p /app/data

# Expõe porta
EXPOSE 8000

# Comando para iniciar
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
