import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { sha256 } from '@/lib/crypto';
import { blockchain } from '@/lib/mockBlockchain';
import * as XLSX from 'xlsx';

function getToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.split(' ')[1];
  return null;
}

function parseExcel(buffer: Buffer): any[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, any>[];

  const fieldMap: Record<string, string> = {
    'admission': 'admissionNumber',
    'admission number': 'admissionNumber',
    'adm no': 'admissionNumber',
    'name': 'name',
    'full name': 'name',
    'student name': 'name',
    'email': 'email',
    'e-mail': 'email',
    'department': 'department',
    'dept': 'department',
    'year': 'yearOfStudy',
    'year of study': 'yearOfStudy',
    'phone': 'phone',
    'phone number': 'phone',
    'tel': 'phone',
    'mobile': 'phone',
  };

  return rows.map((row) => {
    const mapped: Record<string, any> = {};
    for (const [key, val] of Object.entries(row)) {
      const normalized = fieldMap[key.toLowerCase().trim()] || key;
      if (normalized === 'yearOfStudy' || normalized === 'year') {
        mapped['yearOfStudy'] = parseInt(String(val), 10) || 1;
      } else {
        mapped[normalized] = String(val).trim();
      }
    }
    return mapped;
  });
}

function parseCsvText(text: string): any[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const fieldMap: Record<string, string> = {
    'admission': 'admissionNumber',
    'admission number': 'admissionNumber',
    'adm no': 'admissionNumber',
    'name': 'name',
    'full name': 'name',
    'student name': 'name',
    'email': 'email',
    'e-mail': 'email',
    'department': 'department',
    'dept': 'department',
    'year': 'yearOfStudy',
    'year of study': 'yearOfStudy',
    'phone': 'phone',
    'phone number': 'phone',
    'tel': 'phone',
    'mobile': 'phone',
  };

  return lines.slice(1).map((line) => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, any> = {};
    headers.forEach((h, i) => {
      const key = fieldMap[h] || h;
      let val: any = values[i] || '';
      if (key === 'yearOfStudy') val = parseInt(val, 10) || 1;
      row[key] = val;
    });
    return row;
  });
}

export async function POST(request: NextRequest) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!db.verifyAdminSession(token)) {
      return NextResponse.json({ error: 'Invalid session. Please log out and log in again.' }, { status: 401 });
    }

    let students: any[] = [];
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      if (file.name.endsWith('.csv')) {
        students = parseCsvText(buffer.toString('utf-8'));
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        students = parseExcel(buffer);
      } else {
        return NextResponse.json({
          error: 'Unsupported file format. Please upload a .csv, .xlsx, or .xls file.',
        }, { status: 400 });
      }

      if (students.length === 0) {
        return NextResponse.json({ error: 'No valid student records found in file' }, { status: 400 });
      }
    } else {
      const body = await request.json();
      students = body.students;
      if (!Array.isArray(students) || students.length === 0) {
        return NextResponse.json({ error: 'Invalid student data' }, { status: 400 });
      }
    }

    const added: any[] = [];
    const errors: string[] = [];

    for (const studentData of students) {
      if (!studentData.admissionNumber) {
        errors.push(`Missing admission number for entry: ${studentData.name || 'unknown'}`);
        continue;
      }

      const existing = db.getStudentByAdmission(studentData.admissionNumber);
      if (existing) {
        errors.push(`Duplicate admission: ${studentData.admissionNumber}`);
        continue;
      }

      const student: any = {
        id: 'stud_' + uuidv4().slice(0, 8),
        admissionNumber: String(studentData.admissionNumber),
        name: studentData.name || 'Unknown',
        email: studentData.email || '',
        department: studentData.department || 'General',
        yearOfStudy: studentData.yearOfStudy || 1,
        phone: studentData.phone || '',
        hasVoted: false,
        walletAddress: '0x' + sha256(String(studentData.admissionNumber)).slice(0, 40),
      };

      db.addStudent(student);
      added.push(student);
    }

    blockchain.logAuditEvent('BULK_STUDENTS_ADDED', sha256(added.length.toString()), 'ADMIN');

    return NextResponse.json({
      success: true,
      added: added.length,
      errors: errors.length > 0 ? errors : undefined,
      students: added,
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    return NextResponse.json({ error: 'Failed to process upload' }, { status: 500 });
  }
}
