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
    const { action, username, password, token, electionData, candidateId, newAdmin } = await request.json();

    if (action === 'login') {
      const admin = db.verifyAdminLogin(username, password);
      if (admin) {
        const sessionToken = uuidv4();
        await db.createAdminSession(sessionToken, username);
        return NextResponse.json({ success: true, token: sessionToken, admin: { id: admin.id, username: admin.username, role: admin.role } });
      }
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (action === 'verify') {
      const valid = await db.verifyAdminSession(token);
      return NextResponse.json({ success: valid });
    }

    if (action === 'logout') {
      if (token) await db.deleteAdminSession(token);
      return NextResponse.json({ success: true });
    }

    const adminToken = await checkAdmin(request);
    if (!adminToken) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    if (action === 'addAdmin') {
      if (!newAdmin?.username || !newAdmin?.password) {
        return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
      }
      const existing = Array.from(db.getAllAdmins()).find(a => a.username === newAdmin.username);
      if (existing) {
        return NextResponse.json({ error: 'Admin already exists' }, { status: 409 });
      }
      const admin = {
        id: 'admin_' + uuidv4().slice(0, 8),
        username: newAdmin.username,
        passwordHash: sha256(newAdmin.password),
        role: 'admin' as const,
        createdAt: Date.now(),
      };
      db.addAdmin(admin);
      blockchain.logAuditEvent('ADMIN_ADDED', sha256(admin.id), 'ADMIN');
      return NextResponse.json({ success: true, admin: { id: admin.id, username: admin.username, role: admin.role } });
    }

    if (action === 'deleteAdmin') {
      if (!newAdmin?.id) {
        return NextResponse.json({ error: 'Admin ID required' }, { status: 400 });
      }
      if (!db.deleteAdmin(newAdmin.id)) {
        return NextResponse.json({ error: 'Cannot delete superadmin or admin not found' }, { status: 400 });
      }
      blockchain.logAuditEvent('ADMIN_DELETED', sha256(newAdmin.id), 'ADMIN');
      return NextResponse.json({ success: true });
    }

    if (action === 'listAdmins') {
      const admins = db.getAllAdmins().map(a => ({ id: a.id, username: a.username, role: a.role, createdAt: a.createdAt }));
      return NextResponse.json({ success: true, admins });
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
