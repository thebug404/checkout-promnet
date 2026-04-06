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

# Copy and prepare entrypoint script
# COPY entrypoint.sh ./entrypoint.sh
# RUN chmod +x ./entrypoint.sh

EXPOSE 3000

# ENTRYPOINT ["./entrypoint.sh"]
CMD ["npm", "start"]
