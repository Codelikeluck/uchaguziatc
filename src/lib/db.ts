import { Student, Candidate, Election, Vote, Block, AuditEvent } from '@/types';
import { sha256 } from './crypto';

class Database {
  private students: Map<string, Student> = new Map();
  private candidates: Map<string, Candidate> = new Map();
  private elections: Map<string, Election> = new Map();
  private votes: Map<string, Vote> = new Map();
  private blocks: Block[] = [];
  private auditEvents: AuditEvent[] = [];
  private otps: Map<string, { otp: string; expires: number }> = new Map();
  private adminSessions: Map<string, { username: string; expires: number }> = new Map();

  private seeded = false;

  constructor() {
    this.seedData();
  }

  private seedData() {
    if (this.seeded) return;
    this.seeded = true;
    const positions = [
      { id: 'pos_1', title: 'President', description: 'Head of SOATECO' },
      { id: 'pos_2', title: 'Vice President', description: 'Deputy head' },
      { id: 'pos_3', title: 'Secretary General', description: 'Administrative head' },
      { id: 'pos_4', title: 'Treasurer', description: 'Financial oversight' },
    ];

    const election: Election = {
      id: 'election_2024',
      title: 'SOATECO General Elections 2024',
      positions: positions.map(p => ({ ...p, candidates: [] })),
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
    return updated;
  }

  addStudent(student: Student): Student {
    this.students.set(student.id, student);
    return student;
  }

  deleteStudent(id: string): boolean {
    return this.students.delete(id);
  }

  getAllStudents(): Student[] {
    return Array.from(this.students.values());
  }

  addCandidate(candidate: Candidate): Candidate {
    this.candidates.set(candidate.id, candidate);
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
    return updated;
  }

  deleteCandidate(id: string): boolean {
    return this.candidates.delete(id);
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
    return updated;
  }

  getAllElections(): Election[] {
    return Array.from(this.elections.values());
  }

  deleteElection(id: string): boolean {
    return this.elections.delete(id);
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
    return count;
  }

  addVote(vote: Vote): Vote {
    this.votes.set(vote.voteHash, vote);
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
  }

  verifyOTP(identifier: string, otp: string): boolean {
    const record = this.otps.get(identifier);
    if (!record) return false;
    if (Date.now() > record.expires) {
      this.otps.delete(identifier);
      return false;
    }
    const valid = record.otp === otp;
    if (valid) this.otps.delete(identifier);
    return valid;
  }

  createAdminSession(token: string, username: string, ttlHours: number = 24): void {
    this.adminSessions.set(token, { username, expires: Date.now() + ttlHours * 3600000 });
  }

  verifyAdminSession(token: string): boolean {
    const session = this.adminSessions.get(token);
    if (!session) return false;
    if (Date.now() > session.expires) {
      this.adminSessions.delete(token);
      return false;
    }
    return true;
  }

  addAuditEvent(event: AuditEvent): void {
    this.auditEvents.push(event);
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

export const db = new Database();
