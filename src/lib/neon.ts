import { Pool } from '@neondatabase/serverless';

let pool: Pool | null = null;

function getPool(): Pool | null {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  pool = new Pool({ connectionString: url });
  return pool;
}

// ========== SCHEMA INITIALIZATION ==========

export async function neonInitTables(): Promise<boolean> {
  const p = getPool();
  if (!p) { console.warn('Neon initTables: DATABASE_URL not set, skipping'); return false; }
  try {
    await p.query(`CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      admission_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      department TEXT,
      year_of_study INTEGER DEFAULT 1,
      phone TEXT,
      has_voted BOOLEAN DEFAULT FALSE,
      wallet_address TEXT
    )`);

    await p.query(`CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      student_id TEXT REFERENCES students(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      position TEXT NOT NULL,
      manifesto TEXT,
      image_url TEXT,
      documents JSONB DEFAULT '[]',
      gpa NUMERIC DEFAULT 0,
      year_of_study INTEGER DEFAULT 1,
      status TEXT DEFAULT 'pending',
      votes INTEGER DEFAULT 0
    )`);

    await p.query(`CREATE TABLE IF NOT EXISTS elections (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      positions JSONB DEFAULT '[]',
      start_date TIMESTAMP,
      end_date TIMESTAMP,
      status TEXT DEFAULT 'inactive',
      total_voters INTEGER DEFAULT 0,
      total_votes INTEGER DEFAULT 0
    )`);

    await p.query(`CREATE TABLE IF NOT EXISTS votes (
      vote_hash TEXT PRIMARY KEY,
      student_id TEXT,
      candidate_id TEXT,
      election_id TEXT,
      timestamp BIGINT NOT NULL
    )`);

    await p.query(`CREATE TABLE IF NOT EXISTS blocks (
      block_index INTEGER PRIMARY KEY,
      timestamp BIGINT NOT NULL,
      previous_hash TEXT NOT NULL DEFAULT '',
      hash TEXT NOT NULL,
      data JSONB DEFAULT '{}',
      nonce INTEGER DEFAULT 0
    )`);

    await p.query(`CREATE TABLE IF NOT EXISTS audit_events (
      id SERIAL PRIMARY KEY,
      event_type TEXT NOT NULL,
      data TEXT,
      timestamp BIGINT NOT NULL,
      user_id TEXT
    )`);

    await p.query(`CREATE TABLE IF NOT EXISTS otps (
      identifier TEXT PRIMARY KEY,
      otp TEXT NOT NULL,
      expires BIGINT NOT NULL
    )`);

    await p.query(`CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      username TEXT NOT NULL
    )`);

    await p.query(`CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at BIGINT NOT NULL
    )`);

    await p.query(`CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )`);

    // Indexes
    await p.query(`CREATE INDEX IF NOT EXISTS idx_students_admission ON students(admission_number)`);
    await p.query(`CREATE INDEX IF NOT EXISTS idx_students_department ON students(department)`);
    await p.query(`CREATE INDEX IF NOT EXISTS idx_candidates_position ON candidates(position)`);
    await p.query(`CREATE INDEX IF NOT EXISTS idx_votes_election ON votes(election_id)`);

    console.log('Neon: all tables ready');
    return true;
  } catch (err) {
    console.error('Neon init tables failed:', err);
    return false;
  }
}

// ========== SNAPSHOT (JSON blob persistence) ==========

export async function neonSaveSnapshot(data: Record<string, any>): Promise<boolean> {
  const p = getPool();
  if (!p) return false;
  try {
    await p.query(
      `INSERT INTO snapshots (id, data, updated_at) VALUES ('main', $1, NOW())
       ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = NOW()`,
      [JSON.stringify(data)]
    );
    return true;
  } catch (err) {
    console.error('Neon save snapshot failed:', err);
    return false;
  }
}

export async function neonLoadSnapshot(): Promise<Record<string, any> | null> {
  const p = getPool();
  if (!p) { console.warn('Neon: no pool (DATABASE_URL not set or invalid)'); return null; }
  try {
    const { rows } = await p.query(`SELECT data FROM snapshots WHERE id = 'main'`);
    if (rows.length === 0) return null;
    return rows[0].data as Record<string, any>;
  } catch (err) {
    console.error('Neon load snapshot failed:', err);
    return null;
  }
}

