const db = require('../../config/db');

// ─── Registration Windows ─────────────────────────────────────────────────────

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

// ─── Clearance Pipeline ───────────────────────────────────────────────────────

async function initiateRegistration(req, res) {
  const { student_id, academic_year_id, semester } = req.body;
  if (!student_id || !academic_year_id || !semester) {
    return res.status(400).json({ error: 'student_id, academic_year_id, semester required' });
  }

  const student = (await db.query('SELECT * FROM students WHERE id = $1', [student_id])).rows[0];
  if (!student) return res.status(404).json({ error: 'Student not found' });

  // Pull clearance % from invoice if it exists
  const invoice = (await db.query(
    `SELECT clearance_percent FROM invoices WHERE student_id=$1 AND academic_year_id=$2 AND semester=$3 LIMIT 1`,
    [student_id, academic_year_id, semester]
  )).rows[0];

  const clearance_percent = invoice ? parseFloat(invoice.clearance_percent) : 0;

  const { rows } = await db.query(
    `INSERT INTO student_registrations
       (student_id, academic_year_id, semester, clearance_percent, status, initiated_by)
     VALUES ($1, $2, $3, $4, 'initiated', $5)
     ON CONFLICT (student_id, academic_year_id, semester) DO UPDATE
       SET clearance_percent = EXCLUDED.clearance_percent,
           status = CASE WHEN student_registrations.status IN ('rejected','withdrawn') THEN 'initiated'
                         ELSE student_registrations.status END,
           initiated_at = NOW(),
           initiated_by = $5
     RETURNING *`,
    [student_id, academic_year_id, semester, clearance_percent, req.user.id]
  );

  res.status(201).json(rows[0]);
}

async function clearStage(req, res) {
  const { id } = req.params;
  const { stage } = req.body; // 'accounts' | 'academics' | 'accommodation'

  const allowed = ['accounts', 'academics', 'accommodation'];
  if (!allowed.includes(stage)) return res.status(400).json({ error: 'Invalid stage' });

  const reg = (await db.query('SELECT * FROM student_registrations WHERE id = $1', [id])).rows[0];
  if (!reg) return res.status(404).json({ error: 'Registration not found' });

  // Enforce order: accounts → academics → accommodation
  const stageOrder = ['initiated', 'accounts_cleared', 'academics_cleared', 'accommodation_cleared', 'fully_registered'];
  const stageMap = { accounts: 'accounts_cleared', academics: 'academics_cleared', accommodation: 'accommodation_cleared' };
  const targetStatus = stageMap[stage];

  // Accounts can be cleared with financial waiver even if clearance % is low
  if (stage === 'accounts') {
    const window = (await db.query(
      `SELECT min_clearance_percent FROM registration_windows
       WHERE academic_year_id=$1 AND semester=$2 AND is_active=TRUE LIMIT 1`,
      [reg.academic_year_id, reg.semester]
    )).rows[0];

    const minPct = window ? parseFloat(window.min_clearance_percent) : 60;
    if (!reg.financial_waiver && parseFloat(reg.clearance_percent) < minPct) {
      return res.status(400).json({
        error: `Clearance too low. Student has paid ${reg.clearance_percent}% but minimum is ${minPct}%. Grant a waiver or wait for payment.`
      });
    }
  }

  // Determine next status after this clearance
  let nextStatus = targetStatus;
  // If accommodation is cleared, it becomes fully_registered
  if (stage === 'accommodation') nextStatus = 'fully_registered';

  await db.query(
    `UPDATE student_registrations
     SET ${stage}_cleared_by = $1, ${stage}_cleared_at = NOW(), status = $2
     WHERE id = $3`,
    [req.user.id, nextStatus, id]
  );

  // If fully registered, register courses too
  if (nextStatus === 'fully_registered') {
    // Keep any existing registered_courses; just return
  }

  const updated = (await db.query('SELECT * FROM student_registrations WHERE id = $1', [id])).rows[0];
  res.json(updated);
}

async function grantWaiver(req, res) {
  const { id } = req.params;
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: 'reason is required' });

  await db.query(
    `UPDATE student_registrations
     SET financial_waiver=TRUE, waiver_reason=$1, waiver_granted_by=$2, waiver_granted_at=NOW()
     WHERE id=$3`,
    [reason, req.user.id, id]
  );
  res.json({ message: 'Waiver granted' });
}

