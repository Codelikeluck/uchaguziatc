import { Pool } from '@neondatabase/serverless';

let pool: Pool | null = null;

function getPool(): Pool | null {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  pool = new Pool({ connectionString: url });
  return pool;
}

// ========== SNAPSHOT (compatible with persist.ts saveData/loadData) ==========

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
  if (!p) return null;
  try {
    const { rows } = await p.query(`SELECT data FROM snapshots WHERE id = 'main'`);
    if (rows.length === 0) return null;
    return rows[0].data as Record<string, any>;
  } catch {
    return null;
  }
}

// ========== STUDENTS (individual CRUD, matching CSV columns) ==========

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
  } catch { return []; }
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
  } catch { return null; }
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
  } catch { return false; }
}

export async function neonDeleteStudents(ids: string[]): Promise<number> {
  const p = getPool();
  if (!p) return 0;
  if (ids.length === 0) return 0;
  try {
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const { rowCount } = await p.query(`DELETE FROM students WHERE id IN (${placeholders})`, ids);
    return rowCount || 0;
  } catch { return 0; }
}

export async function neonBulkAddStudents(students: any[]): Promise<number> {
  let count = 0;
  for (const s of students) {
    if (await neonAddStudent(s)) count++;
  }
  return count;
}

// ========== TABLE INITIALIZATION ==========

export async function neonInitTables(): Promise<boolean> {
  const p = getPool();
  if (!p) return false;
  try {
    await p.query(`CREATE TABLE IF NOT EXISTS snapshots (id TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMP DEFAULT NOW())`);
    return true;
  } catch (err) {
    console.error('Neon init tables failed:', err);
    return false;
  }
}
