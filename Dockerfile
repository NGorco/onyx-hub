FROM node:23.6.0-alpine

WORKDIR /app/user/onyx

COPY . .

EXPOSE 3000

ENTRYPOINT ["npm", "run", "run-ts-node"]
