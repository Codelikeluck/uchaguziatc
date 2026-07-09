import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sha256 } from '@/lib/crypto';
import { v4 as uuidv4 } from 'uuid';
import { blockchain } from '@/lib/mockBlockchain';

async function checkAdmin(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return (await db.verifyAdminSession(token)) ? token : null;
}

export async function POST(request: NextRequest) {
  try {
    const { action, username, password, token, electionData, candidateId } = await request.json();

    if (action === 'login') {
      const adminUser = process.env.ADMIN_USERNAME || 'soateco_admin';
      const adminPass = process.env.ADMIN_PASSWORD || 'ATC_Secure2024!';

      if (username === adminUser && password === adminPass) {
        const token = uuidv4();
        db.createAdminSession(token, username, 24);
        return NextResponse.json({ success: true, token });
      }
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (action === 'verify') {
      const valid = await db.verifyAdminSession(token);
      return NextResponse.json({ success: valid });
    }

    const adminToken = await checkAdmin(request);
    if (!adminToken) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    if (action === 'updateElection') {
      if (!electionData?.id) {
        return NextResponse.json({ error: 'Election ID required' }, { status: 400 });
      }
      const election = db.getElection(electionData.id);
      if (election) {
        db.updateElection(electionData.id, electionData);
        return NextResponse.json({ success: true, election: db.getElection(electionData.id) });
      }
      const newElection = { ...electionData, id: electionData.id || 'election_' + Date.now() };
      return NextResponse.json({ success: true, election: newElection });
    }

    if (action === 'deleteElection') {
      if (!electionData?.id) {
        return NextResponse.json({ error: 'Election ID required' }, { status: 400 });
      }
      if (!db.deleteElection(electionData.id)) {
        return NextResponse.json({ error: 'Election not found' }, { status: 404 });
      }
      blockchain.logAuditEvent('ELECTION_DELETED', sha256(electionData.id), 'ADMIN');
      return NextResponse.json({ success: true, message: 'Election deleted' });
    }

    if (action === 'approveCandidate') {
      if (!candidateId) {
        return NextResponse.json({ error: 'Candidate ID required' }, { status: 400 });
      }
      const candidate = db.updateCandidate(candidateId, { status: 'approved' });
      if (!candidate) {
        return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, candidate });
    }

    if (action === 'rejectCandidate') {
      if (!candidateId) {
        return NextResponse.json({ error: 'Candidate ID required' }, { status: 400 });
      }
      const candidate = db.updateCandidate(candidateId, { status: 'rejected' });
      if (!candidate) {
        return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, candidate });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Admin config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
