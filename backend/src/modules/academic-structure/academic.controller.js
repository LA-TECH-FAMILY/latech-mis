const db = require('../../config/db');

// ---- Faculties ----
async function listFaculties(req, res) {
  const { rows } = await db.query(
    `SELECT f.*, u.first_name || ' ' || u.last_name AS dean_name
     FROM faculties f LEFT JOIN users u ON u.id = f.dean_id
     WHERE f.is_active = TRUE ORDER BY f.name`
  );
  res.json(rows);
}

async function createFaculty(req, res) {
  const { code, name, dean_id } = req.body;
  if (!code || !name) return res.status(400).json({ error: 'code and name are required' });
  const { rows } = await db.query(
    'INSERT INTO faculties (code, name, dean_id) VALUES ($1, $2, $3) RETURNING *',
    [code.toUpperCase(), name, dean_id || null]
  );
  res.status(201).json(rows[0]);
}

async function updateFaculty(req, res) {
  const { id } = req.params;
  const { name, dean_id, is_active } = req.body;
  await db.query(
    `UPDATE faculties SET name = COALESCE($1, name), dean_id = COALESCE($2, dean_id),
     is_active = COALESCE($3, is_active), updated_at = NOW() WHERE id = $4`,
    [name, dean_id, is_active, id]
  );
  res.json({ message: 'Faculty updated' });
}

// ---- Departments ----
async function listDepartments(req, res) {
  const { faculty_id } = req.query;
  let query = `SELECT d.*, f.name AS faculty_name, u.first_name || ' ' || u.last_name AS hod_name
               FROM departments d JOIN faculties f ON f.id = d.faculty_id
               LEFT JOIN users u ON u.id = d.hod_id WHERE d.is_active = TRUE`;
  const params = [];
  if (faculty_id) { params.push(faculty_id); query += ` AND d.faculty_id = $${params.length}`; }
  query += ' ORDER BY f.name, d.name';
  const { rows } = await db.query(query, params);
  res.json(rows);
}

async function createDepartment(req, res) {
  const { faculty_id, code, name, hod_id } = req.body;
  if (!faculty_id || !code || !name) return res.status(400).json({ error: 'faculty_id, code, name are required' });
  const { rows } = await db.query(
    'INSERT INTO departments (faculty_id, code, name, hod_id) VALUES ($1, $2, $3, $4) RETURNING *',
    [faculty_id, code.toUpperCase(), name, hod_id || null]
  );
  res.status(201).json(rows[0]);
}

async function updateDepartment(req, res) {
  const { id } = req.params;
  const { name, hod_id, is_active } = req.body;
  await db.query(
    `UPDATE departments SET name = COALESCE($1, name), hod_id = COALESCE($2, hod_id),
     is_active = COALESCE($3, is_active), updated_at = NOW() WHERE id = $4`,
    [name, hod_id, is_active, id]
  );
  res.json({ message: 'Department updated' });
}

// ---- Programmes ----
async function listProgrammes(req, res) {
  const { department_id } = req.query;
  let query = `SELECT p.*, d.name AS department_name, f.name AS faculty_name
               FROM programmes p JOIN departments d ON d.id = p.department_id
               JOIN faculties f ON f.id = d.faculty_id WHERE p.is_active = TRUE`;
  const params = [];
  if (department_id) { params.push(department_id); query += ` AND p.department_id = $${params.length}`; }
  query += ' ORDER BY p.name';
  const { rows } = await db.query(query, params);
  res.json(rows);
}

async function createProgramme(req, res) {
  const { department_id, code, name, award_type, duration_years, study_mode } = req.body;
  if (!department_id || !code || !name || !award_type || !duration_years || !study_mode) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const { rows } = await db.query(
    `INSERT INTO programmes (department_id, code, name, award_type, duration_years, study_mode)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [department_id, code.toUpperCase(), name, award_type, duration_years, study_mode]
  );
  res.status(201).json(rows[0]);
}

async function updateProgramme(req, res) {
  const { id } = req.params;
  const { name, duration_years, study_mode, is_active } = req.body;
  await db.query(
    `UPDATE programmes SET name = COALESCE($1, name), duration_years = COALESCE($2, duration_years),
     study_mode = COALESCE($3, study_mode), is_active = COALESCE($4, is_active), updated_at = NOW() WHERE id = $5`,
    [name, duration_years, study_mode, is_active, id]
  );
  res.json({ message: 'Programme updated' });
}

// ---- Academic Years ----
async function listAcademicYears(req, res) {
  const { rows } = await db.query('SELECT * FROM academic_years ORDER BY start_date DESC');
  res.json(rows);
}

async function createAcademicYear(req, res) {
  const { label, start_date, end_date, is_current } = req.body;
  if (!label || !start_date || !end_date) return res.status(400).json({ error: 'label, start_date, end_date required' });
  if (is_current) await db.query('UPDATE academic_years SET is_current = FALSE');
  const { rows } = await db.query(
    'INSERT INTO academic_years (label, start_date, end_date, is_current) VALUES ($1, $2, $3, $4) RETURNING *',
    [label, start_date, end_date, is_current || false]
  );
  res.status(201).json(rows[0]);
}

async function setCurrentYear(req, res) {
  const { id } = req.params;
  await db.query('UPDATE academic_years SET is_current = FALSE');
  await db.query('UPDATE academic_years SET is_current = TRUE WHERE id = $1', [id]);
  res.json({ message: 'Current year updated' });
}

// ---- Intakes ----
async function listIntakes(req, res) {
  const { programme_id, academic_year_id } = req.query;
  let query = `SELECT i.*, p.name AS programme_name, ay.label AS academic_year
               FROM intakes i JOIN programmes p ON p.id = i.programme_id
               JOIN academic_years ay ON ay.id = i.academic_year_id WHERE 1=1`;
  const params = [];
  if (programme_id) { params.push(programme_id); query += ` AND i.programme_id = $${params.length}`; }
  if (academic_year_id) { params.push(academic_year_id); query += ` AND i.academic_year_id = $${params.length}`; }
  query += ' ORDER BY ay.start_date DESC, p.name';
  const { rows } = await db.query(query, params);
  res.json(rows);
}

async function createIntake(req, res) {
  const { academic_year_id, programme_id, intake_label, intake_month, capacity } = req.body;
  if (!academic_year_id || !programme_id || !intake_label || !intake_month) {
    return res.status(400).json({ error: 'academic_year_id, programme_id, intake_label, intake_month required' });
  }
  const { rows } = await db.query(
    `INSERT INTO intakes (academic_year_id, programme_id, intake_label, intake_month, capacity)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [academic_year_id, programme_id, intake_label, intake_month, capacity || null]
  );
  res.status(201).json(rows[0]);
}

module.exports = {
  listFaculties, createFaculty, updateFaculty,
  listDepartments, createDepartment, updateDepartment,
  listProgrammes, createProgramme, updateProgramme,
  listAcademicYears, createAcademicYear, setCurrentYear,
  listIntakes, createIntake,
};
