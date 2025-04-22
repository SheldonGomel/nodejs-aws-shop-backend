FROM docker.io/library/node:18-alpine
WORKDIR /app
COPY bff_service ./bff_service
COPY bff_service/package.json .
RUN npm install --production
ENV APP_PORT=3000
EXPOSE 3000
CMD ["node","./proxy.js"]