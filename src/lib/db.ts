import { Student, Candidate, Election, Vote, Block, AuditEvent } from '@/types';
import { sha256 } from './crypto';
import { saveData, loadData, loadDataSync } from './persist';
import { kvSet, kvGet, kvDel } from './kv';
import { neonAddStudent, neonDeleteStudent, neonDeleteStudents, neonUpdateStudent, neonAddCandidate as neonAddCandidateFn, neonDeleteCandidate as neonDeleteCandidateFn, neonUpdateCandidate as neonUpdateCandidateFn, neonSaveElection as neonSaveElectionFn, neonDeleteElection as neonDeleteElectionFn, neonAddVote as neonAddVoteFn, neonAddBlock as neonAddBlockFn } from './neon';

interface AdminAccount {
  id: string;
  username: string;
  passwordHash: string;
  role: 'superadmin' | 'admin';
  createdAt: number;
}

interface DbSnapshot {
  students: [string, Student][];
  candidates: [string, Candidate][];
  elections: [string, Election][];
  votes: [string, Vote][];
  blocks: Block[];
  auditEvents: AuditEvent[];
  otps: [string, { otp: string; expires: number }][];
  adminSessions: [string, { username: string }][];
  admins: [string, AdminAccount][];
}

class Database {
  private students: Map<string, Student> = new Map();
  private candidates: Map<string, Candidate> = new Map();
  private elections: Map<string, Election> = new Map();
  private votes: Map<string, Vote> = new Map();
  private blocks: Block[] = [];
  private auditEvents: AuditEvent[] = [];
  private otps: Map<string, { otp: string; expires: number }> = new Map();
  private adminSessions: Map<string, { username: string }> = new Map();
  private admins: Map<string, AdminAccount> = new Map();
  private persistQueue: Promise<void> = Promise.resolve();

  constructor() {
    const data = loadDataSync();
    if (data) {
      this.loadFromData(data);
    } else {
      this.seedData();
    }
    this.syncFromKV();
  }

  private loadFromData(data: Record<string, any>) {
    this.students = new Map(data.students || []);
    this.candidates = new Map(data.candidates || []);
    this.elections = new Map(data.elections || []);
    this.votes = new Map(data.votes || []);
    this.blocks = data.blocks || [];

    this.auditEvents = (data.auditEvents || []).filter((e: any) => {
      if (e.expires && Date.now() > e.expires) return false;
      return true;
    });

    this.otps = new Map((data.otps || []).filter(([, v]: any) => Date.now() <= v.expires));
    this.adminSessions = new Map(data.adminSessions || []);
    this.admins = new Map(data.admins || []);
  }

  private async syncFromKV(): Promise<void> {
    try {
      const data = await loadData();
      if (data) {
        this.loadFromData(data);
      } else if (this.students.size === 0) {
        this.seedData();
      }
    } catch (err) {
      console.error('KV sync failed (non-fatal):', err);
    }
  }

  private async persist(): Promise<void> {
    this.persistQueue = this.persistQueue.then(async () => {
      const snapshot: DbSnapshot = {
        students: Array.from(this.students.entries()),
        candidates: Array.from(this.candidates.entries()),
        elections: Array.from(this.elections.entries()),
        votes: Array.from(this.votes.entries()),
        blocks: this.blocks,
        auditEvents: this.auditEvents,
        otps: Array.from(this.otps.entries()),
        adminSessions: Array.from(this.adminSessions.entries()),
        admins: Array.from(this.admins.entries()),
      };
      await saveData(snapshot as any);
    });
    await this.persistQueue;
  }

