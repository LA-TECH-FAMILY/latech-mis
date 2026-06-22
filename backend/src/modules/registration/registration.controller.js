const db = require('../../config/db');

async function listWindows(req, res) {
  const { rows } = await db.query(
    `SELECT rw.*, ay.label AS academic_year_label FROM registration_windows rw
     JOIN academic_years ay ON ay.id = rw.academic_year_id ORDER BY rw.open_date DESC`
  );
  res.json(rows);
}

async function createWindow(req, res) {
  const { academic_year_id, semester, open_date, close_date, min_clearance_percent } = req.body;
  if (!academic_year_id || !semester || !open_date || !close_date) {
    return res.status(400).json({ error: 'academic_year_id, semester, open_date, close_date required' });
  }
  const { rows } = await db.query(
    `INSERT INTO registration_windows (academic_year_id, semester, open_date, close_date, min_clearance_percent)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [academic_year_id, semester, open_date, close_date, min_clearance_percent || 60]
  );
  res.status(201).json(rows[0]);
}

async function registerStudent(req, res) {
  const { student_id, academic_year_id, semester, course_ids = [], clearance_percent } = req.body;
  if (!student_id || !academic_year_id || !semester) {
    return res.status(400).json({ error: 'student_id, academic_year_id, semester required' });
  }

  // Check for open window
  const windowCheck = await db.query(
    `SELECT * FROM registration_windows
     WHERE academic_year_id = $1 AND semester = $2 AND is_active = TRUE
     AND open_date <= NOW() AND close_date >= NOW()`,
    [academic_year_id, semester]
  );
  if (!windowCheck.rows[0]) {
    return res.status(400).json({ error: 'Registration window is not open for this semester' });
  }

  const window = windowCheck.rows[0];
  const pct = clearance_percent || 0;

  let status = 'rejected';
  if (pct >= window.min_clearance_percent) status = 'full';
  else if (pct > 0) status = 'provisional';

  if (status === 'rejected') {
    return res.status(400).json({ error: `Clearance too low. Minimum required: ${window.min_clearance_percent}%` });
  }

  // Upsert registration
  const { rows } = await db.query(
    `INSERT INTO student_registrations (student_id, academic_year_id, semester, clearance_percent, status)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (student_id, academic_year_id, semester) DO UPDATE
     SET clearance_percent = $4, status = $5, registered_at = NOW()
     RETURNING *`,
    [student_id, academic_year_id, semester, pct, status]
  );

  const regId = rows[0].id;

  // Register courses
  if (course_ids.length > 0) {
    await db.query('DELETE FROM registered_courses WHERE registration_id = $1', [regId]);
    for (const courseId of course_ids) {
      await db.query(
        'INSERT INTO registered_courses (registration_id, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [regId, courseId]
      );
    }
  }

  res.json({ registration: rows[0], courses_registered: course_ids.length });
}

async function getStudentRegistration(req, res) {
  const { student_id, academic_year_id, semester } = req.params;
  const { rows } = await db.query(
    `SELECT sr.*, ay.label AS academic_year_label,
            json_agg(json_build_object('course_id', rc.course_id, 'course_code', c.code, 'course_name', c.name, 'credit_units', c.credit_units)) AS courses
     FROM student_registrations sr
     JOIN academic_years ay ON ay.id = sr.academic_year_id
     LEFT JOIN registered_courses rc ON rc.registration_id = sr.id
     LEFT JOIN courses c ON c.id = rc.course_id
     WHERE sr.student_id = $1 AND sr.academic_year_id = $2 AND sr.semester = $3
     GROUP BY sr.id, ay.label`,
    [student_id, academic_year_id, semester]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Registration not found' });
  res.json(rows[0]);
}

module.exports = { listWindows, createWindow, registerStudent, getStudentRegistration };
