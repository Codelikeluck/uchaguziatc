import { NextResponse } from 'next/server';
import { blockchain } from '@/lib/mockBlockchain';

export async function GET() {
  try {
    const chain = await blockchain.getChain();
    return NextResponse.json({
      success: true,
      chain: chain.map(block => ({
        index: block.index,
        timestamp: block.timestamp,
        nonce: block.nonce,
        previousHash: block.previousHash,
        merkleRoot: block.merkleRoot,
        transactionCount: block.transactions.length,
        blockHash: block.blockHash,
      })),
      valid: await blockchain.validateChain(),
    });
  } catch (error) {
    console.error('Blocks fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
