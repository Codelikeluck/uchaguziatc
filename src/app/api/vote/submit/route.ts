import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { blockchain } from '@/lib/mockBlockchain';
import { encryptVote, generateZKProof, generateVoteHash, sha256 } from '@/lib/crypto';
import { jwtVerify } from 'jose';

function getJwtSecret(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const secret = getJwtSecret();
    if (!secret) {
      return NextResponse.json({ error: 'Server misconfigured: JWT_SECRET not set' }, { status: 500 });
    }
    const { payload } = await jwtVerify(token, secret, { clockTolerance: 60 });
    const studentId = payload.sub as string;

    const student = db.getStudent(studentId);
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (student.hasVoted) {
      return NextResponse.json({ error: 'Already voted' }, { status: 403 });
    }

    const { candidateId, electionId } = await request.json();
    if (!candidateId || !electionId) {
      return NextResponse.json({ error: 'Candidate and election required' }, { status: 400 });
    }

    const candidate = db.getCandidate(candidateId);
    if (!candidate || candidate.status !== 'approved') {
      return NextResponse.json({ error: 'Invalid candidate' }, { status: 400 });
    }

    const election = db.getElection(electionId);
    if (!election || election.status !== 'active') {
      return NextResponse.json({ error: 'Election not active' }, { status: 400 });
    }

    const timestamp = Date.now();
    const voteHash = generateVoteHash(studentId, candidateId, timestamp);
    const voterSecret = sha256(student.admissionNumber + timestamp.toString());
    const { encrypted, ipfsHash } = encryptVote(candidateId, voterSecret);
    const zkProof = generateZKProof(encrypted, candidateId);

    const vote = {
      voteHash,
      electionId,
      candidateId,
      timestamp,
      blockIndex: blockchain.getLatestBlock()!.index + 1,
      merkleProof: [],
      zkProof,
    };

    const block = blockchain.addVoteTransaction(vote);
    db.addVote(vote);
    db.updateStudent(studentId, { hasVoted: true });
    db.updateCandidate(candidateId, { votes: candidate.votes + 1 });

    const electionUpdated = db.getElection(electionId);
    if (electionUpdated) {
      db.updateElection(electionId, { 
        totalVotes: electionUpdated.totalVotes + 1,
        totalVoters: db.getAllStudents().length 
      });
    }

    return NextResponse.json({
      success: true,
      receipt: {
        voteHash,
        transactionHash: block.blockHash,
        blockNumber: block.index,
        timestamp,
        verificationUrl: `/results?verify=${voteHash}`,
      },
      message: 'Vote recorded on blockchain successfully',
    });
  } catch (error) {
    console.error('Vote error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
