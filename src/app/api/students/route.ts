import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { sha256 } from '@/lib/crypto';
import { blockchain } from '@/lib/mockBlockchain';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const department = searchParams.get('department');
    const year = searchParams.get('year');

    let students = await db.getAllStudents();

    if (id) {
      const student = await db.getStudent(id);
      return student 
        ? NextResponse.json({ success: true, student })
        : NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (department) {
      students = students.filter(s => s.department.toLowerCase() === department.toLowerCase());
    }

    if (year) {
      students = students.filter(s => s.yearOfStudy === parseInt(year));
    }

    return NextResponse.json({ success: true, students, count: students.length });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    if (!(await db.verifyAdminSession(token))) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const data = await request.json();

    const existing = await db.getStudentByAdmission(data.admissionNumber);
    if (existing) {
      return NextResponse.json({ error: 'Student with this admission number already exists' }, { status: 409 });
    }

    const student: any = {
      id: 'stud_' + uuidv4().slice(0, 8),
      ...data,
      hasVoted: false,
      walletAddress: '0x' + sha256(data.admissionNumber).slice(0, 40),
    };

    await db.addStudent(student);
    await blockchain.logAuditEvent('STUDENT_REGISTERED', sha256(student.id), 'ADMIN');

    return NextResponse.json({ success: true, student }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    if (!(await db.verifyAdminSession(token))) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { id, ...updates } = await request.json();
    const student = await db.updateStudent(id, updates);

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    await blockchain.logAuditEvent('STUDENT_UPDATED', sha256(id), 'ADMIN');
    return NextResponse.json({ success: true, student });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    if (!(await db.verifyAdminSession(token))) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Student ID required' }, { status: 400 });
    }

    const deleted = await db.deleteStudent(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    await blockchain.logAuditEvent('STUDENT_DELETED', sha256(id), 'ADMIN');

    return NextResponse.json({ success: true, message: 'Student removed' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
