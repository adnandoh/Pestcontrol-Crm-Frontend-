# WhatsApp Inbox (WhatsFlow embed)

## API base URL (required)

| Environment | Variable | Value |
|-------------|----------|-------|
| Local | `VITE_WHATSAPP_API_URL` | `https://api.driveronhire.ai` |
| Vercel | `VITE_WHATSAPP_API_URL` | `https://api.driveronhire.ai` |
| Vercel | `VITE_WHATSAPP_API_KEY` | `wf_...` (from WhatsFlow → API Keys) |

**Do not use** `https://www.driveronhire.ai` — that is the WhatsFlow website (Vercel), not the Django API (Railway).

## WebSocket (optional)

```
VITE_WHATSAPP_WS_URL=wss://api.driveronhire.ai
```

If omitted, derived automatically from `VITE_WHATSAPP_API_URL`.

## Vercel setup

1. Project → **Settings** → **Environment Variables**
2. Add `VITE_WHATSAPP_API_URL` = `https://api.driveronhire.ai`
3. Add `VITE_WHATSAPP_API_KEY` = your `wf_` key
4. **Redeploy** (env changes require a new build)

## Railway (WhatsFlow backend)

```
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,https://pestcontrol-crm-frontend.vercel.app
```
