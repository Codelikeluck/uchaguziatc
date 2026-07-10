export interface Student {
  id: string;
  admissionNumber: string;
  name: string;
  email: string;
  department: string;
  yearOfStudy: number;
  hasVoted: boolean;
  walletAddress?: string;
  phone?: string;
}

export interface Candidate {
  id: string;
  studentId: string;
  name: string;
  position: string;
  manifesto: string;
  imageUrl?: string;
  documents: string[];
  gpa: number;
  yearOfStudy: number;
  status: 'pending' | 'approved' | 'rejected';
  votes: number;
  runningMateId?: string;
}

export interface Election {
  id: string;
  title: string;
  positions: Position[];
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'closed';
  totalVoters: number;
  totalVotes: number;
  updatedAt?: number;
}

export interface Position {
  id: string;
  title: string;
  description: string;
  candidates: Candidate[];
}

export interface Vote {
  voteHash: string;
  electionId: string;
  candidateId: string;
  runningMateId?: string;
  timestamp: number;
  blockIndex: number;
  merkleProof: string[];
  zkProof: string;
}

export interface Block {
  index: number;
  timestamp: number;
  nonce: number;
  previousHash: string;
  merkleRoot: string;
  transactions: Vote[];
  gasUsed: number;
  blockHash: string;
  smartContractRefs: string[];
}

export interface VoteReceipt {
  voteHash: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  verificationUrl: string;
}

export interface AuditEvent {
  id: string;
  eventType: string;
  dataHash: string;
  actor: string;
  timestamp: number;
  blockNumber: number;
}

export interface ElectionResult {
  position: string;
  candidates: {
    id: string;
    name: string;
    votes: number;
    percentage: number;
  }[];
}
