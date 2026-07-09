import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const election = await db.getElection(id);
      if (!election) {
        return NextResponse.json({ error: 'Election not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, election });
    }

    const all = await db.getAllElections();
    const latest = all.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];
    return NextResponse.json({ success: true, election: latest || null });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
