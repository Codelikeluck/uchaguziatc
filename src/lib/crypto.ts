import { createHash, randomBytes, createCipheriv, randomInt } from 'crypto';

const AES_KEY_HEX = process.env.AES_KEY;
const AES_IV_HEX = process.env.AES_IV;

function getAesKey(): Buffer {
  const hex = AES_KEY_HEX;
  if (!hex || hex.length < 64) {
    if (!hex && process.env.NODE_ENV === 'production') {
      console.warn('AES_KEY not set — vote encryption uses dev fallback. Set AES_KEY (64 hex chars) in production.');
    }
    return Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
  }
  return Buffer.from(hex.slice(0, 64), 'hex');
}

export function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

export function generateOTP(): string {
  return String(randomInt(100000, 999999));
}

export function hashStudentId(admissionNumber: string): string {
  return sha256(admissionNumber + 'atc_salt_2024');
}

export function encryptVote(candidateId: string, voterSecret: string): { encrypted: string; ipfsHash: string } {
  const payload = JSON.stringify({ candidateId, timestamp: Date.now(), nonce: randomBytes(16).toString('hex') });
  const key = getAesKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(payload, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  const fullEncrypted = iv.toString('hex') + ':' + encrypted + ':' + authTag;
  const ipfsHash = sha256(fullEncrypted);
  return { encrypted: fullEncrypted, ipfsHash };
}

export function generateZKProof(voteData: string, candidateId: string): string {
  const proof = sha256(voteData + candidateId + 'zk_salt_atc');
  return '0x' + proof;
}

export function generateVoteHash(voterId: string, candidateId: string, timestamp: number): string {
  return sha256(voterId + candidateId + timestamp.toString() + randomBytes(8).toString('hex'));
}

export function generateMerkleRoot(votes: string[]): string {
  if (votes.length === 0) return sha256('empty');
  let layer = [...votes];
  while (layer.length > 1) {
    const nextLayer: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = layer[i + 1] || left;
      nextLayer.push(sha256(left + right));
    }
    layer = nextLayer;
  }
  return layer[0];
}

export function generateMerkleProof(votes: string[], targetIndex: number): string[] {
  const proof: string[] = [];
  let layer = [...votes];
  let index = targetIndex;

  while (layer.length > 1) {
    const nextLayer: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = layer[i + 1] || left;
      if (i === index || i + 1 === index) {
        const sibling = i === index ? (layer[i + 1] || left) : left;
        proof.push(sibling);
      }
      nextLayer.push(sha256(left + right));
    }
    layer = nextLayer;
    index = Math.floor(index / 2);
  }
  return proof;
}

export function verifyMerkleProof(root: string, target: string, proof: string[]): boolean {
  let hash = target;
  for (const sibling of proof) {
    hash = sha256(hash + sibling);
  }
  return hash === root;
}