// ========== SYNC SNAPSHOT → INDIVIDUAL TABLES ==========

export async function neonSyncAll(data: Record<string, any>): Promise<void> {
  const p = getPool();
  if (!p) return;

  if (data.students) {
    for (const [, s] of data.students as [string, any][]) {
      try {
        await p.query(
          `INSERT INTO students (id, admission_number, name, email, department, year_of_study, phone, has_voted, wallet_address)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (id) DO UPDATE SET
             admission_number = EXCLUDED.admission_number, name = EXCLUDED.name, email = EXCLUDED.email,
             department = EXCLUDED.department, year_of_study = EXCLUDED.year_of_study,
             phone = EXCLUDED.phone, has_voted = EXCLUDED.has_voted, wallet_address = EXCLUDED.wallet_address`,
          [s.id, s.admissionNumber, s.name, s.email || null, s.department || null,
           s.yearOfStudy || 1, s.phone || null, s.hasVoted || false, s.walletAddress || null]
        );
      } catch (err) {
        console.error(`Neon sync student ${s.id}:`, err);
      }
    }
  }

  if (data.candidates) {
    for (const [, c] of data.candidates as [string, any][]) {
      try {
        await p.query(
          `INSERT INTO candidates (id, student_id, name, position, manifesto, image_url, documents, gpa, year_of_study, status, votes)
           VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11)
           ON CONFLICT (id) DO UPDATE SET
             student_id = EXCLUDED.student_id, name = EXCLUDED.name, position = EXCLUDED.position,
             manifesto = EXCLUDED.manifesto, image_url = EXCLUDED.image_url,
             documents = EXCLUDED.documents, gpa = EXCLUDED.gpa,
             year_of_study = EXCLUDED.year_of_study, status = EXCLUDED.status, votes = EXCLUDED.votes`,
          [c.id, c.studentId || null, c.name, c.position, c.manifesto || null,
           c.imageUrl || null, JSON.stringify(c.documents || []), c.gpa || 0,
           c.yearOfStudy || 1, c.status || 'pending', c.votes || 0]
        );
      } catch (err) {
        console.error(`Neon sync candidate ${c.id}:`, err);
      }
    }
  }

  if (data.elections) {
    for (const [, e] of data.elections as [string, any][]) {
      try {
        await p.query(
          `INSERT INTO elections (id, title, positions, start_date, end_date, status, total_voters, total_votes)
           VALUES ($1,$2,$3::jsonb,$4::timestamptz,$5::timestamptz,$6,$7,$8)
           ON CONFLICT (id) DO UPDATE SET
             title = EXCLUDED.title, positions = EXCLUDED.positions,
             start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date,
             status = EXCLUDED.status, total_voters = EXCLUDED.total_voters, total_votes = EXCLUDED.total_votes`,
          [e.id, e.title, JSON.stringify(e.positions || []),
           e.startDate || null, e.endDate || null,
           e.status || 'inactive', e.totalVoters || 0, e.totalVotes || 0]
        );
      } catch (err) {
        console.error(`Neon sync election ${e.id}:`, err);
      }
    }
  }

  if (data.votes) {
    for (const [, v] of data.votes as [string, any][]) {
      try {
        await p.query(
          `INSERT INTO votes (vote_hash, student_id, candidate_id, election_id, timestamp)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (vote_hash) DO UPDATE SET
             student_id = EXCLUDED.student_id, candidate_id = EXCLUDED.candidate_id,
             election_id = EXCLUDED.election_id, timestamp = EXCLUDED.timestamp`,
          [v.voteHash, v.studentId || null, v.candidateId || null, v.electionId || null, v.timestamp || Date.now()]
        );
      } catch (err) {
        console.error(`Neon sync vote ${v.voteHash}:`, err);
      }
    }
  }

  if (data.blocks) {
    for (const b of data.blocks as any[]) {
      try {
        await p.query(
          `INSERT INTO blocks (block_index, timestamp, previous_hash, hash, data, nonce)
           VALUES ($1,$2,$3,$4,$5::jsonb,$6)
           ON CONFLICT (block_index) DO UPDATE SET
             timestamp = EXCLUDED.timestamp, previous_hash = EXCLUDED.previous_hash,
             hash = EXCLUDED.hash, data = EXCLUDED.data, nonce = EXCLUDED.nonce`,
          [b.index, b.timestamp, b.previousHash || '', b.blockHash || b.hash || '',
           JSON.stringify(b), b.nonce || 0]
        );
      } catch (err) {
        console.error(`Neon sync block ${b.index}:`, err);
      }
    }
  }

  if (data.admins) {
    for (const [, a] of data.admins as [string, any][]) {
      try {
        await p.query(
          `INSERT INTO admins (id, username, password_hash, role, created_at)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (id) DO UPDATE SET
             username = EXCLUDED.username, password_hash = EXCLUDED.password_hash,
             role = EXCLUDED.role, created_at = EXCLUDED.created_at`,
          [a.id, a.username, a.passwordHash, a.role || 'admin', a.createdAt || Date.now()]
        );
      } catch (err) {
        console.error(`Neon sync admin ${a.id}:`, err);
      }
    }
  }

  if (data.adminSessions) {
    for (const [token, s] of data.adminSessions as [string, any][]) {
      try {
        await p.query(
          `INSERT INTO admin_sessions (token, username) VALUES ($1,$2)
           ON CONFLICT (token) DO UPDATE SET username = EXCLUDED.username`,
          [token, s.username]
        );
      } catch (err) {
        console.error(`Neon sync session ${token}:`, err);
      }
    }
  }

  if (data.otps) {
    for (const [id, o] of data.otps as [string, any][]) {
      try {
        await p.query(
          `INSERT INTO otps (identifier, otp, expires) VALUES ($1,$2,$3)
           ON CONFLICT (identifier) DO UPDATE SET otp = EXCLUDED.otp, expires = EXCLUDED.expires`,
          [id, o.otp, o.expires]
        );
      } catch (err) {
        console.error(`Neon sync otp ${id}:`, err);
      }
    }
  }

  console.log('Neon: snapshot synced to individual tables');
}

