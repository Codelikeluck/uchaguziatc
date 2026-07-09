import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sha256 } from '@/lib/crypto';
import { blockchain } from '@/lib/mockBlockchain';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    if (!db.verifyAdminSession(token)) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { ids, department, yearOfStudy } = await request.json();

    let toDelete: string[] = [];

    if (Array.isArray(ids) && ids.length > 0) {
      toDelete = ids;
    } else if (department || yearOfStudy) {
      const all = db.getAllStudents();
      toDelete = all
        .filter(s => {
          if (department && s.department.toLowerCase() !== department.toLowerCase()) return false;
          if (yearOfStudy && s.yearOfStudy !== yearOfStudy) return false;
          return true;
        })
        .map(s => s.id);
    } else {
      return NextResponse.json({ error: 'Provide ids array or filter criteria (department, yearOfStudy)' }, { status: 400 });
    }

    if (toDelete.length === 0) {
      return NextResponse.json({ error: 'No students match the criteria' }, { status: 404 });
    }

    const deleted = db.deleteStudents(toDelete);
    blockchain.logAuditEvent('BULK_STUDENTS_DELETED', sha256(deleted.toString()), 'ADMIN');

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error('Bulk delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
