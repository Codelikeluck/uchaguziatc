import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateOTP, sha256 } from '@/lib/crypto';
import { blockchain } from '@/lib/mockBlockchain';
import { sendOTPEmail } from '@/lib/email';
import { kvSet, kvGet, kvDel } from '@/lib/kv';

export async function POST(request: NextRequest) {
  try {
    const { admissionNumber } = await request.json();

    if (!admissionNumber) {
      return NextResponse.json({ error: 'Admission number required' }, { status: 400 });
    }

    const student = db.getStudentByAdmission(admissionNumber);
    if (!student) {
      return NextResponse.json({
        error: 'Student not found. Please contact SOATECO admin to register.',
      }, { status: 404 });
    }

    if (student.hasVoted) {
      return NextResponse.json({
        error: 'You have already voted in this election.',
      }, { status: 403 });
    }

    const otp = generateOTP();

    const kvStored = await kvSet(`otp:${admissionNumber}`, { otp, studentId: student.id }, 600);
    if (kvStored) {
      await kvDel(`otp_inmem:${admissionNumber}`);
    } else {
      db.storeOTP(admissionNumber, otp, 10);
    }

    blockchain.logAuditEvent('OTP_REQUESTED', sha256(admissionNumber), 'SYSTEM');

    let emailSent = false;
    if (student.email) {
      emailSent = await sendOTPEmail(student.email, otp, student.name);
    }

    const hasSmsConfig = !!(process.env.AT_API_KEY && process.env.AT_USERNAME);

    if (process.env.NODE_ENV !== 'production' || !emailSent) {
      console.log(`[OTP] ${student.name} (${admissionNumber}): ${otp}`);
    }

    const deliveryMethod = emailSent ? 'email' : (hasSmsConfig ? 'sms' : 'console');

    const contactInfo: string[] = [];
    if (emailSent) contactInfo.push('email');

    return NextResponse.json({
      success: true,
      message: emailSent
        ? `OTP sent to ${student.email}`
        : `OTP generated. In production, this would be sent to your registered contact.`,
      deliveryMethod,
      demoOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
      studentName: student.name,
      contactMethods: contactInfo,
    });
  } catch (error) {
    console.error('OTP send error:', error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
