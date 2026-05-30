FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY index.html ./index.html
COPY src ./src

ENV VITE_API_BASE_URL=http://localhost:8100/api
EXPOSE 5174
CMD ["npm", "run", "dev"]
