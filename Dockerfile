# Use a recent Node.js LTS version
FROM node:20-alpine

# Install git in the container
RUN apk add --no-cache git

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# ADD THIS LINE to copy the git history
COPY .git ./.git

# Copy the rest of the application code
COPY . .

# The default command to run when the container starts
CMD ["npm", "run", "build"]