// ========== STUDENTS (individual CRUD) ==========

export async function neonGetAllStudents(): Promise<any[]> {
  const p = getPool();
  if (!p) return [];
  try {
    const { rows } = await p.query(`SELECT * FROM students ORDER BY name ASC`);
    return rows.map(r => ({
      id: r.id,
      admissionNumber: r.admission_number,
      name: r.name,
      email: r.email,
      department: r.department,
      yearOfStudy: r.year_of_study,
      phone: r.phone,
      hasVoted: r.has_voted,
      walletAddress: r.wallet_address,
    }));
  } catch (err) { console.error('Neon getAllStudents failed:', err); return []; }
}

export async function neonGetStudentByAdmission(admissionNumber: string): Promise<any | null> {
  const p = getPool();
  if (!p) return null;
  try {
    const { rows } = await p.query(`SELECT * FROM students WHERE admission_number = $1 LIMIT 1`, [admissionNumber]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id, admissionNumber: r.admission_number, name: r.name, email: r.email,
      department: r.department, yearOfStudy: r.year_of_study, phone: r.phone,
      hasVoted: r.has_voted, walletAddress: r.wallet_address,
    };
  } catch (err) { console.error('Neon getStudentByAdmission failed:', err); return null; }
}

export async function neonAddStudent(student: any): Promise<boolean> {
  const p = getPool();
  if (!p) return false;
  try {
    await p.query(
      `INSERT INTO students (id, admission_number, name, email, department, year_of_study, phone, has_voted, wallet_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET
         admission_number = EXCLUDED.admission_number, name = EXCLUDED.name, email = EXCLUDED.email,
         department = EXCLUDED.department, year_of_study = EXCLUDED.year_of_study,
         phone = EXCLUDED.phone, has_voted = EXCLUDED.has_voted, wallet_address = EXCLUDED.wallet_address`,
      [student.id, student.admissionNumber, student.name, student.email || null, student.department || null,
       student.yearOfStudy || 1, student.phone || null, student.hasVoted || false, student.walletAddress || null]
    );
    return true;
  } catch (err) {
    console.error('Neon add student failed:', err);
    return false;
  }
}

