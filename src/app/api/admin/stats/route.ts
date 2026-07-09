import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { blockchain } from '@/lib/mockBlockchain';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    if (!(await db.verifyAdminSession(token))) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const stats = await db.getStats();
    const chain = await blockchain.getChain();
    const auditEvents = await db.getAuditEvents();

    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        chainValid: await blockchain.validateChain(),
        chain,
        latestBlock: chain[chain.length - 1],
        contractAddresses: blockchain.getContractAddresses(),
        recentEvents: auditEvents.slice(-10).reverse(),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
