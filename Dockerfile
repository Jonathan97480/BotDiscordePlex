FROM node:18-alpine

WORKDIR /app

COPY . .
RUN chmod +x install.sh

EXPOSE 3000 4000

CMD ["./install.sh"]