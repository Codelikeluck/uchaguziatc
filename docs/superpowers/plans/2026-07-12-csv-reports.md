# CSV Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Reports tab to the Admin Dashboard that generates and downloads CSV reports for elections, voters, candidates, audit trail, and blockchain data.

**Architecture:** A single `GET /api/admin/reports?type={type}` endpoint (authenticated) queries the in-memory database and returns CSV text with proper headers. The admin page adds a new tab with report cards that trigger browser downloads via Blob + ObjectURL.

**Tech Stack:** Next.js 14 API routes, TypeScript, Lucide icons

**Design Spec:** `docs/superpowers/specs/2026-07-12-csv-reports-design.md`

## Global Constraints
- All API routes require `Authorization: Bearer {token}` header — reuse existing token from admin login state
- CSV must use `Content-Type: text/csv` and `Content-Disposition: attachment; filename=atc-report-{type}-{date}.csv`
- Admin token is stored in `localStorage` key `atc_admin_token` and state variable `token`
- Database access via `import { db } from '@/lib/db'` — all methods return Promises (async/await)
- Follow existing code patterns in admin page (tailwind classes, atc-* custom classes, lucide-react icons)
- No new npm dependencies

---

### Task 1: CSV Generation API Endpoint

**Files:**
- Create: `src/app/api/admin/reports/route.ts`
- Reference: `src/lib/db.ts` (db API), `src/types/index.ts` (type definitions)

**Interfaces:**
- Consumes: `db.getAllCandidates()`, `db.getAllStudents()`, `db.getAllVotes()`, `db.getAllBlocks()`, `db.getAuditEvents()`, `db.verifyAdminSession(token)` — all exist
- Produces: `GET /api/admin/reports?type={type}` endpoint returning CSV text

- [ ] **Step 1: Create the reports API route**

