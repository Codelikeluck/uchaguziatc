import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { sha256 } from '@/lib/crypto';
import { blockchain } from '@/lib/mockBlockchain';

function checkAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  return db.verifyAdminSession(authHeader.split(' ')[1]);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const position = searchParams.get('position');
    const status = searchParams.get('status');

    let candidates = db.getAllCandidates();

    if (position) {
      candidates = candidates.filter(c => c.position === position);
    }
    if (status) {
      candidates = candidates.filter(c => c.status === status);
    }

    return NextResponse.json({ success: true, candidates });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (data.admissionNumber) {
      const existing = db.getStudentByAdmission(data.admissionNumber);
      if (existing) {
        data.studentId = existing.id;
      }
    }

    const candidate = {
      id: 'cand_' + uuidv4().slice(0, 8),
      ...data,
      documents: data.documents || [],
      status: data.status || 'pending',
      votes: data.votes || 0,
    };
    db.addCandidate(candidate);
    blockchain.logAuditEvent('CANDIDATE_REGISTERED', sha256(candidate.id), candidate.studentId || 'student');
    return NextResponse.json({ success: true, candidate }, { status: 201 });
  } catch (error) {
    console.error('Add candidate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!checkAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id, ...updates } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Candidate ID required' }, { status: 400 });
    }
    const candidate = db.updateCandidate(id, updates);
    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }
    blockchain.logAuditEvent('CANDIDATE_UPDATED', sha256(id), 'ADMIN');
    return NextResponse.json({ success: true, candidate });
  } catch (error) {
    console.error('Update candidate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!checkAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Candidate ID required' }, { status: 400 });
    }
    if (!db.deleteCandidate(id)) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }
    blockchain.logAuditEvent('CANDIDATE_DELETED', sha256(id), 'ADMIN');
    return NextResponse.json({ success: true, message: 'Candidate deleted' });
  } catch (error) {
    console.error('Delete candidate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
