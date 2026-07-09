import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashStudentId } from '@/lib/crypto';
import { SignJWT } from 'jose';
import { blockchain } from '@/lib/mockBlockchain';
import { kvGet, kvDel } from '@/lib/kv';

function getJwtSecret(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export async function POST(request: NextRequest) {
  try {
    const { admissionNumber, otp } = await request.json();

    if (!admissionNumber || !otp) {
      return NextResponse.json({ error: 'Admission number and OTP required' }, { status: 400 });
    }

    let valid = false;

    const kvRecord = await kvGet<{ otp: string; studentId: string }>(`otp:${admissionNumber}`);
    if (kvRecord && kvRecord.otp === otp) {
      valid = true;
      await kvDel(`otp:${admissionNumber}`);
    }

    if (!valid) {
      valid = db.verifyOTP(admissionNumber, otp);
    }

    if (!valid) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 401 });
    }

    const student = db.getStudentByAdmission(admissionNumber);
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const secret = getJwtSecret();
    if (!secret) {
      return NextResponse.json({ error: 'Server misconfigured: JWT_SECRET not set' }, { status: 500 });
    }

    const token = await new SignJWT({
      sub: student.id,
      admissionNumber: student.admissionNumber,
      name: student.name,
      role: 'voter',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(secret);

    blockchain.logAuditEvent('VOTER_AUTHENTICATED', hashStudentId(admissionNumber), student.id);

    return NextResponse.json({
      success: true,
      token,
      student: {
        id: student.id,
        name: student.name,
        admissionNumber: student.admissionNumber,
        department: student.department,
        hasVoted: student.hasVoted,
      },
    });
  } catch (error) {
    console.error('OTP verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
