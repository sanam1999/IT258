# OpenStack Node.js Control API

This project is a scaffold Node.js API to control OpenStack services:
Keystone (auth), Nova (compute), Glance (images), Neutron (networking), Cinder (volumes).

## Quick start

1. Install Node.js (18+ recommended) on your Ubuntu Server LTS.
2. Copy `.env.example` to `.env` and fill your OpenStack credentials and endpoints.
3. Install dependencies:

```bash
npm install
```

4. Run the server:

```bash
node app.js
```

API will run on the `PORT` defined in `.env` (default 3000).

See code in `controllers/` for available endpoints.
