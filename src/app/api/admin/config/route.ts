import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sha256 } from '@/lib/crypto';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { action, username, password, token, electionData } = await request.json();

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
      const valid = db.verifyAdminSession(token);
      return NextResponse.json({ success: valid });
    }

    if (action === 'updateElection') {
      if (!db.verifyAdminSession(token)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const election = db.getElection(electionData.id);
      if (election) {
        db.updateElection(electionData.id, electionData);
        return NextResponse.json({ success: true, election: db.getElection(electionData.id) });
      }
      return NextResponse.json({ error: 'Election not found' }, { status: 404 });
    }

    if (action === 'approveCandidate') {
      if (!db.verifyAdminSession(token)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const candidate = db.updateCandidate(electionData.candidateId, { status: 'approved' });
      return NextResponse.json({ success: true, candidate });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
