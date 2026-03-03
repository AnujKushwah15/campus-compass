#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Campus Compass — VPS Nginx + SSL Setup Script
#
# Usage: Run this on the VPS as root AFTER pointing your domain A record
#        to your VPS IP (72.61.250.73).
#
# Provides:
#   https://api.yourdomain.com  →  localhost:3001  (backend Node.js API)
#
# Prerequisites:
#   - Domain DNS A record: api.yourdomain.com → 72.61.250.73
#   - campus-compass.service running on port 3001
#   - Nginx not yet installed (script installs it)
# ─────────────────────────────────────────────────────────────────────────────

set -e

# ─── CONFIGURE THESE ─────────────────────────────────────────────────────────
DOMAIN="api.yourdomain.com"       # ← Change to your actual subdomain
EMAIL="you@youremail.com"         # ← Change to your email for Let's Encrypt
BACKEND_PORT=3001
# ─────────────────────────────────────────────────────────────────────────────

echo "🔧 Installing Nginx + Certbot..."
apt-get update -qq
apt-get install -y nginx certbot python3-certbot-nginx

echo "📝 Writing Nginx config for $DOMAIN..."
cat > /etc/nginx/sites-available/campus-compass << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Let's Encrypt challenge passthrough
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all HTTP → HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # ── SSL (managed by Certbot) ───────────────────────────────────────────
    ssl_certificate     /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # ── Security Headers ───────────────────────────────────────────────────
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # ── CORS for Next.js frontend ──────────────────────────────────────────
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;

    # ── Rate Limiting ──────────────────────────────────────────────────────
    limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/m;

    # ── Proxy to Node.js backend ───────────────────────────────────────────
    location / {
        limit_req zone=api burst=10 nodelay;

        proxy_pass         http://127.0.0.1:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
    }
}
EOF

echo "🔗 Enabling site..."
ln -sf /etc/nginx/sites-available/campus-compass /etc/nginx/sites-enabled/campus-compass
rm -f /etc/nginx/sites-enabled/default  # remove default nginx page

echo "✅ Testing Nginx config..."
nginx -t

echo "🔄 Starting Nginx..."
systemctl enable nginx
systemctl restart nginx

echo "🔐 Obtaining SSL certificate for $DOMAIN..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$EMAIL"

echo "🔁 Auto-renew: adding certbot renew to cron..."
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && systemctl reload nginx") | crontab -

echo ""
echo "✅ Done! HTTPS is now configured."
echo "   Backend API: https://$DOMAIN"
echo ""
echo "⚠️  NEXT STEPS:"
echo "   1. Update NEXT_PUBLIC_VPS_URL in .env.local:"
echo "      NEXT_PUBLIC_VPS_URL=https://$DOMAIN"
echo "   2. Restart campus-compass backend:"
echo "      sudo systemctl restart campus-compass"
echo "   3. Allow port 443 in firewall:"
echo "      sudo ufw allow 443/tcp"
echo "      sudo ufw allow 80/tcp"
