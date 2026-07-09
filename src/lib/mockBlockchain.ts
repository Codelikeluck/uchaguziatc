import { Block, Vote, AuditEvent } from '@/types';
import { sha256, generateMerkleRoot, generateMerkleProof } from './crypto';
import { db } from './db';

export class MockBlockchain {
  private chain: Block[] = [];
  private difficulty = 2;
  private genesisCreated = false;
  private contractAddresses = {
    voterRegistry: '0xVR' + sha256('voter_registry').slice(0, 38),
    ballot: '0xBA' + sha256('ballot').slice(0, 38),
    tallyContract: '0xTA' + sha256('tally').slice(0, 38),
    auditTrail: '0xAU' + sha256('audit').slice(0, 38),
  };

  constructor() {}

  private async ensureGenesis(): Promise<void> {
    if (this.genesisCreated) return;
    this.genesisCreated = true;
    const genesis: Block = {
      index: 0,
      timestamp: Date.now(),
      nonce: 0,
      previousHash: '0'.repeat(64),
      merkleRoot: sha256('genesis_atc_voting'),
      transactions: [],
      gasUsed: 0,
      blockHash: '',
      smartContractRefs: Object.values(this.contractAddresses),
    };
    genesis.blockHash = this.calculateBlockHash(genesis);
    this.chain.push(genesis);
    await db.addBlock(genesis);
  }

  private calculateBlockHash(block: Omit<Block, 'blockHash'>): string {
    const data = block.index + block.timestamp + block.nonce + block.previousHash + block.merkleRoot + JSON.stringify(block.transactions);
    return sha256(data);
  }

  private mineBlock(block: Omit<Block, 'blockHash'>): Block {
    let nonce = 0;
    let hash = '';
    const target = '0'.repeat(this.difficulty);

    while (true) {
      const data = block.index + block.timestamp + nonce + block.previousHash + block.merkleRoot + JSON.stringify(block.transactions);
      hash = sha256(data);
      if (hash.startsWith(target)) break;
      nonce++;
    }

    return {
      ...block,
      nonce,
      blockHash: hash,
    };
  }

  async addVoteTransaction(vote: Vote): Promise<Block> {
    await this.ensureGenesis();
    const latestBlock = this.getLatestBlockUnsafe();
    const previousHash = latestBlock ? latestBlock.blockHash : '0'.repeat(64);
    const index = latestBlock ? latestBlock.index + 1 : 1;

    const voteHashes = latestBlock ? latestBlock.transactions.map(t => t.voteHash) : [];
    voteHashes.push(vote.voteHash);
    const merkleRoot = generateMerkleRoot(voteHashes);

    const newBlockData: Omit<Block, 'blockHash'> = {
      index,
      timestamp: Date.now(),
      nonce: 0,
      previousHash,
      merkleRoot,
      transactions: latestBlock ? [...latestBlock.transactions, vote] : [vote],
      gasUsed: 21000 + ((latestBlock ? latestBlock.transactions.length + 1 : 1) * 1000),
      smartContractRefs: Object.values(this.contractAddresses),
    };

    const newBlock = this.mineBlock(newBlockData);
    this.chain.push(newBlock);
    await db.addBlock(newBlock);

    this.logAuditEvent('VOTE_CAST', vote.voteHash, '0xVOTER' + vote.voteHash.slice(0, 34));

    return newBlock;
  }

  private getLatestBlockUnsafe(): Block | undefined {
    return this.chain[this.chain.length - 1];
  }

  async getLatestBlock(): Promise<Block | undefined> {
    await this.ensureGenesis();
    return this.chain[this.chain.length - 1];
  }

  async getChain(): Promise<Block[]> {
    await this.ensureGenesis();
    return [...this.chain];
  }

  async validateChain(): Promise<boolean> {
    await this.ensureGenesis();
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];

      if (current.previousHash !== previous.blockHash) return false;
      if (current.blockHash !== this.calculateBlockHash(current)) return false;
      if (!current.blockHash.startsWith('0'.repeat(this.difficulty))) return false;
    }
    return true;
  }

  async verifyVoteInclusion(voteHash: string): Promise<{ included: boolean; blockIndex: number; merkleProof: string[] } | null> {
    await this.ensureGenesis();
    for (const block of this.chain) {
      const index = block.transactions.findIndex(t => t.voteHash === voteHash);
      if (index !== -1) {
        const voteHashes = block.transactions.map(t => t.voteHash);
        const proof = generateMerkleProof(voteHashes, index);
        return { included: true, blockIndex: block.index, merkleProof: proof };
      }
    }
    return null;
  }

  async logAuditEvent(eventType: string, dataHash: string, actor: string): Promise<void> {
    await this.ensureGenesis();
    const event: AuditEvent = {
      id: sha256(eventType + dataHash + Date.now().toString()),
      eventType,
      dataHash,
      actor,
      timestamp: Date.now(),
      blockNumber: this.chain.length > 0 ? this.chain[this.chain.length - 1].index : 0,
    };
    await db.addAuditEvent(event);
  }

  getContractAddresses() {
    return this.contractAddresses;
  }
}

export const blockchain = new MockBlockchain();
