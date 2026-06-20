FROM node:22-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --only=production

# Bundle app source
COPY . .

# Expose the internal ports used by the script
EXPOSE 3000
EXPOSE 4242

# Start the application
CMD [ "node", "index.js" ]
