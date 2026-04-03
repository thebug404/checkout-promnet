FROM node:20-alpine

WORKDIR /app

# Copy package manifest and install dependencies
# (includes devDependencies for tsx and typescript)
COPY package.json ./
RUN npm install

# Copy TypeScript config and source code
COPY tsconfig.json ./
COPY src/ ./src/

# Copy file-based JSON data store
COPY data/ ./data/

EXPOSE 3000

CMD ["npm", "start"]
