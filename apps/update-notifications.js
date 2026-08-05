const fs = require('fs');

const src = fs.readFileSync('./user/app/settings/notifications.tsx', 'utf8');

// Replace /api/v1/user/push-token with /api/v1/auth/push-token
const replaced = src.replace('/api/v1/user/push-token', '/api/v1/auth/push-token');

// Ensure directory exists
if (!fs.existsSync('./driver/app/settings')) {
  fs.mkdirSync('./driver/app/settings', { recursive: true });
}

fs.writeFileSync('./driver/app/settings/notifications.tsx', replaced, 'utf8');
