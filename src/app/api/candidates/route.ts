import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const position = searchParams.get('position');

    if (position) {
      const candidates = db.getCandidatesByPosition(position);
      return NextResponse.json({ success: true, candidates });
    }

    return NextResponse.json({ success: true, candidates: db.getAllCandidates() });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const candidate = {
      id: 'cand_' + uuidv4().slice(0, 8),
      ...data,
      status: 'pending',
      votes: 0,
    };
    db.addCandidate(candidate);
    return NextResponse.json({ success: true, candidate }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
