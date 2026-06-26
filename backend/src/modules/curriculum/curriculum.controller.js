const db = require('../../config/db');

// ---- Courses (catalogue) ----
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

// ---- Curricula (versions) ----
async function listCurricula(req, res) {
  const { programme_id } = req.params;
  const { rows } = await db.query(
    `SELECT c.*,
            p.name AS programme_name, p.code AS programme_code,
            (SELECT COUNT(*) FROM curriculum_units cu WHERE cu.curriculum_id = c.id AND cu.is_active = TRUE) AS unit_count,
            (SELECT COUNT(*) FROM curriculum_units cu WHERE cu.curriculum_id = c.id AND cu.unit_type = 'core' AND cu.is_active = TRUE) AS core_count,
            (SELECT COUNT(*) FROM curriculum_units cu WHERE cu.curriculum_id = c.id AND cu.unit_type = 'elective' AND cu.is_active = TRUE) AS elective_count,
            (SELECT COUNT(*) FROM curriculum_units cu WHERE cu.curriculum_id = c.id AND cu.unit_type = 'foundation' AND cu.is_active = TRUE) AS foundation_count,
            (SELECT COUNT(*) FROM students s WHERE s.programme_id = c.programme_id AND s.status = 'active') AS ongoing_count,
            (SELECT COUNT(*) FROM students s WHERE s.programme_id = c.programme_id AND s.status = 'graduated') AS completed_count
     FROM curricula c JOIN programmes p ON p.id = c.programme_id
     WHERE c.programme_id = $1 AND c.is_active = TRUE
     ORDER BY c.created_at DESC`,
    [programme_id]
  );
  res.json(rows);
}

async function createCurriculum(req, res) {
  const { programme_id } = req.params;
  const { name, code, stage, status, electives_waiver, use_course_tracks, review_date } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const { rows } = await db.query(
    `INSERT INTO curricula (programme_id, name, code, stage, status, electives_waiver, use_course_tracks, review_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [programme_id, name, code || null, stage || 'draft', status || 'active',
     electives_waiver || 'consider', use_course_tracks || false, review_date || null]
  );
  res.status(201).json(rows[0]);
}

async function getCurriculum(req, res) {
  const { id } = req.params;
  const curr = (await db.query(
    `SELECT c.*, p.name AS programme_name, p.code AS programme_code, p.duration_years
     FROM curricula c JOIN programmes p ON p.id = c.programme_id WHERE c.id = $1`,
    [id]
  )).rows[0];
  if (!curr) return res.status(404).json({ error: 'Curriculum not found' });
  res.json(curr);
}

async function updateCurriculum(req, res) {
  const { id } = req.params;
  const { name, code, stage, status, electives_waiver, use_course_tracks, review_date, is_active } = req.body;
  await db.query(
    `UPDATE curricula SET
       name               = COALESCE($1, name),
       code               = COALESCE($2, code),
       stage              = COALESCE($3, stage),
       status             = COALESCE($4, status),
       electives_waiver   = COALESCE($5, electives_waiver),
       use_course_tracks  = COALESCE($6, use_course_tracks),
       review_date        = COALESCE($7, review_date),
       is_active          = COALESCE($8, is_active),
       updated_at         = NOW()
     WHERE id = $9`,
    [name, code, stage, status, electives_waiver, use_course_tracks, review_date, is_active, id]
  );
  res.json({ message: 'Curriculum updated' });
}

async function replicateCurriculum(req, res) {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name for new curriculum is required' });

  const orig = (await db.query('SELECT * FROM curricula WHERE id = $1', [id])).rows[0];
  if (!orig) return res.status(404).json({ error: 'Curriculum not found' });

  const { rows: [newCurr] } = await db.query(
    `INSERT INTO curricula (programme_id, name, code, stage, status, electives_waiver, use_course_tracks)
     VALUES ($1, $2, $3, 'draft', 'incoming', $4, $5) RETURNING *`,
    [orig.programme_id, name, orig.code, orig.electives_waiver, orig.use_course_tracks]
  );

  // Copy all units
  const units = (await db.query(
    'SELECT * FROM curriculum_units WHERE curriculum_id = $1 AND is_active = TRUE', [id]
  )).rows;

  for (const u of units) {
    await db.query(
      `INSERT INTO curriculum_units (curriculum_id, code, name, abbreviation, unit_type, credit_units,
         year_of_study, semester, exam_max, exam_pass, coursework_max, coursework_pass, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [newCurr.id, u.code, u.name, u.abbreviation, u.unit_type, u.credit_units,
       u.year_of_study, u.semester, u.exam_max, u.exam_pass, u.coursework_max, u.coursework_pass, u.sort_order]
    );
  }

  res.status(201).json({ ...newCurr, units_copied: units.length });
}

