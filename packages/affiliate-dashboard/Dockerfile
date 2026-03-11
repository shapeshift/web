FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json ./
RUN npm install

COPY index.html tsconfig.json tsconfig.node.json vite.config.ts ./
COPY src/ ./src/

RUN npx vite build

FROM nginx:stable-alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
RUN printf 'server {\n\
    listen       8080;\n\
    server_name  _;\n\
    root         /usr/share/nginx/html;\n\
    index        index.html;\n\
    location /v1/ {\n\
        proxy_pass         ${API_URL}/v1/;\n\
        proxy_http_version 1.1;\n\
        proxy_set_header   Host              $host;\n\
        proxy_set_header   X-Real-IP         $remote_addr;\n\
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;\n\
        proxy_set_header   X-Forwarded-Proto $scheme;\n\
    }\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/templates/default.conf.template
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