export async function neonUpdateStudent(id: string, data: Partial<any>): Promise<boolean> {
  const p = getPool();
  if (!p) return false;
  const sets: string[] = [];
  const vals: any[] = [];
  let idx = 1;

  if (data.admissionNumber !== undefined) { sets.push(`admission_number = $${idx++}`); vals.push(data.admissionNumber); }
  if (data.name !== undefined) { sets.push(`name = $${idx++}`); vals.push(data.name); }
  if (data.email !== undefined) { sets.push(`email = $${idx++}`); vals.push(data.email); }
  if (data.department !== undefined) { sets.push(`department = $${idx++}`); vals.push(data.department); }
  if (data.yearOfStudy !== undefined) { sets.push(`year_of_study = $${idx++}`); vals.push(data.yearOfStudy); }
  if (data.phone !== undefined) { sets.push(`phone = $${idx++}`); vals.push(data.phone); }
  if (data.hasVoted !== undefined) { sets.push(`has_voted = $${idx++}`); vals.push(data.hasVoted); }
  if (data.walletAddress !== undefined) { sets.push(`wallet_address = $${idx++}`); vals.push(data.walletAddress); }
  if (sets.length === 0) return true;

  vals.push(id);
  try {
    await p.query(`UPDATE students SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
    return true;
  } catch (err) {
    console.error('Neon update student failed:', err);
    return false;
  }
}

export async function neonDeleteStudent(id: string): Promise<boolean> {
  const p = getPool();
  if (!p) return false;
  try {
    await p.query(`DELETE FROM students WHERE id = $1`, [id]);
    return true;
  } catch (err) { console.error('Neon delete student failed:', err); return false; }
}

export async function neonDeleteStudents(ids: string[]): Promise<number> {
  const p = getPool();
  if (!p) return 0;
  if (ids.length === 0) return 0;
  try {
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const { rowCount } = await p.query(`DELETE FROM students WHERE id IN (${placeholders})`, ids);
    return rowCount || 0;
  } catch (err) { console.error('Neon deleteStudents failed:', err); return 0; }
}

export async function neonBulkAddStudents(students: any[]): Promise<number> {
  let count = 0;
  for (const s of students) {
    if (await neonAddStudent(s)) count++;
  }
  return count;
}

// ========== CANDIDATES ==========

export async function neonAddCandidate(candidate: any): Promise<boolean> {
  const p = getPool();
  if (!p) return false;
  try {
    await p.query(
      `INSERT INTO candidates (id, student_id, name, position, manifesto, image_url, documents, gpa, year_of_study, status, votes)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET
         student_id = EXCLUDED.student_id, name = EXCLUDED.name, position = EXCLUDED.position,
         manifesto = EXCLUDED.manifesto, image_url = EXCLUDED.image_url,
         documents = EXCLUDED.documents, gpa = EXCLUDED.gpa,
         year_of_study = EXCLUDED.year_of_study, status = EXCLUDED.status, votes = EXCLUDED.votes`,
      [candidate.id, candidate.studentId || null, candidate.name, candidate.position,
       candidate.manifesto || null, candidate.imageUrl || null,
       JSON.stringify(candidate.documents || []), candidate.gpa || 0,
       candidate.yearOfStudy || 1, candidate.status || 'pending', candidate.votes || 0]
    );
    return true;
  } catch (err) { console.error('Neon add candidate failed:', err); return false; }
}

export async function neonUpdateCandidate(id: string, data: Partial<any>): Promise<boolean> {
  const p = getPool();
  if (!p) return false;
  const sets: string[] = [];
  const vals: any[] = [];
  let idx = 1;
  if (data.name !== undefined) { sets.push(`name = $${idx++}`); vals.push(data.name); }
  if (data.position !== undefined) { sets.push(`position = $${idx++}`); vals.push(data.position); }
  if (data.manifesto !== undefined) { sets.push(`manifesto = $${idx++}`); vals.push(data.manifesto); }
  if (data.imageUrl !== undefined) { sets.push(`image_url = $${idx++}`); vals.push(data.imageUrl); }
  if (data.documents !== undefined) { sets.push(`documents = $${idx++}::jsonb`); vals.push(JSON.stringify(data.documents)); }
  if (data.gpa !== undefined) { sets.push(`gpa = $${idx++}`); vals.push(data.gpa); }
  if (data.status !== undefined) { sets.push(`status = $${idx++}`); vals.push(data.status); }
  if (data.votes !== undefined) { sets.push(`votes = $${idx++}`); vals.push(data.votes); }
  if (sets.length === 0) return true;
  vals.push(id);
  try {
    await p.query(`UPDATE candidates SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
    return true;
  } catch (err) { console.error('Neon update candidate failed:', err); return false; }
}

export async function neonDeleteCandidate(id: string): Promise<boolean> {
  const p = getPool();
  if (!p) return false;
  try {
    await p.query(`DELETE FROM candidates WHERE id = $1`, [id]);
    return true;
  } catch (err) { console.error('Neon delete candidate failed:', err); return false; }
}

// ========== ELECTIONS ==========

export async function neonSaveElection(election: any): Promise<boolean> {
  const p = getPool();
  if (!p) return false;
  try {
    await p.query(
      `INSERT INTO elections (id, title, positions, start_date, end_date, status, total_voters, total_votes)
       VALUES ($1,$2,$3::jsonb,$4::timestamptz,$5::timestamptz,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title, positions = EXCLUDED.positions,
         start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date,
         status = EXCLUDED.status, total_voters = EXCLUDED.total_voters, total_votes = EXCLUDED.total_votes`,
      [election.id, election.title, JSON.stringify(election.positions || []),
       election.startDate || null, election.endDate || null,
       election.status || 'inactive', election.totalVoters || 0, election.totalVotes || 0]
    );
    return true;
  } catch (err) { console.error('Neon save election failed:', err); return false; }
}

export async function neonDeleteElection(id: string): Promise<boolean> {
  const p = getPool();
  if (!p) return false;
  try {
    await p.query(`DELETE FROM elections WHERE id = $1`, [id]);
    return true;
  } catch (err) { console.error('Neon delete election failed:', err); return false; }
}

// ========== VOTES ==========

export async function neonAddVote(vote: any): Promise<boolean> {
  const p = getPool();
  if (!p) return false;
  try {
    await p.query(
      `INSERT INTO votes (vote_hash, student_id, candidate_id, election_id, timestamp)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (vote_hash) DO UPDATE SET
         student_id = EXCLUDED.student_id, candidate_id = EXCLUDED.candidate_id,
         election_id = EXCLUDED.election_id, timestamp = EXCLUDED.timestamp`,
      [vote.voteHash, vote.studentId || null, vote.candidateId || null, vote.electionId || null, vote.timestamp || Date.now()]
    );
    return true;
  } catch (err) { console.error('Neon add vote failed:', err); return false; }
}

// ========== BLOCKS ==========

// ========== ADMINS ==========

export async function neonAddAdmin(admin: any): Promise<boolean> {
  const p = getPool();
  if (!p) return false;
  try {
    await p.query(
      `INSERT INTO admins (id, username, password_hash, role, created_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO UPDATE SET
         username = EXCLUDED.username, password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role, created_at = EXCLUDED.created_at`,
      [admin.id, admin.username, admin.passwordHash, admin.role || 'admin', admin.createdAt || Date.now()]
    );
    return true;
  } catch (err) { console.error('Neon add admin failed:', err); return false; }
}

export async function neonDeleteAdmin(id: string): Promise<boolean> {
  const p = getPool();
  if (!p) return false;
  try {
    await p.query(`DELETE FROM admins WHERE id = $1`, [id]);
    return true;
  } catch (err) { console.error('Neon delete admin failed:', err); return false; }
}

// ========== BLOCKS ==========

export async function neonAddBlock(block: any): Promise<boolean> {
  const p = getPool();
  if (!p) return false;
  try {
    await p.query(
      `INSERT INTO blocks (block_index, timestamp, previous_hash, hash, data, nonce)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6)
       ON CONFLICT (block_index) DO UPDATE SET
         timestamp = EXCLUDED.timestamp, previous_hash = EXCLUDED.previous_hash,
         hash = EXCLUDED.hash, data = EXCLUDED.data, nonce = EXCLUDED.nonce`,
      [block.index, block.timestamp, block.previousHash || '', block.blockHash || block.hash || '',
       JSON.stringify(block), block.nonce || 0]
    );
    return true;
  } catch (err) { console.error('Neon add block failed:', err); return false; }
}