Create `src/app/api/admin/reports/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function escapeCSV(value: string | number | boolean | undefined | null): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

function rowsToCSV(headers: string[], rows: string[][]): string {
  const header = headers.map(h => escapeCSV(h)).join(',');
  const body = rows.map(row => row.map(cell => escapeCSV(cell)).join(','));
  return [header, ...body].join('\n');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const isValid = await db.verifyAdminSession(token);
  if (!isValid) {
    return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 });
  }

  let csv = '';
  let filename = '';

  switch (type) {
    case 'elections': {
      const candidates = await db.getAllCandidates();
      const elections = await db.getAllElections();
      const positions = [...new Set(candidates.map(c => c.position))];
      const headers = ['Position', 'Candidate Name', 'Running Mate', 'Votes', 'Percentage', 'Status'];
      const rows: string[][] = [];

      for (const position of positions) {
        const posCandidates = candidates.filter(c => c.position === position && c.status === 'approved');
        const totalVotes = posCandidates.reduce((sum, c) => sum + c.votes, 0);

        for (const candidate of posCandidates) {
          let runningMate = '';
          if (candidate.runningMateId) {
            const mate = candidates.find(c => c.id === candidate.runningMateId);
            if (mate) runningMate = mate.name;
          }
          const pct = totalVotes > 0 ? ((candidate.votes / totalVotes) * 100).toFixed(1) : '0.0';
          const maxVotes = Math.max(...posCandidates.map(c => c.votes));
          const isWinner = candidate.votes === maxVotes && maxVotes > 0;

          rows.push([
            position,
            candidate.name,
            runningMate,
            String(candidate.votes),
            pct,
            isWinner ? 'Won' : '—',
          ]);
        }
      }

      csv = rowsToCSV(headers, rows);
      filename = `atc-report-elections-${Date.now()}.csv`;
      break;
    }

    case 'voters': {
      const students = await db.getAllStudents();
      const headers = ['Admission Number', 'Full Name', 'Email', 'Department', 'Year of Study', 'Has Voted'];
      const rows = students.map(s => [
        s.admissionNumber,
        s.name,
        s.email,
        s.department,
        String(s.yearOfStudy),
        s.hasVoted ? 'Yes' : 'No',
      ]);
      csv = rowsToCSV(headers, rows);
      filename = `atc-report-voters-${Date.now()}.csv`;
      break;
    }

    case 'candidates': {
      const allCandidates = await db.getAllCandidates();
      const headers = ['Name', 'Position', 'GPA', 'Year of Study', 'Status', 'Votes', 'Running Mate'];
      const rows = await Promise.all(allCandidates.map(async (c) => {
        let runningMate = '';
        if (c.runningMateId) {
          const mate = allCandidates.find(m => m.id === c.runningMateId);
          if (mate) runningMate = mate.name;
        }
        return [
          c.name,
          c.position,
          String(c.gpa),
          String(c.yearOfStudy),
          c.status,
          String(c.votes),
          runningMate,
        ];
      }));
      csv = rowsToCSV(headers, rows);
      filename = `atc-report-candidates-${Date.now()}.csv`;
      break;
    }

    case 'audit': {
      const events = await db.getAuditEvents();
      const headers = ['Event ID', 'Event Type', 'Data Hash', 'Actor', 'Timestamp', 'Block Number'];
      const rows = events.map(e => [
        e.id,
        e.eventType,
        e.dataHash,
        e.actor,
        new Date(e.timestamp).toISOString(),
        String(e.blockNumber),
      ]);
      csv = rowsToCSV(headers, rows);
      filename = `atc-report-audit-${Date.now()}.csv`;
      break;
    }

    case 'blockchain': {
      const blocks = await db.getAllBlocks();
      const headers = ['Block Index', 'Timestamp', 'Nonce', 'Previous Hash', 'Merkle Root', 'Transactions', 'Gas Used', 'Block Hash'];
      const rows = blocks.map(b => [
        String(b.index),
        new Date(b.timestamp).toISOString(),
        String(b.nonce),
        b.previousHash,
        b.merkleRoot,
        String(b.transactions.length),
        String(b.gasUsed),
        b.blockHash,
      ]);
      csv = rowsToCSV(headers, rows);
      filename = `atc-report-blockchain-${Date.now()}.csv`;
      break;
    }

    default:
      return NextResponse.json({ success: false, error: `Unknown report type: ${type}` }, { status: 400 });
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
```

- [ ] **Step 2: Verify API route compiles**

Run `npx tsc --noEmit --pretty src/app/api/admin/reports/route.ts` and fix any type errors.

---

### Task 2: Reports Tab in Admin Dashboard

**Files:**
- Modify: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: Task 1's API `GET /api/admin/reports?type={type}` with `Authorization: Bearer {token}`
- Produces: Interactive Reports tab in admin dashboard

- [ ] **Step 1: Add `reports` to the activeTab type and tab bar**

In `src/app/admin/page.tsx`, find the `activeTab` state declaration (line 57):
```typescript
const [activeTab, setActiveTab] = useState<'overview' | 'elections' | 'candidates' | 'students' | 'admins' | 'blockchain' | 'audit'>('overview');
```
Change to:
```typescript
const [activeTab, setActiveTab] = useState<'overview' | 'elections' | 'candidates' | 'students' | 'admins' | 'blockchain' | 'audit' | 'reports'>('overview');
```

Find the navigation tabs section (around line 466-482) and add the Reports tab entry. Insert after the Audit entry:
```typescript
{ key: 'reports', icon: FileSpreadsheet, label: 'Reports' },
```

Add the import for `FileSpreadsheet` at the top with the other lucide imports (around line 10). It's likely already imported — check. If not, add `FileSpreadsheet` to the existing lucide import line.

- [ ] **Step 2: Add download helper function**

Add this function inside the `AdminPage` component (after the `logout` function, before the `vpCandidates` line):