// ---- Curriculum Units ----
async function listUnits(req, res) {
  const { id } = req.params;
  const { rows } = await db.query(
    `SELECT * FROM curriculum_units WHERE curriculum_id = $1 AND is_active = TRUE
     ORDER BY year_of_study, semester, sort_order, code`,
    [id]
  );
  res.json(rows);
}

async function createUnit(req, res) {
  const { id: curriculum_id } = req.params;
  const { code, name, abbreviation, unit_type, credit_units, year_of_study, semester,
          exam_max, exam_pass, coursework_max, coursework_pass } = req.body;
  if (!code || !name || !year_of_study || !semester) {
    return res.status(400).json({ error: 'code, name, year_of_study, semester are required' });
  }
  const { rows } = await db.query(
    `INSERT INTO curriculum_units
       (curriculum_id, code, name, abbreviation, unit_type, credit_units, year_of_study, semester,
        exam_max, exam_pass, coursework_max, coursework_pass)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [curriculum_id, code.toUpperCase(), name, abbreviation || null,
     unit_type || 'core', credit_units || 3, year_of_study, semester,
     exam_max || 70, exam_pass || 35, coursework_max || 30, coursework_pass || 15]
  );
  res.status(201).json(rows[0]);
}

async function updateUnit(req, res) {
  const { unitId } = req.params;
  const { code, name, abbreviation, unit_type, credit_units, year_of_study, semester,
          exam_max, exam_pass, coursework_max, coursework_pass, is_active } = req.body;
  await db.query(
    `UPDATE curriculum_units SET
       code             = COALESCE($1, code),
       name             = COALESCE($2, name),
       abbreviation     = COALESCE($3, abbreviation),
       unit_type        = COALESCE($4, unit_type),
       credit_units     = COALESCE($5, credit_units),
       year_of_study    = COALESCE($6, year_of_study),
       semester         = COALESCE($7, semester),
       exam_max         = COALESCE($8, exam_max),
       exam_pass        = COALESCE($9, exam_pass),
       coursework_max   = COALESCE($10, coursework_max),
       coursework_pass  = COALESCE($11, coursework_pass),
       is_active        = COALESCE($12, is_active),
       updated_at       = NOW()
     WHERE id = $13`,
    [code, name, abbreviation, unit_type, credit_units, year_of_study, semester,
     exam_max, exam_pass, coursework_max, coursework_pass, is_active, unitId]
  );
  res.json({ message: 'Unit updated' });
}

async function deleteUnit(req, res) {
  const { unitId } = req.params;
  await db.query('UPDATE curriculum_units SET is_active = FALSE WHERE id = $1', [unitId]);
  res.json({ message: 'Unit removed' });
}

// ---- Curriculum Configurations ----
async function listConfigs(req, res) {
  const { id } = req.params;
  const { rows } = await db.query(
    `SELECT * FROM curriculum_configs WHERE curriculum_id = $1
     ORDER BY year_of_study, semester`,
    [id]
  );
  res.json(rows);
}

async function upsertConfig(req, res) {
  const { id: curriculum_id } = req.params;
  const { year_of_study, semester, min_courses_core, max_courses_core,
          max_cu, min_cu, max_electives, min_electives,
          on_sem_retake_max, off_sem_retake_max } = req.body;
  if (!year_of_study || !semester) {
    return res.status(400).json({ error: 'year_of_study and semester are required' });
  }
  const { rows } = await db.query(
    `INSERT INTO curriculum_configs
       (curriculum_id, year_of_study, semester, min_courses_core, max_courses_core,
        max_cu, min_cu, max_electives, min_electives, on_sem_retake_max, off_sem_retake_max)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (curriculum_id, year_of_study, semester) DO UPDATE SET
       min_courses_core   = EXCLUDED.min_courses_core,
       max_courses_core   = EXCLUDED.max_courses_core,
       max_cu             = EXCLUDED.max_cu,
       min_cu             = EXCLUDED.min_cu,
       max_electives      = EXCLUDED.max_electives,
       min_electives      = EXCLUDED.min_electives,
       on_sem_retake_max  = EXCLUDED.on_sem_retake_max,
       off_sem_retake_max = EXCLUDED.off_sem_retake_max,
       updated_at         = NOW()
     RETURNING *`,
    [curriculum_id, year_of_study, semester,
     min_courses_core || 0, max_courses_core || 0,
     max_cu || 0, min_cu || 0,
     max_electives || 0, min_electives || 0,
     on_sem_retake_max ?? 3, off_sem_retake_max ?? 7]
  );
  res.json(rows[0]);
}

async function deleteConfig(req, res) {
  const { configId } = req.params;
  await db.query('DELETE FROM curriculum_configs WHERE id = $1', [configId]);
  res.json({ message: 'Config deleted' });
}

module.exports = {
  listCourses, createCourse, updateCourse,
  listCurricula, createCurriculum, getCurriculum, updateCurriculum, replicateCurriculum,
  listUnits, createUnit, updateUnit, deleteUnit,
  listConfigs, upsertConfig, deleteConfig,
};
