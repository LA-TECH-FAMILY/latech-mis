const db = require('../../config/db');

function calcGrade(total) {
  if (total >= 80) return { grade: 'A', grade_point: 5.0 };
  if (total >= 75) return { grade: 'B+', grade_point: 4.5 };
  if (total >= 70) return { grade: 'B', grade_point: 4.0 };
  if (total >= 65) return { grade: 'C+', grade_point: 3.5 };
  if (total >= 60) return { grade: 'C', grade_point: 3.0 };
  if (total >= 55) return { grade: 'D+', grade_point: 2.5 };
  if (total >= 50) return { grade: 'D', grade_point: 2.0 };
  if (total >= 45) return { grade: 'E', grade_point: 1.5 };
  return { grade: 'F', grade_point: 0.0 };
}

async function enterMarks(req, res) {
  const { student_id, course_id, academic_year_id, semester, coursework_mark, exam_mark } = req.body;
  if (!student_id || !course_id || !academic_year_id || !semester) {
    return res.status(400).json({ error: 'student_id, course_id, academic_year_id, semester required' });
  }

  const total = (coursework_mark || 0) * 0.4 + (exam_mark || 0) * 0.6;
  const { grade, grade_point } = calcGrade(total);

  const { rows } = await db.query(
    `INSERT INTO mark_entries (student_id, course_id, academic_year_id, semester, coursework_mark, exam_mark, grade, grade_point, entered_by, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft')
     ON CONFLICT (student_id, course_id, academic_year_id, semester) DO UPDATE
     SET coursework_mark = $5, exam_mark = $6, grade = $7, grade_point = $8, entered_by = $9, status = 'draft', entered_at = NOW()
     RETURNING *`,
    [student_id, course_id, academic_year_id, semester, coursework_mark, exam_mark, grade, grade_point, req.user.id]
  );
  res.json(rows[0]);
}

async function submitMarks(req, res) {
  const { course_id, academic_year_id, semester } = req.body;
  await db.query(
    `UPDATE mark_entries SET status = 'submitted'
     WHERE course_id = $1 AND academic_year_id = $2 AND semester = $3 AND status = 'draft'`,
    [course_id, academic_year_id, semester]
  );
  res.json({ message: 'Marks submitted for HoD approval' });
}

async function hodApprove(req, res) {
  const { course_id, academic_year_id, semester } = req.body;
  await db.query(
    `UPDATE mark_entries SET status = 'hod_approved', hod_approved_by = $4, hod_approved_at = NOW()
     WHERE course_id = $1 AND academic_year_id = $2 AND semester = $3 AND status = 'submitted'`,
    [course_id, academic_year_id, semester, req.user.id]
  );
  res.json({ message: 'Marks approved by HoD, forwarded to Registrar' });
}

async function registrarApprove(req, res) {
  const { course_id, academic_year_id, semester } = req.body;
  await db.query(
    `UPDATE mark_entries SET status = 'registrar_approved', registrar_approved_by = $4, registrar_approved_at = NOW()
     WHERE course_id = $1 AND academic_year_id = $2 AND semester = $3 AND status = 'hod_approved'`,
    [course_id, academic_year_id, semester, req.user.id]
  );
  res.json({ message: 'Marks approved by Registrar' });
}

async function publishMarks(req, res) {
  const { course_id, academic_year_id, semester } = req.body;
  await db.query(
    `UPDATE mark_entries SET status = 'published', published_at = NOW()
     WHERE course_id = $1 AND academic_year_id = $2 AND semester = $3 AND status = 'registrar_approved'`,
    [course_id, academic_year_id, semester]
  );
  res.json({ message: 'Results published to students' });
}

async function getStudentResults(req, res) {
  const { student_id } = req.params;
  const { academic_year_id, semester } = req.query;

  // Students can only see published results; staff can see all
  const roles = req.user.roles || [];
  const isStudent = roles.includes('student') && !roles.includes('admin') && !roles.includes('registrar');

  const where = ['me.student_id = $1'];
  const params = [student_id];

  if (isStudent) where.push("me.status = 'published'");
  if (academic_year_id) { params.push(academic_year_id); where.push(`me.academic_year_id = $${params.length}`); }
  if (semester) { params.push(semester); where.push(`me.semester = $${params.length}`); }

  const { rows } = await db.query(
    `SELECT me.*, c.code AS course_code, c.name AS course_name, c.credit_units, ay.label AS academic_year_label
     FROM mark_entries me
     JOIN courses c ON c.id = me.course_id
     JOIN academic_years ay ON ay.id = me.academic_year_id
     WHERE ${where.join(' AND ')}
     ORDER BY ay.start_date DESC, me.semester, c.code`,
    params
  );
  res.json(rows);
}

async function getCourseMarks(req, res) {
  const { course_id, academic_year_id, semester } = req.query;
  if (!course_id || !academic_year_id || !semester) {
    return res.status(400).json({ error: 'course_id, academic_year_id, semester required' });
  }
  const { rows } = await db.query(
    `SELECT me.*, u.first_name, u.last_name, s.student_no
     FROM mark_entries me
     JOIN students s ON s.id = me.student_id
     JOIN users u ON u.id = s.user_id
     WHERE me.course_id = $1 AND me.academic_year_id = $2 AND me.semester = $3
     ORDER BY u.last_name, u.first_name`,
    [course_id, academic_year_id, semester]
  );
  res.json(rows);
}

module.exports = { enterMarks, submitMarks, hodApprove, registrarApprove, publishMarks, getStudentResults, getCourseMarks };
