# CSV Report Downloads — Admin Feature

**Date**: 2026-07-12
**Project**: ATC Blockchain Voting System (uchaguziatc)
**Status**: Approved

## Overview

Add a Reports tab to the SOATECO Admin Dashboard that allows the admin to generate and download election-related data as CSV files. This is a read-only export feature — no data mutation.

## Report Types

### 1. Election Results (`elections`)
Per-position breakdown of vote counts with percentages and winner declaration.

| Column | Source |
|--------|--------|
| Position | Candidate.position |
| Candidate Name | Candidate.name |
| Running Mate | Candidate runningMateId → lookup |
| Votes | Candidate.votes |
| Percentage | (candidate.votes / totalVotesForPosition) × 100 |
| Status | "Won" if highest votes in position + election closed, else "—" |

### 2. Voters List (`voters`)
All registered students with their voting status.

| Column | Source |
|--------|--------|
| Admission Number | Student.admissionNumber |
| Full Name | Student.name |
| Email | Student.email |
| Department | Student.department |
| Year of Study | Student.yearOfStudy |
| Has Voted | Student.hasVoted → "Yes" / "No" |

### 3. Candidates (`candidates`)
All candidate registrations and their status.

| Column | Source |
|--------|--------|
| Name | Candidate.name |
| Position | Candidate.position |
| GPA | Candidate.gpa |
| Year of Study | Candidate.yearOfStudy |
| Status | Candidate.status |
| Votes | Candidate.votes |
| Running Mate | Candidate.runningMateId → lookup |

### 4. Audit Trail (`audit`)
All system audit events.

| Column | Source |
|--------|--------|
| Event ID | AuditEvent.id |
| Event Type | AuditEvent.eventType |
| Data Hash | AuditEvent.dataHash |
| Actor | AuditEvent.actor |
| Timestamp | ISO date string from AuditEvent.timestamp |
| Block Number | AuditEvent.blockNumber |

### 5. Blockchain (`blockchain`)
All blocks in the chain.

| Column | Source |
|--------|--------|
| Block Index | Block.index |
| Timestamp | ISO date string |
| Nonce | Block.nonce |
| Previous Hash | Block.previousHash |
| Merkle Root | Block.merkleRoot |
| Transactions | Block.transactions.length |
| Gas Used | Block.gasUsed |
| Block Hash | Block.blockHash |

## API Design

### `GET /api/admin/reports?type={type}`

- **Auth**: Requires `Authorization: Bearer {token}` header
- **Response headers**:
  - `Content-Type: text/csv`
  - `Content-Disposition: attachment; filename="atc-report-{type}-{date}.csv"`
- **Response body**: Raw CSV text
- **Error**: Returns JSON `{ success: false, error: "..." }` if unauthorized or invalid type

### CSV Format Rules
- Header row with column names
- Quoted fields (double-quote escape) where values contain commas or quotes
- ISO 8601 timestamps for all date fields
- UTF-8 encoding

## Frontend — Admin Dashboard

### New "Reports" Tab
Add a `reports` entry to the tab bar alongside existing tabs (Overview, Elections, Candidates, Students, Admins, Blockchain, Audit).

### Report Cards Grid
Each report type rendered as a card with:
- Icon (relevant Lucide icon)
- Report name + description
- "Download CSV" button

On click:
1. Show loading state on the button
2. Fetch `/api/admin/reports?type={type}` with auth token
3. Create a Blob from the CSV text
4. Trigger browser download via `URL.createObjectURL` + temporary `<a>` click
5. Revoke object URL
6. Reset button state

## Files Changed

| File | Change |
|------|--------|
| `src/app/api/admin/reports/route.ts` | **New** — CSV generation endpoint |
| `src/app/admin/page.tsx` | **Modify** — Add Reports tab with download UI |

## Out of Scope
- PDF reports (CSV only)
- Scheduled/email report delivery
- Report preview before download
- Custom column selection
- Date range filtering
