# Crowdfunding Platform with Milestone-Based Releases

Simple full-stack TypeScript dApp connecting to Stellar Soroban smart contract.

![alt text](<Screenshot 2025-11-04 230928.png>)
## Contrat Details
Contract ID: CCSVROMQR65HZQTUY7GO3WMZ3CQ3PK6A2RUH3YGDUGYMNDVIMYQPDC2O
![alt text](ima.png)

## Quick Run

1. **Setup environment**
```bash
   # Copy and add your real SECRET_KEY
   cp .env.example server/.env
```

2. **Install dependencies**
```bash
   npm install
```

3. **Start both server and client**
```bash
   npm run dev
```

4. **Access app**
   - Client: http://localhost:5173
   - Server: http://localhost:3001

## Features

- Create campaigns with milestones
- Contribute funds via Freighter wallet
- Release milestone funds (creator only)
- View campaign and milestone status

## Important Security Notes

⚠️ **NOT FOR PRODUCTION**
- Server stores SECRET_KEY (private key exposure risk)
- No authentication/authorization layer
- In-memory JSON storage (data loss on restart)
- No transaction retry or error handling

## Contract Details

- **Contract ID:** `CCSVROMQR65HZQTUY7GO3WMZ3CQ3PK6A2RUH3YGDUGYMNDVIMYQPDC2O`
- **Network:** Stellar Testnet
- **Test Wallet:** `GDWA4326FKITATXTJFFKIOI66ZHU4MF7JJWH6L63LLOP2VHOJ2POOBIC`

## Project Structure
```
├── server/          # Express TypeScript backend
│   ├── src/
│   │   ├── index.ts      # API routes
│   │   ├── stellar.ts    # Soroban interactions
│   │   └── types.ts      # Shared types
│   └── data/
│       └── projects.json # Simple storage
├── client/          # React TypeScript frontend
│   └── src/
│       ├── pages/
│       └── utils/
└── package.json     # Root orchestrator
```

## Environment Variables

Create `server/.env`:
```
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
CONTRACT_ID=CCSVROMQR65HZQTUY7GO3WMZ3CQ3PK6A2RUH3YGDUGYMNDVIMYQPDC2O
SECRET_KEY=Sxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PORT=3001
```

**Never commit .env file!**
```

---

## `.gitignore`
```
node_modules/
dist/
.env
server/.env
server/data/projects.json
*.log
.DS_Store
```

---

## `.env.example`
```
# Copy this to server/.env and fill in your real SECRET_KEY

SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
CONTRACT_ID=CCSVROMQR65HZQTUY7GO3WMZ3CQ3PK6A2RUH3YGDUGYMNDVIMYQPDC2O
SECRET_KEY=Sxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PORT=3001