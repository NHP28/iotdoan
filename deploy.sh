#!/bin/bash
set -euo pipefail
PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR/backend"
npm ci
npm run db:init
npm run build
pm2 startOrReload ecosystem.config.js --update-env
cd "$PROJECT_DIR/frontend"
npm ci
npm run build
pm2 startOrReload ecosystem.config.js --update-env
pm2 save
echo 'DriverHub FE/BE restarted. Configure nginx and HTTPS for your domains.'
echo 'Run ai_model/pi_worker.py on the Raspberry Pi separately.'
