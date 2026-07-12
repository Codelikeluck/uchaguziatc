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