  private seedData() {
    if (this.students.size > 0 || this.candidates.size > 0) return;

    const election: Election = {
      id: 'election_2024',
      title: 'SOATECO General Elections 2024',
      positions: [
        { id: 'pos_1', title: 'President', description: 'Head of SOATECO', candidates: [] },
        { id: 'pos_2', title: 'Vice President', description: 'Deputy head', candidates: [] },
        { id: 'pos_3', title: 'Secretary General', description: 'Administrative head', candidates: [] },
        { id: 'pos_4', title: 'Treasurer', description: 'Financial oversight', candidates: [] },
      ],
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
      status: 'active',
      totalVoters: 0,
      totalVotes: 0,
    };
    this.elections.set(election.id, election);

    const sampleStudents = [
      { id: 'stud_1', admissionNumber: '23050513012', name: 'Goodluck Francis', email: 'goodluck@atc.ac.tz', department: 'Computer Science', yearOfStudy: 4 },
      { id: 'stud_2', admissionNumber: '23050513013', name: 'Jane Lissah', email: 'jane@atc.ac.tz', department: 'ICT', yearOfStudy: 3 },
      { id: 'stud_3', admissionNumber: '23050513014', name: 'John Mushi', email: 'john@atc.ac.tz', department: 'Electrical', yearOfStudy: 2 },
      { id: 'stud_4', admissionNumber: '23050513015', name: 'Amina Juma', email: 'amina@atc.ac.tz', department: 'Civil Engineering', yearOfStudy: 4 },
    ];
    sampleStudents.forEach(s => this.students.set(s.id, { ...s, hasVoted: false }));

    const sampleCandidates = [
      { id: 'cand_1', studentId: 'stud_2', name: 'Jane Lissah', position: 'President', manifesto: 'Transparency and accountability for all students.', imageUrl: 'https://ui-avatars.com/api/?name=Jane+Lissah&background=1e40af&color=fff&size=200', documents: [], gpa: 3.9, yearOfStudy: 3, status: 'approved' as const, votes: 0 },
      { id: 'cand_2', studentId: 'stud_3', name: 'John Mushi', position: 'President', manifesto: 'Better facilities and academic support.', imageUrl: 'https://ui-avatars.com/api/?name=John+Mushi&background=059669&color=fff&size=200', documents: [], gpa: 3.5, yearOfStudy: 2, status: 'approved' as const, votes: 0 },
      { id: 'cand_3', studentId: 'stud_4', name: 'Amina Juma', position: 'Vice President', manifesto: 'Unity and diversity in student leadership.', imageUrl: 'https://ui-avatars.com/api/?name=Amina+Juma&background=d97706&color=fff&size=200', documents: [], gpa: 3.7, yearOfStudy: 4, status: 'approved' as const, votes: 0 },
    ];
    sampleCandidates.forEach(c => this.candidates.set(c.id, c));

    const defaultAdmin: AdminAccount = {
      id: 'admin_default',
      username: process.env.ADMIN_USERNAME || 'soateco_admin',
      passwordHash: sha256(process.env.ADMIN_PASSWORD || 'ATC_Secure2024!'),
      role: 'superadmin',
      createdAt: Date.now(),
    };
    this.admins.set(defaultAdmin.id, defaultAdmin);
    this.persist();
  }

  getStudentByAdmission(admissionNumber: string): Student | undefined {
    return Array.from(this.students.values()).find(s => s.admissionNumber === admissionNumber);
  }

  getStudent(id: string): Student | undefined {
    return this.students.get(id);
  }

  updateStudent(id: string, data: Partial<Student>): Student | undefined {
    const student = this.students.get(id);
    if (!student) return undefined;
    const updated = { ...student, ...data };
    this.students.set(id, updated);
    this.persist();
    if (process.env.DATABASE_URL) neonUpdateStudent(id, data);
    return updated;
  }

  addStudent(student: Student): Student {
    this.students.set(student.id, student);
    this.persist();
    if (process.env.DATABASE_URL) neonAddStudent(student);
    return student;
  }

  deleteStudent(id: string): boolean {
    const result = this.students.delete(id);
    if (result) {
      this.persist();
      if (process.env.DATABASE_URL) neonDeleteStudent(id);
    }
    return result;
  }

  getAllStudents(): Student[] {
    return Array.from(this.students.values());
  }

  addCandidate(candidate: Candidate): Candidate {
    this.candidates.set(candidate.id, candidate);
    this.persist();
    if (process.env.DATABASE_URL) neonAddCandidateFn(candidate);
    return candidate;
  }

  getCandidate(id: string): Candidate | undefined {
    return this.candidates.get(id);
  }

  getCandidatesByPosition(position: string): Candidate[] {
    return Array.from(this.candidates.values()).filter(c => c.position === position && c.status === 'approved');
  }

  getAllCandidates(): Candidate[] {
    return Array.from(this.candidates.values());
  }

  updateCandidate(id: string, data: Partial<Candidate>): Candidate | undefined {
    const candidate = this.candidates.get(id);
    if (!candidate) return undefined;
    const updated = { ...candidate, ...data };
    this.candidates.set(id, updated);
    this.persist();
    if (process.env.DATABASE_URL) neonUpdateCandidateFn(id, data);
    return updated;
  }

  deleteCandidate(id: string): boolean {
    const result = this.candidates.delete(id);
    if (result) {
      this.persist();
      if (process.env.DATABASE_URL) neonDeleteCandidateFn(id);
    }
    return result;
  }

  getElection(id: string): Election | undefined {
    return this.elections.get(id);
  }

  getActiveElection(): Election | undefined {
    return Array.from(this.elections.values()).find(e => e.status === 'active');
  }

  updateElection(id: string, data: Partial<Election>): Election | undefined {
    const election = this.elections.get(id);
    if (!election) return undefined;
    const updated = { ...election, ...data };
    this.elections.set(id, updated);
    this.persist();
    if (process.env.DATABASE_URL) neonSaveElectionFn(updated);
    return updated;
  }

  addElection(election: Election): Election {
    this.elections.set(election.id, election);
    this.persist();
    if (process.env.DATABASE_URL) neonSaveElectionFn(election);
    return election;
  }

