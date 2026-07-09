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

    const active = await db.getActiveElection();
    return NextResponse.json({ success: true, election: active });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
