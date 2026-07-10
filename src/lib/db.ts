import { Student, Candidate, Election, Vote, Block, AuditEvent } from '@/types';
import { sha256 } from './crypto';
import { saveData, loadData } from './persist';
import { kvSet, kvGet, kvDel } from './kv';
import { neonAddStudent, neonDeleteStudent, neonDeleteStudents, neonUpdateStudent, neonAddCandidate as neonAddCandidateFn, neonDeleteCandidate as neonDeleteCandidateFn, neonUpdateCandidate as neonUpdateCandidateFn, neonSaveElection as neonSaveElectionFn, neonDeleteElection as neonDeleteElectionFn, neonAddVote as neonAddVoteFn, neonAddBlock as neonAddBlockFn, neonAddAdmin as neonAddAdminFn, neonDeleteAdmin as neonDeleteAdminFn } from './neon';

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

  private initPromise: Promise<void>;
  private initialized = false;

  constructor() {
    this.initPromise = this._init();
  }

  private async _init(): Promise<void> {
    try {
      const data = await loadData();
      if (data) {
        console.log(`_init: loaded ${data.students?.length || 0} students, ${data.candidates?.length || 0} candidates`);
        this.loadFromData(data);
      }
    } catch (err) {
      console.error('_init failed:', err);
    }
    if (this.students.size === 0) {
      console.log('_init: no data found, seeding');
      await this.seedData();
    }
    this.initialized = true;
    console.log('_init: complete');
  }

  private async ensureInit(): Promise<void> {
    if (!this.initialized) await this.initPromise;
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

  private async seedData() {
    if (this.students.size > 0 || this.candidates.size > 0) return;
    if (this.elections.size > 0) return;

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
      updatedAt: 0,
    };
    this.elections.set(election.id, election);

    const sampleStudents = [
      { id: 'stud_1', admissionNumber: '23050513012', name: 'Goodluck Francis', email: 'goodluck@atc.ac.tz', department: 'Computer Science', yearOfStudy: 4 },
      { id: 'stud_2', admissionNumber: '23050513013', name: 'Jane Lissah', email: 'jane@atc.ac.tz', department: 'ICT', yearOfStudy: 3 },
      { id: 'stud_3', admissionNumber: '23050513014', name: 'John Mushi', email: 'john@atc.ac.tz', department: 'Electrical', yearOfStudy: 2 },
      { id: 'stud_4', admissionNumber: '23050513015', name: 'Amina Juma', email: 'amina@atc.ac.tz', department: 'Civil Engineering', yearOfStudy: 4 },
      { id: 'stud_5', admissionNumber: '23050513016', name: 'Sarah Kiwango', email: 'sarah@atc.ac.tz', department: 'ICT', yearOfStudy: 3 },
    ];
    sampleStudents.forEach(s => this.students.set(s.id, { ...s, hasVoted: false }));

    const sampleCandidates = [
      { id: 'cand_1', studentId: 'stud_2', name: 'Jane Lissah', position: 'President', manifesto: 'Transparency and accountability for all students.', imageUrl: 'https://ui-avatars.com/api/?name=Jane+Lissah&background=1e40af&color=fff&size=200', documents: [], gpa: 3.9, yearOfStudy: 3, status: 'approved' as const, votes: 0, runningMateId: 'cand_3_vp' },
      { id: 'cand_2', studentId: 'stud_3', name: 'John Mushi', position: 'President', manifesto: 'Better facilities and academic support.', imageUrl: 'https://ui-avatars.com/api/?name=John+Mushi&background=059669&color=fff&size=200', documents: [], gpa: 3.5, yearOfStudy: 2, status: 'approved' as const, votes: 0, runningMateId: 'cand_4_vp' },
      { id: 'cand_3_vp', studentId: 'stud_4', name: 'Amina Juma', position: 'Vice President', manifesto: 'Unity and diversity in student leadership.', imageUrl: 'https://ui-avatars.com/api/?name=Amina+Juma&background=d97706&color=fff&size=200', documents: [], gpa: 3.7, yearOfStudy: 4, status: 'approved' as const, votes: 0, runningMateId: 'cand_1' },
      { id: 'cand_4_vp', studentId: 'stud_5', name: 'Sarah Kiwango', position: 'Vice President', manifesto: 'Tech-driven administration for modern SOATECO.', imageUrl: 'https://ui-avatars.com/api/?name=Sarah+Kiwango&background=8b5cf6&color=fff&size=200', documents: [], gpa: 3.6, yearOfStudy: 3, status: 'approved' as const, votes: 0, runningMateId: 'cand_2' },
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
    await this.persist();
  }

  async getStudentByAdmission(admissionNumber: string): Promise<Student | undefined> {
    await this.ensureInit();
    return Array.from(this.students.values()).find(s => s.admissionNumber === admissionNumber);
  }

  async getStudent(id: string): Promise<Student | undefined> {
    await this.ensureInit();
    return this.students.get(id);
  }

  async updateStudent(id: string, data: Partial<Student>): Promise<Student | undefined> {
    await this.ensureInit();
    const student = this.students.get(id);
    if (!student) return undefined;
    const updated = { ...student, ...data };
    this.students.set(id, updated);
    await this.persist();
    if (process.env.DATABASE_URL) neonUpdateStudent(id, data);
    return updated;
  }

  async addStudent(student: Student): Promise<Student> {
    await this.ensureInit();
    this.students.set(student.id, student);
    await this.persist();
    if (process.env.DATABASE_URL) neonAddStudent(student);
    return student;
  }

  async deleteStudent(id: string): Promise<boolean> {
    await this.ensureInit();
    const result = this.students.delete(id);
    if (result) {
      await this.persist();
      if (process.env.DATABASE_URL) neonDeleteStudent(id);
    }
    return result;
  }

  async getAllStudents(): Promise<Student[]> {
    await this.ensureInit();
    return Array.from(this.students.values());
  }

  async addCandidate(candidate: Candidate): Promise<Candidate> {
    await this.ensureInit();
    this.candidates.set(candidate.id, candidate);
    await this.persist();
    if (process.env.DATABASE_URL) neonAddCandidateFn(candidate);
    return candidate;
  }

  async getCandidate(id: string): Promise<Candidate | undefined> {
    await this.ensureInit();
    return this.candidates.get(id);
  }

  async getCandidatesByPosition(position: string): Promise<Candidate[]> {
    await this.ensureInit();
    return Array.from(this.candidates.values()).filter(c => c.position === position && c.status === 'approved');
  }

  async getAllCandidates(): Promise<Candidate[]> {
    await this.ensureInit();
    return Array.from(this.candidates.values());
  }

  async updateCandidate(id: string, data: Partial<Candidate>): Promise<Candidate | undefined> {
    await this.ensureInit();
    const candidate = this.candidates.get(id);
    if (!candidate) return undefined;
    const updated = { ...candidate, ...data };
    this.candidates.set(id, updated);
    await this.persist();
    if (process.env.DATABASE_URL) neonUpdateCandidateFn(id, data);
    return updated;
  }

  async deleteCandidate(id: string): Promise<boolean> {
    await this.ensureInit();
    const result = this.candidates.delete(id);
    if (result) {
      await this.persist();
      if (process.env.DATABASE_URL) neonDeleteCandidateFn(id);
    }
    return result;
  }

  async getElection(id: string): Promise<Election | undefined> {
    await this.ensureInit();
    return this.elections.get(id);
  }

  async getActiveElection(): Promise<Election | undefined> {
    await this.ensureInit();
    return Array.from(this.elections.values()).find(e => e.status === 'active');
  }

  async updateElection(id: string, data: Partial<Election>): Promise<Election | undefined> {
    await this.ensureInit();
    const election = this.elections.get(id);
    if (!election) return undefined;
    const updated = { ...election, ...data, updatedAt: Date.now() };
    this.elections.set(id, updated);
    await this.persist();
    if (process.env.DATABASE_URL) neonSaveElectionFn(updated);
    return updated;
  }

  async addElection(election: Election): Promise<Election> {
    await this.ensureInit();
    this.elections.set(election.id, election);
    await this.persist();
    if (process.env.DATABASE_URL) neonSaveElectionFn(election);
    return election;
  }

  async getAllElections(): Promise<Election[]> {
    await this.ensureInit();
    return Array.from(this.elections.values());
  }

  async deleteElection(id: string): Promise<boolean> {
    await this.ensureInit();
    const result = this.elections.delete(id);
    if (result) {
      await this.persist();
      if (process.env.DATABASE_URL) neonDeleteElectionFn(id);
    }
    return result;
  }

  async getStudentsByDepartment(department: string): Promise<Student[]> {
    await this.ensureInit();
    return Array.from(this.students.values()).filter(s => s.department.toLowerCase() === department.toLowerCase());
  }

  async getStudentsByYear(year: number): Promise<Student[]> {
    await this.ensureInit();
    return Array.from(this.students.values()).filter(s => s.yearOfStudy === year);
  }

  async deleteStudents(ids: string[]): Promise<number> {
    await this.ensureInit();
    let count = 0;
    for (const id of ids) {
      if (this.students.delete(id)) count++;
    }
    if (count > 0) {
      await this.persist();
      if (process.env.DATABASE_URL) neonDeleteStudents(ids);
    }
    return count;
  }

  async addVote(vote: Vote): Promise<Vote> {
    await this.ensureInit();
    console.log(`[db.addVote] storing hash=${vote.voteHash}, votes.size before=${this.votes.size}`);
    this.votes.set(vote.voteHash, vote);
    console.log(`[db.addVote] votes.size after=${this.votes.size}`);
    await this.persist();
    if (process.env.DATABASE_URL) neonAddVoteFn(vote);
    return vote;
  }

  async getVote(hash: string): Promise<Vote | undefined> {
    await this.ensureInit();
    const result = this.votes.get(hash);
    console.log(`[db.getVote] looking up hash=${hash}, found=${!!result}, total votes in map=${this.votes.size}`);
    if (!result) {
      console.log(`[db.getVote] all keys:`, Array.from(this.votes.keys()));
    }
    return result;
  }

  async getAllVotes(): Promise<Vote[]> {
    await this.ensureInit();
    return Array.from(this.votes.values());
  }

  async addBlock(block: Block): Promise<Block> {
    await this.ensureInit();
    this.blocks.push(block);
    await this.persist();
    if (process.env.DATABASE_URL) neonAddBlockFn(block);
    return block;
  }

  async getLatestBlock(): Promise<Block | undefined> {
    await this.ensureInit();
    return this.blocks[this.blocks.length - 1];
  }

  async getAllBlocks(): Promise<Block[]> {
    await this.ensureInit();
    return [...this.blocks];
  }

  async getBlockByIndex(index: number): Promise<Block | undefined> {
    await this.ensureInit();
    return this.blocks[index];
  }

  async storeOTP(identifier: string, otp: string, ttlMinutes: number = 10): Promise<void> {
    await this.ensureInit();
    this.otps.set(identifier, { otp, expires: Date.now() + ttlMinutes * 60000 });
    await this.persist();
  }

  async verifyOTP(identifier: string, otp: string): Promise<boolean> {
    await this.ensureInit();
    const record = this.otps.get(identifier);
    if (!record) return false;
    if (Date.now() > record.expires) {
      this.otps.delete(identifier);
      await this.persist();
      return false;
    }
    const valid = record.otp === otp;
    if (valid) {
      this.otps.delete(identifier);
      await this.persist();
    }
    return valid;
  }

  async createAdminSession(token: string, username: string): Promise<void> {
    await this.ensureInit();
    // Invalidate any existing sessions for this admin
    for (const [existingToken, session] of this.adminSessions.entries()) {
      if (session.username === username) {
        this.adminSessions.delete(existingToken);
        await kvDel(`session:${existingToken}`);
      }
    }
    this.adminSessions.set(token, { username });
    await kvSet(`session:${token}`, { username }, 86400);
    await this.persist();
  }

  async deleteAdminSession(token: string): Promise<void> {
    await this.ensureInit();
    this.adminSessions.delete(token);
    await kvDel(`session:${token}`);
    await this.persist();
  }

  async verifyAdminSession(token: string): Promise<boolean> {
    await this.ensureInit();
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

  async verifyAdminLogin(username: string, password: string): Promise<AdminAccount | null> {
    await this.ensureInit();
    const admin = Array.from(this.admins.values()).find(a => a.username === username);
    if (!admin) return null;
    if (admin.passwordHash !== sha256(password)) return null;
    return admin;
  }

  async addAdmin(admin: AdminAccount): Promise<void> {
    await this.ensureInit();
    this.admins.set(admin.id, admin);
    await this.persist();
    if (process.env.DATABASE_URL) neonAddAdminFn(admin);
  }

  async getAllAdmins(): Promise<AdminAccount[]> {
    await this.ensureInit();
    return Array.from(this.admins.values());
  }

  async deleteAdmin(id: string): Promise<boolean> {
    await this.ensureInit();
    if (this.admins.get(id)?.role === 'superadmin') return false;
    const result = this.admins.delete(id);
    if (result) {
      await this.persist();
      if (process.env.DATABASE_URL) neonDeleteAdminFn(id);
    }
    return result;
  }

  async addAuditEvent(event: AuditEvent): Promise<void> {
    await this.ensureInit();
    this.auditEvents.push(event);
    await this.persist();
  }

  async getAuditEvents(): Promise<AuditEvent[]> {
    await this.ensureInit();
    return [...this.auditEvents];
  }

  async getAuditEventsByType(type: string): Promise<AuditEvent[]> {
    await this.ensureInit();
    return this.auditEvents.filter(e => e.eventType === type);
  }

  async getStats() {
    await this.ensureInit();
    const students = await this.getAllStudents();
    const candidates = await this.getAllCandidates();
    const votes = await this.getAllVotes();
    const blocks = await this.getAllBlocks();
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
