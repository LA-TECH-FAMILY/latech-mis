const db = require('../../config/db');

async function listCourses(req, res) {
  const { department_id, level } = req.query;
  const where = ['c.is_active = TRUE'];
  const params = [];
  if (department_id) { params.push(department_id); where.push(`c.department_id = $${params.length}`); }
  if (level) { params.push(level); where.push(`c.level = $${params.length}`); }
  const { rows } = await db.query(
    `SELECT c.*, d.name AS department_name FROM courses c JOIN departments d ON d.id = c.department_id
     WHERE ${where.join(' AND ')} ORDER BY c.level, c.code`,
    params
  );
  res.json(rows);
}

async function createCourse(req, res) {
  const { department_id, code, name, credit_units, level } = req.body;
  if (!department_id || !code || !name || !level) {
    return res.status(400).json({ error: 'department_id, code, name, level are required' });
  }
  const { rows } = await db.query(
    'INSERT INTO courses (department_id, code, name, credit_units, level) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [department_id, code.toUpperCase(), name, credit_units || 3, level]
  );
  res.status(201).json(rows[0]);
}

async function updateCourse(req, res) {
  const { id } = req.params;
  const { name, credit_units, is_active } = req.body;
  await db.query(
    `UPDATE courses SET name = COALESCE($1, name), credit_units = COALESCE($2, credit_units),
     is_active = COALESCE($3, is_active), updated_at = NOW() WHERE id = $4`,
    [name, credit_units, is_active, id]
  );
  res.json({ message: 'Course updated' });
}

async function getProgrammeCurriculum(req, res) {
  const { programme_id, academic_year_id } = req.params;
  const { rows } = await db.query(
    `SELECT pc.*, c.code AS course_code, c.name AS course_name, c.credit_units, c.level
     FROM programme_curriculum pc JOIN courses c ON c.id = pc.course_id
     WHERE pc.programme_id = $1 AND pc.academic_year_id = $2
     ORDER BY pc.year_of_study, pc.semester, c.code`,
    [programme_id, academic_year_id]
  );
  res.json(rows);
}

async function setProgrammeCurriculum(req, res) {
  const { programme_id, academic_year_id } = req.params;
  const { courses } = req.body; // [{course_id, year_of_study, semester, is_core}]

  if (!Array.isArray(courses)) return res.status(400).json({ error: 'courses array required' });

  // Replace curriculum for this programme + year
  await db.query(
    'DELETE FROM programme_curriculum WHERE programme_id = $1 AND academic_year_id = $2',
    [programme_id, academic_year_id]
  );

  for (const item of courses) {
    await db.query(
      `INSERT INTO programme_curriculum (programme_id, academic_year_id, course_id, year_of_study, semester, is_core)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [programme_id, academic_year_id, item.course_id, item.year_of_study, item.semester, item.is_core !== false]
    );
  }

  res.json({ message: 'Curriculum saved', count: courses.length });
}

module.exports = { listCourses, createCourse, updateCourse, getProgrammeCurriculum, setProgrammeCurriculum };
