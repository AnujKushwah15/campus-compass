# Phase 2, Plan 2: Cloud Layer Nginx Reverse Proxy Containerization

## 1. Objective
Containerize the Nginx reverse proxy to eliminate the need for the host-level `setup_nginx_ssl.sh` script, integrating it fully into the Docker Compose stack for the cloud layer.

## 2. Pre-requisites & Context
- The current `setup_nginx_ssl.sh` script installs Nginx directly on the VPS, configures it to proxy requests from `api.domain.com` to `localhost:3001` (Node backend), and uses `certbot` for Let's Encrypt SSL certificates.
- The new architecture will use Docker Compose with `host` networking for MediaMTX and Backend. Nginx must also be dockerized to manage its config declaratively.

## 3. Implementation Steps

### Step 3.1: Nginx Configuration File
We need to create a static Nginx configuration that can be mounted into the container.
Create `nginx/nginx.conf`:
```nginx
events {}

http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;

    server {
        listen 80;
        server_name api.yourdomain.com; # This will need to be configured/templated per environment

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        server_name api.yourdomain.com;

        ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header CORS "Access-Control-Allow-Origin: *" always;

        location / {
            limit_req zone=api burst=10 nodelay;
            proxy_pass http://127.0.0.1:3001; # Pointing to the backend on the host network
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### Step 3.2: Update `docker-compose.yml` for Nginx + Certbot
Add Nginx and Certbot services to the `docker-compose.yml` created in Plan 1.

```yaml
  nginx:
    image: nginx:alpine
    container_name: campus_nginx
    restart: always
    network_mode: "host"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    depends_on:
      - backend

  certbot:
    image: certbot/certbot
    container_name: campus_certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
```

### Step 3.3: SSL Initialization Script
Provide a script `scripts/init-letsencrypt.sh` to request the initial certificate before Nginx starts (since Nginx will crash if it looks for SSL certs that don't exist yet).

## 4. Verification Plan
1. **Verify Artifacts:** Ensure `nginx/nginx.conf`, `docker-compose.yml` additions, and `init-letsencrypt.sh` are created.
2. **Syntax Check:** Run `docker run --rm -v $(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf nginx:alpine nginx -t` (if docker is available locally during checking) to verify config syntax.
3. **Execution Test:**
   - The primary test is execution on the VPS. 
   - HTTP requests to port 80 should redirect to 443.
   - HTTPS requests should proxy to the backend health check endpoint (`/health`).