  getAllElections(): Election[] {
    return Array.from(this.elections.values());
  }

  deleteElection(id: string): boolean {
    const result = this.elections.delete(id);
    if (result) {
      this.persist();
      if (process.env.DATABASE_URL) neonDeleteElectionFn(id);
    }
    return result;
  }

  getStudentsByDepartment(department: string): Student[] {
    return Array.from(this.students.values()).filter(s => s.department.toLowerCase() === department.toLowerCase());
  }

  getStudentsByYear(year: number): Student[] {
    return Array.from(this.students.values()).filter(s => s.yearOfStudy === year);
  }

  deleteStudents(ids: string[]): number {
    let count = 0;
    for (const id of ids) {
      if (this.students.delete(id)) count++;
    }
    if (count > 0) {
      this.persist();
      if (process.env.DATABASE_URL) neonDeleteStudents(ids);
    }
    return count;
  }

  addVote(vote: Vote): Vote {
    this.votes.set(vote.voteHash, vote);
    this.persist();
    if (process.env.DATABASE_URL) neonAddVoteFn(vote);
    return vote;
  }

  getVote(hash: string): Vote | undefined {
    return this.votes.get(hash);
  }

  getAllVotes(): Vote[] {
    return Array.from(this.votes.values());
  }

  addBlock(block: Block): Block {
    this.blocks.push(block);
    this.persist();
    if (process.env.DATABASE_URL) neonAddBlockFn(block);
    return block;
  }

  getLatestBlock(): Block | undefined {
    return this.blocks[this.blocks.length - 1];
  }

  getAllBlocks(): Block[] {
    return [...this.blocks];
  }

  getBlockByIndex(index: number): Block | undefined {
    return this.blocks[index];
  }

  storeOTP(identifier: string, otp: string, ttlMinutes: number = 10): void {
    this.otps.set(identifier, { otp, expires: Date.now() + ttlMinutes * 60000 });
    this.persist();
  }

  verifyOTP(identifier: string, otp: string): boolean {
    const record = this.otps.get(identifier);
    if (!record) return false;
    if (Date.now() > record.expires) {
      this.otps.delete(identifier);
      this.persist();
      return false;
    }
    const valid = record.otp === otp;
    if (valid) {
      this.otps.delete(identifier);
      this.persist();
    }
    return valid;
  }

  async createAdminSession(token: string, username: string): Promise<void> {
    this.adminSessions.set(token, { username });
    await kvSet(`session:${token}`, { username });
    await this.persist();
  }

  async deleteAdminSession(token: string): Promise<void> {
    this.adminSessions.delete(token);
    await kvDel(`session:${token}`);
    await this.persist();
  }

  async verifyAdminSession(token: string): Promise<boolean> {
    if (this.adminSessions.has(token)) return true;

    const kvSession = await kvGet<{ username: string }>(`session:${token}`);
    if (kvSession) {
      this.adminSessions.set(token, kvSession);
      return true;
    }

    const snapshot = await loadData();
    if (snapshot?.adminSessions) {
      const found = (snapshot.adminSessions as [string, { username: string }][]).find(([t]) => t === token);
      if (found) {
        this.adminSessions.set(token, found[1]);
        return true;
      }
    }
    return false;
  }

  verifyAdminLogin(username: string, password: string): AdminAccount | null {
    const admin = Array.from(this.admins.values()).find(a => a.username === username);
    if (!admin) return null;
    if (admin.passwordHash !== sha256(password)) return null;
    return admin;
  }

  addAdmin(admin: AdminAccount): void {
    this.admins.set(admin.id, admin);
    this.persist();
  }

  getAllAdmins(): AdminAccount[] {
    return Array.from(this.admins.values());
  }

  deleteAdmin(id: string): boolean {
    if (this.admins.get(id)?.role === 'superadmin') return false;
    const result = this.admins.delete(id);
    if (result) this.persist();
    return result;
  }

  addAuditEvent(event: AuditEvent): void {
    this.auditEvents.push(event);
    this.persist();
  }

  getAuditEvents(): AuditEvent[] {
    return [...this.auditEvents];
  }

  getAuditEventsByType(type: string): AuditEvent[] {
    return this.auditEvents.filter(e => e.eventType === type);
  }

  getStats() {
    const students = this.getAllStudents();
    const candidates = this.getAllCandidates();
    const votes = this.getAllVotes();
    const blocks = this.getAllBlocks();
    return {
      totalStudents: students.length,
      totalVoters: students.filter(s => s.hasVoted).length,
      totalCandidates: candidates.length,
      pendingCandidates: candidates.filter(c => c.status === 'pending').length,
      totalVotes: votes.length,
      totalBlocks: blocks.length,
      participationRate: students.length > 0 ? ((students.filter(s => s.hasVoted).length / students.length) * 100).toFixed(1) : '0',
    };
  }
}

const db = new Database();
export { db };
