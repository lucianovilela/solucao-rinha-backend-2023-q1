# Etapa 1: Construir a imagem intermediária
FROM node:17 AS builder

# Define o diretório de trabalho
WORKDIR /app

# Copia o arquivo package.json e package-lock.json
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia o restante dos arquivos do projeto
COPY . .

CMD ["node", "main.js"]