```typescript
const downloadReport = async (type: string, label: string) => {
  setLoading(true);
  setError('');
  try {
    const res = await fetch(`/api/admin/reports?type=${type}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json();
      setError(err.error || 'Download failed');
      setLoading(false);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atc-report-${type}-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Download error:', e);
    setError('Network error');
  }
  setLoading(false);
};
```

- [ ] **Step 3: Add the Reports tab content**

Inside the admin page JSX, after the Audit tab section (or before the closing `</main>` tag), add:

```typescript
{activeTab === 'reports' && (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-bold text-slate-900">Download Reports</h2>
    </div>

    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Election Results */}
      <ReportCard
        icon={<BarChart3 className="w-8 h-8 text-atc-primary" />}
        title="Election Results"
        desc="Per-position breakdown with vote counts, percentages, and winners."
        onDownload={() => downloadReport('elections', 'Election Results')}
      />

      {/* Voters List */}
      <ReportCard
        icon={<Users className="w-8 h-8 text-atc-secondary" />}
        title="Voters List"
        desc="All registered students with admission numbers, departments, and voting status."
        onDownload={() => downloadReport('voters', 'Voters List')}
      />

      {/* Candidates */}
      <ReportCard
        icon={<GraduationCap className="w-8 h-8 text-atc-accent" />}
        title="Candidates"
        desc="All candidate registrations with positions, GPA, status, and vote counts."
        onDownload={() => downloadReport('candidates', 'Candidates')}
      />

      {/* Audit Trail */}
      <ReportCard
        icon={<Activity className="w-8 h-8 text-purple-600" />}
        title="Audit Trail"
        desc="System audit events with timestamps, actors, and block references."
        onDownload={() => downloadReport('audit', 'Audit Trail')}
      />

      {/* Blockchain */}
      <ReportCard
        icon={<Blocks className="w-8 h-8 text-cyan-600" />}
        title="Blockchain"
        desc="Full block list with hashes, nonces, Merkle roots, and transaction counts."
        onDownload={() => downloadReport('blockchain', 'Blockchain')}
      />
    </div>
  </div>
)}
```

- [ ] **Step 4: Add the ReportCard component**

Add this component after the `StatCard` component (find it near the bottom of the file or search for `function StatCard`):

```typescript
function ReportCard({ icon, title, desc, onDownload }: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onDownload: () => void;
}) {
  return (
    <div className="atc-card hover:shadow-xl transition-all duration-300">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 text-sm mb-6 leading-relaxed">{desc}</p>
      <button
        onClick={onDownload}
        className="atc-btn-primary text-sm py-2 px-4 inline-flex items-center gap-2 w-full justify-center"
      >
        <Download className="w-4 h-4" />
        Download CSV
      </button>
    </div>
  );
}
```

Add `Download` to the lucide-react import if not already there. Check the existing imports (around line 5-11). The current imports include: `ArrowLeft, Shield, Users, BarChart3, Blocks, AlertCircle, CheckCircle, Clock, Loader2, Lock, FileText, Activity, Plus, Trash2, Edit3, Image as ImageIcon, Mail, Phone, Search, Filter, Download, Upload, ChevronDown, ChevronUp, UserPlus, GraduationCap, Vote, Calendar, Settings, FileSpreadsheet`.

`Download` is already imported. `FileSpreadsheet` is already imported. `GraduationCap` is already imported. So no import changes needed.

---

### Task 3: Build Verification

- [ ] **Step 1: Type-check**

Run: `npx tsc --noEmit --pretty`
Expected: No type errors

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Add .env.local if missing**

If no `.env.local` exists:
```bash
cp .env.example .env.local
```

---

### Task 4: Commit and Push

- [ ] **Step 1: Stage and commit**

```bash
git add docs/superpowers/specs/2026-07-12-csv-reports-design.md
git add docs/superpowers/plans/2026-07-12-csv-reports.md
git add src/app/api/admin/reports/route.ts
git add src/app/admin/page.tsx
git commit -m "feat: admin CSV reports for elections, voters, candidates, audit, blockchain"
```

- [ ] **Step 2: Push**

```bash
git push origin main
```
