import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { neonInitTables, neonLoadSnapshot, neonSaveSnapshot } from '@/lib/neon';
import { getPool } from '@/lib/neon';

export async function GET() {
  const diagnostics: Record<string, any> = {
    timestamp: Date.now(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      KV_URL: process.env.KV_URL ? 'SET' : 'NOT SET',
      KV_REST_API_URL: process.env.KV_REST_API_URL ? 'SET' : 'NOT SET',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
      AES_KEY: process.env.AES_KEY?.length + ' chars' || 'NOT SET',
    },
    inMemory: {
      students: (await db.getAllStudents()).length,
      candidates: (await db.getAllCandidates()).length,
      elections: (await db.getAllElections()).length,
      admins: (await db.getAllAdmins()).map(a => a.username),
      adminSessions: 0, // filled below
      blocks: (await db.getAllBlocks()).length,
    },
    neon: {},
    kv: {},
    file: {},
  };

  // Count admin sessions
  const admins = (db as any).adminSessions;
  diagnostics.inMemory.adminSessions = admins instanceof Map ? admins.size : 'unknown';

  // Neon diagnostics
  try {
    const pool = getPool();
    diagnostics.neon.poolAvailable = !!pool;

    if (pool) {
      const tables = ['students', 'candidates', 'elections', 'votes', 'blocks', 'admins', 'snapshots', 'admin_sessions', 'otps', 'audit_events'];
      for (const table of tables) {
        try {
          const { rows } = await pool.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
          diagnostics.neon[`table_${table}`] = { exists: true, rows: rows[0]?.count || 0 };
        } catch {
          diagnostics.neon[`table_${table}`] = { exists: false, error: 'table not found or query failed' };
        }
      }

      // Test snapshot read
      try {
        const snapshotData = await neonLoadSnapshot();
        if (snapshotData) {
          diagnostics.neon.snapshotLoad = {
            success: true,
            hasStudents: Array.isArray(snapshotData.students),
            studentCount: snapshotData.students?.length || 0,
            hasCandidates: Array.isArray(snapshotData.candidates),
            candidateCount: snapshotData.candidates?.length || 0,
            hasAdminSessions: Array.isArray(snapshotData.adminSessions),
            adminSessionCount: snapshotData.adminSessions?.length || 0,
          };
        } else {
          diagnostics.neon.snapshotLoad = { success: false, data: null };
        }
      } catch (err: any) {
        diagnostics.neon.snapshotLoad = { success: false, error: err?.message || String(err) };
      }

      // Test snapshot write
      try {
        const writeOk = await neonSaveSnapshot({ test: true, timestamp: Date.now() });
        diagnostics.neon.snapshotWrite = { success: writeOk };
      } catch (err: any) {
        diagnostics.neon.snapshotWrite = { success: false, error: err?.message || String(err) };
      }
    }
  } catch (err: any) {
    diagnostics.neon.error = err?.message || String(err);
  }

  return NextResponse.json(diagnostics);
}
