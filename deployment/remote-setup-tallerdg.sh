#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/root/taller/tallerdg"
DB_NAME="tallerdg"
DB_USER="tallerdg_app"
DB_PASSWORD="aa28e55962bafc3ce59d41a4b49c978c721bf73fd8c83c6a"

cd "$APP_DIR"

tar -xzf backend-deploy.tgz
rm -f backend-deploy.tgz

npm ci --omit=dev

mysql <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASSWORD}';
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'127.0.0.1';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

npm run migrate
npm run seed -- --specific=002_catalogos_base.js

DATABASE_URL="mysql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:3306/${DB_NAME}" \
ADMIN_EMAIL="dulio@gmail.com" \
ADMIN_PASSWORD="tallerproadmin2026" \
node "$APP_DIR/tallerdg-bootstrap.js"
