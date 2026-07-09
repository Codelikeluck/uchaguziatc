# ATC Blockchain Voting System

A secure, blockchain-based online voting system for SOATECO (Students Organization of Arusha Technical College) General Elections. Built with Next.js, Solidity smart contracts, and cryptographic vote verification.

## Features

- **Multi-Factor Authentication**: Admission number + OTP verification
- **AES-256-GCM Vote Encryption**: Votes encrypted before blockchain submission
- **Zero-Knowledge Proofs**: Ballot validity proven without content disclosure
- **Smart Contract Layer**: Four interconnected Solidity contracts (VoterRegistry, Ballot, TallyContract, AuditTrail)
- **Real-Time Tallying**: Automatic vote counting via smart contracts
- **Public Verification**: Any observer can verify votes via Merkle proofs
- **Immutable Audit Trail**: All events logged on-chain with timestamps

## Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, TypeScript
- **Backend**: Next.js API Routes, JWT authentication
- **Blockchain**: Solidity, Hardhat, Mock Blockchain Engine (for demo)
- **Cryptography**: SHA-256, AES-256-GCM, Merkle Trees, ZK-Proofs
- **Deployment**: Vercel (Serverless)

## Quick Start

### 1. Clone & Install

```bash
git clone <repo-url>
cd atc-blockchain-voting
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:
```
JWT_SECRET="your-super-secret-key"
NEXT_PUBLIC_MOCK_MODE="true"
ADMIN_USERNAME="soateco_admin"
ADMIN_PASSWORD="ATC_Secure2024!"
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Build for Production

```bash
npm run build
```

## Deploy to Vercel

### Option A: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

### Option B: GitHub Integration

1. Push code to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Add environment variables in Vercel Dashboard → Settings → Environment Variables
4. Deploy!

### Required Environment Variables on Vercel

| Variable | Value | Environment |
|----------|-------|-------------|
| `JWT_SECRET` | Random 32+ char string | Production |
| `NEXT_PUBLIC_MOCK_MODE` | `true` (for demo) | Production |
| `ADMIN_USERNAME` | `soateco_admin` | Production |
| `ADMIN_PASSWORD` | Strong password | Production |

## Demo Credentials

### Student Voter
- **Admission Number**: `23050513012`
- **OTP**: Sent to console (demo mode shows OTP)

### Admin
- **Username**: `soateco_admin`
- **Password**: `ATC_Secure2024!`

## Smart Contracts

The `/contracts` directory contains four Solidity contracts:

1. **VoterRegistry.sol** - Eligibility gatekeeper
2. **Ballot.sol** - Encrypted vote storage
3. **TallyContract.sol** - Real-time vote counting
4. **AuditTrail.sol** - Immutable event logging

### Compile Contracts

```bash
npx hardhat compile
```

### Deploy to Sepolia Testnet

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

## System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Presentation   │────▶│  Application    │────▶│   Blockchain    │
│   Layer (UI)    │     │    Layer (API)  │     │    Layer        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
   React.js SPA            Next.js API          Private Ethereum
   Tailwind CSS            JWT Auth             Smart Contracts
   OTP Flow               Vote Encryption      PoA Consensus
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/send-otp` | POST | Request OTP |
| `/api/auth/verify-otp` | POST | Verify OTP & get JWT |
| `/api/vote/submit` | POST | Submit encrypted vote |
| `/api/vote/verify` | GET | Verify vote on blockchain |
| `/api/candidates` | GET/POST | List/Register candidates |
| `/api/elections` | GET | Get active election |
| `/api/admin/stats` | GET | Dashboard statistics |
| `/api/admin/config` | POST | Admin login & config |

## Pages

| Route | Module | Description |
|-------|--------|-------------|
| `/` | Landing | System overview & features |
| `/voter` | Student Voter | Authentication → Ballot → Receipt |
| `/candidate` | Candidate Mgmt | Registration form |
| `/admin` | SOATECO Admin | Dashboard, stats, blockchain view |
| `/results` | Public Results | Live results + block explorer + verification |

## Research Context

This system implements the research proposal by **Goodluck Francis** (Admission: 23050513012) under supervision of **M/S Jane Lissah** at Arusha Technical College, Tanzania.

**Course**: Bachelor Degree in Computer Science (NTA Level 8), Evening

## License

MIT License - Arusha Technical College ICT Department

## Contact

- **Institution**: Arusha Technical College, Nairobi Road, P.O.Box 296, Arusha, Tanzania
- **Department**: Information and Communication Technology (ICT)
- **Website**: [ATC Official](https://www.atc.ac.tz)
