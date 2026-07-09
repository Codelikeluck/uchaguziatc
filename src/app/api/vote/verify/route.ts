import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { blockchain } from '@/lib/mockBlockchain';
import { verifyMerkleProof } from '@/lib/crypto';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const voteHash = searchParams.get('hash');

    if (!voteHash) {
      return NextResponse.json({ error: 'Vote hash required' }, { status: 400 });
    }

    const vote = db.getVote(voteHash);
    if (!vote) {
      return NextResponse.json({ error: 'Vote not found' }, { status: 404 });
    }

    const inclusion = blockchain.verifyVoteInclusion(voteHash);
    if (!inclusion) {
      return NextResponse.json({ error: 'Vote not found in blockchain' }, { status: 404 });
    }

    const block = db.getBlockByIndex(inclusion.blockIndex);
    if (!block) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    const merkleValid = verifyMerkleProof(block.merkleRoot, voteHash, inclusion.merkleProof);

    return NextResponse.json({
      success: true,
      verified: true,
      vote: {
        voteHash: vote.voteHash,
        electionId: vote.electionId,
        timestamp: vote.timestamp,
        blockNumber: inclusion.blockIndex,
        transactionHash: block.blockHash,
      },
      blockchain: {
        merkleRoot: block.merkleRoot,
        merkleProof: inclusion.merkleProof,
        merkleValid,
        previousHash: block.previousHash,
        blockHash: block.blockHash,
      },
      message: merkleValid ? 'Vote cryptographically verified on blockchain' : 'Verification failed',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