async function registerCourses(req, res) {
  const { id } = req.params;
  const { course_ids = [] } = req.body;

  const reg = (await db.query('SELECT * FROM student_registrations WHERE id=$1', [id])).rows[0];
  if (!reg) return res.status(404).json({ error: 'Registration not found' });

  await db.query('DELETE FROM registered_courses WHERE registration_id=$1', [id]);
  for (const courseId of course_ids) {
    await db.query(
      'INSERT INTO registered_courses (registration_id, course_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [id, courseId]
    );
  }

  // Mark fully registered once courses are selected (if accommodation already cleared)
  if (reg.accommodation_cleared_at || reg.status === 'accommodation_cleared') {
    await db.query(
      "UPDATE student_registrations SET status='fully_registered' WHERE id=$1",
      [id]
    );
  }

  res.json({ courses_registered: course_ids.length });
}

// ─── List & Stats ─────────────────────────────────────────────────────────────

async function listRegistrations(req, res) {
  const { academic_year_id, semester, status, search, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;
  const params = [];
  const where = ['1=1'];

  if (academic_year_id) { params.push(academic_year_id); where.push(`sr.academic_year_id = $${params.length}`); }
  if (semester) { params.push(parseInt(semester)); where.push(`sr.semester = $${params.length}`); }
  if (status) { params.push(status); where.push(`sr.status = $${params.length}`); }
  if (search) {
    params.push(`%${search}%`);
    where.push(`(s.student_no ILIKE $${params.length} OR u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length})`);
  }

  const { rows } = await db.query(
    `SELECT
       sr.id, sr.status, sr.clearance_percent, sr.financial_waiver,
       sr.accounts_cleared_at, sr.academics_cleared_at, sr.accommodation_cleared_at,
       sr.initiated_at, sr.registered_at,
       s.student_no, s.year_of_study, s.nationality, s.student_type,
       u.first_name, u.last_name, u.email,
       p.name AS programme_name, p.code AS programme_code,
       ay.label AS academic_year_label,
       COALESCE(inv.total_amount, 0) AS total_fees,
       COALESCE(inv.amount_paid, 0) AS fees_paid,
       COALESCE(inv.clearance_percent, 0) AS live_clearance_pct,
       inv.status AS invoice_status
     FROM student_registrations sr
     JOIN students s ON s.id = sr.student_id
     JOIN users u ON u.id = s.user_id
     JOIN programmes p ON p.id = s.programme_id
     JOIN academic_years ay ON ay.id = sr.academic_year_id
     LEFT JOIN invoices inv ON inv.student_id = sr.student_id
       AND inv.academic_year_id = sr.academic_year_id
       AND inv.semester = sr.semester
     WHERE ${where.join(' AND ')}
     ORDER BY sr.initiated_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  const count = (await db.query(
    `SELECT COUNT(*) AS total
     FROM student_registrations sr
     JOIN students s ON s.id = sr.student_id
     JOIN users u ON u.id = s.user_id
     WHERE ${where.join(' AND ')}`,
    params
  )).rows[0].total;

  res.json({ data: rows, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
}

async function getSemesterStats(req, res) {
  const { academic_year_id, semester } = req.query;
  if (!academic_year_id || !semester) return res.status(400).json({ error: 'academic_year_id and semester required' });

  const { rows } = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'initiated') AS initiated,
       COUNT(*) FILTER (WHERE status = 'accounts_cleared') AS accounts_cleared,
       COUNT(*) FILTER (WHERE status = 'academics_cleared') AS academics_cleared,
       COUNT(*) FILTER (WHERE status = 'accommodation_cleared') AS accommodation_cleared,
       COUNT(*) FILTER (WHERE status = 'fully_registered') AS fully_registered,
       COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
       COUNT(*) AS total
     FROM student_registrations
     WHERE academic_year_id = $1 AND semester = $2`,
    [academic_year_id, parseInt(semester)]
  );
  res.json(rows[0]);
}

async function getStudentRegistration(req, res) {
  const { student_id, academic_year_id, semester } = req.params;
  const { rows } = await db.query(
    `SELECT sr.*, ay.label AS academic_year_label,
            json_agg(json_build_object('course_id', rc.course_id, 'course_code', c.code, 'course_name', c.name, 'credit_units', c.credit_units)) FILTER (WHERE rc.id IS NOT NULL) AS courses
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

// Legacy endpoint kept for backward compat
async function registerStudent(req, res) {
  return initiateRegistration(req, res);
}

module.exports = {
  listWindows, createWindow,
  initiateRegistration, clearStage, grantWaiver, registerCourses,
  listRegistrations, getSemesterStats, getStudentRegistration,
  registerStudent,
};
