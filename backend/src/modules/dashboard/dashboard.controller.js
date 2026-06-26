const db = require('../../config/db');

async function getStats(req, res) {
  const [
    studentsRow,
    applicantsRow,
    structureRow,
    regRow,
    financeRow,
    yearRow,
    staffRow,
    studentStatusRow,
    recentApps,
    progStatsRow,
  ] = await Promise.all([
    // Active students
    db.query(`SELECT COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'active') AS active,
      COUNT(*) FILTER (WHERE status = 'admitted') AS admitted,
      COUNT(*) FILTER (WHERE status = 'graduated') AS graduated,
      COUNT(*) FILTER (WHERE status = 'deferred') AS deferred,
      COUNT(*) FILTER (WHERE status = 'discontinued') AS discontinued
      FROM students`),

    // Applicants
    db.query(`SELECT COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'submitted') AS pending,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS this_week
      FROM applicants`),

    // Academic structure
    db.query(`SELECT
      (SELECT COUNT(*) FROM faculties WHERE is_active = TRUE) AS faculties,
      (SELECT COUNT(*) FROM departments WHERE is_active = TRUE) AS departments,
      (SELECT COUNT(*) FROM programmes WHERE is_active = TRUE) AS programmes,
      (SELECT COUNT(*) FROM courses WHERE is_active = TRUE) AS courses`),

    // Registration by stage (current academic year)
    db.query(`SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'initiated') AS initiated,
      COUNT(*) FILTER (WHERE status = 'accounts_cleared') AS accounts_cleared,
      COUNT(*) FILTER (WHERE status = 'academics_cleared') AS academics_cleared,
      COUNT(*) FILTER (WHERE status = 'accommodation_cleared') AS accommodation_cleared,
      COUNT(*) FILTER (WHERE status = 'fully_registered') AS fully_registered
      FROM student_registrations sr
      JOIN academic_years ay ON ay.id = sr.academic_year_id
      WHERE ay.is_current = TRUE`),

    // Finance summary
    db.query(`SELECT
      COALESCE(SUM(total_amount), 0) AS total_billed,
      COALESCE(SUM(amount_paid), 0) AS total_paid,
      COALESCE(SUM(balance), 0) AS total_balance,
      COUNT(*) AS invoice_count,
      COUNT(*) FILTER (WHERE status = 'paid') AS paid_invoices,
      COUNT(*) FILTER (WHERE status = 'partial') AS partial_invoices,
      COUNT(*) FILTER (WHERE status = 'unpaid') AS unpaid_invoices,
      COALESCE(ROUND(AVG(clearance_percent), 1), 0) AS avg_clearance
      FROM invoices`),

    // Current academic year
    db.query(`SELECT * FROM academic_years WHERE is_current = TRUE LIMIT 1`),

    // Staff count (non-student users)
    db.query(`SELECT COUNT(DISTINCT u.id) AS total,
      COUNT(DISTINCT u.id) FILTER (WHERE ur.role_name = 'lecturer') AS lecturers,
      COUNT(DISTINCT u.id) FILTER (WHERE ur.role_name = 'admin') AS admins
      FROM users u
      LEFT JOIN (
        SELECT ur.user_id, r.name AS role_name
        FROM user_roles ur JOIN roles r ON r.id = ur.role_id
      ) ur ON ur.user_id = u.id
      WHERE u.id NOT IN (SELECT user_id FROM students WHERE user_id IS NOT NULL)`),

    // Students by programme level
    db.query(`SELECT p.level, COUNT(s.id) AS count
      FROM students s
      JOIN programmes p ON p.id = s.programme_id
      WHERE s.status = 'active'
      GROUP BY p.level ORDER BY count DESC`),

    // Recent 5 applications
    db.query(`SELECT a.id, a.first_name, a.last_name, a.status, a.created_at,
      ao.programme_id,
      p.name AS programme_name
      FROM applicants a
      LEFT JOIN admission_offers ao ON ao.applicant_id = a.id
      LEFT JOIN programmes p ON p.id = ao.programme_id
      ORDER BY a.created_at DESC LIMIT 5`),

    // Programmes by level stats
    db.query(`SELECT COALESCE(level,'unknown') AS level, COUNT(*) AS count
      FROM programmes WHERE is_active = TRUE
      GROUP BY level ORDER BY count DESC`),
  ]);

  const currentYear = yearRow.rows[0] || null;
  const reg = regRow.rows[0];
  const regTotal = parseInt(reg?.total || 0);

  // Semester day progress (rough: days since year start / total days)
  let semesterDay = null, semesterTotal = null;
  if (currentYear) {
    const start = new Date(currentYear.start_date);
    const end = new Date(currentYear.end_date);
    const now = new Date();
    const total = Math.round((end - start) / 86400000);
    const elapsed = Math.max(0, Math.round((now - start) / 86400000));
    semesterDay = Math.min(elapsed, total);
    semesterTotal = total;
  }

  res.json({
    students: studentsRow.rows[0],
    applicants: applicantsRow.rows[0],
    structure: structureRow.rows[0],
    registration: { ...reg, total: regTotal },
    finance: financeRow.rows[0],
    staff: staffRow.rows[0],
    studentsByLevel: studentStatusRow.rows,
    recentApplications: recentApps.rows,
    programmesByLevel: progStatsRow.rows,
    currentYear,
    semesterDay,
    semesterTotal,
  });
}

module.exports = { getStats };
