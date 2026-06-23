const db = require('../../config/db');

function generateReferenceNo() {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `APP-${year}-${rand}`;
}

async function listApplicants(req, res) {
  const { status, intake_id, search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const params = [];
  const where = ['1=1'];

  if (status) { params.push(status); where.push(`a.status = $${params.length}`); }
  if (search) {
    params.push(`%${search}%`);
    where.push(`(a.first_name ILIKE $${params.length} OR a.last_name ILIKE $${params.length} OR a.reference_no ILIKE $${params.length})`);
  }
  if (intake_id) {
    params.push(intake_id);
    where.push(`EXISTS (SELECT 1 FROM application_programmes ap WHERE ap.applicant_id = a.id AND ap.intake_id = $${params.length})`);
  }

  params.push(limit, offset);
  const { rows } = await db.query(
    `SELECT a.*,
            json_agg(json_build_object('intake_id', ap.intake_id, 'preference_order', ap.preference_order, 'status', ap.status)) AS programme_choices
     FROM applicants a
     LEFT JOIN application_programmes ap ON ap.applicant_id = a.id
     WHERE ${where.join(' AND ')}
     GROUP BY a.id
     ORDER BY a.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const count = await db.query(
    `SELECT COUNT(*) AS total FROM applicants a WHERE ${where.join(' AND ')}`,
    params.slice(0, -2)
  );

  res.json({ data: rows, total: parseInt(count.rows[0].total), page: parseInt(page), limit: parseInt(limit) });
}

async function getApplicant(req, res) {
  const { rows } = await db.query(
    `SELECT a.*,
            json_agg(DISTINCT jsonb_build_object('id', ap.id, 'intake_id', ap.intake_id, 'preference_order', ap.preference_order, 'status', ap.status)) AS programme_choices,
            json_agg(DISTINCT jsonb_build_object('id', aq.id, 'qualification_type', aq.qualification_type, 'institution_name', aq.institution_name, 'year_obtained', aq.year_obtained, 'grade_or_gpa', aq.grade_or_gpa)) AS qualifications
     FROM applicants a
     LEFT JOIN application_programmes ap ON ap.applicant_id = a.id
     LEFT JOIN applicant_qualifications aq ON aq.applicant_id = a.id
     WHERE a.id = $1
     GROUP BY a.id`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Applicant not found' });
  res.json(rows[0]);
}

async function createApplicant(req, res) {
  const {
    first_name, last_name, other_names, email, phone, gender, date_of_birth,
    nationality, district_of_origin, disability_status, application_type,
    programme_choices = [], qualifications = []
  } = req.body;

  if (!first_name || !last_name || !application_type) {
    return res.status(400).json({ error: 'first_name, last_name, application_type are required' });
  }

  let reference_no = generateReferenceNo();
  // Ensure uniqueness
  while ((await db.query('SELECT id FROM applicants WHERE reference_no = $1', [reference_no])).rows[0]) {
    reference_no = generateReferenceNo();
  }

  const { rows } = await db.query(
    `INSERT INTO applicants (reference_no, first_name, last_name, other_names, email, phone, gender,
      date_of_birth, nationality, district_of_origin, disability_status, application_type)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [reference_no, first_name, last_name, other_names, email, phone, gender,
     date_of_birth, nationality, district_of_origin, disability_status, application_type]
  );

  const applicantId = rows[0].id;

  for (const choice of programme_choices) {
    await db.query(
      'INSERT INTO application_programmes (applicant_id, intake_id, preference_order) VALUES ($1, $2, $3)',
      [applicantId, choice.intake_id, choice.preference_order || 1]
    );
  }

  for (const qual of qualifications) {
    await db.query(
      `INSERT INTO applicant_qualifications (applicant_id, qualification_type, institution_name, year_obtained, grade_or_gpa, document_url)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [applicantId, qual.qualification_type, qual.institution_name, qual.year_obtained, qual.grade_or_gpa, qual.document_url]
    );
  }

  res.status(201).json(rows[0]);
}

async function updateStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  const valid = ['submitted', 'shortlisted', 'interviewed', 'offered', 'accepted', 'rejected', 'withdrawn', 'enrolled'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  await db.query('UPDATE applicants SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
  res.json({ message: 'Status updated' });
}

async function makeOffer(req, res) {
  const { applicant_id, intake_id, expires_at } = req.body;
  if (!applicant_id || !intake_id) return res.status(400).json({ error: 'applicant_id and intake_id required' });

  const { rows } = await db.query(
    `INSERT INTO admission_offers (applicant_id, intake_id, offered_by, expires_at)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [applicant_id, intake_id, req.user.id, expires_at || null]
  );

  await db.query('UPDATE applicants SET status = $1, updated_at = NOW() WHERE id = $2', ['offered', applicant_id]);
  await db.query(
    'UPDATE application_programmes SET status = $1 WHERE applicant_id = $2 AND intake_id = $3',
    ['offered', applicant_id, intake_id]
  );

  res.status(201).json(rows[0]);
}

async function acceptOffer(req, res) {
  const { offer_id } = req.params;
  const offer = (await db.query('SELECT * FROM admission_offers WHERE id = $1', [offer_id])).rows[0];
  if (!offer) return res.status(404).json({ error: 'Offer not found' });
  if (offer.status !== 'pending') return res.status(400).json({ error: 'Offer already actioned' });

  await db.query(
    'UPDATE admission_offers SET status = $1, accepted_at = NOW() WHERE id = $2',
    ['accepted', offer_id]
  );
  await db.query(
    'UPDATE applicants SET status = $1, updated_at = NOW() WHERE id = $2',
    ['accepted', offer.applicant_id]
  );

  res.json({ message: 'Offer accepted' });
}

async function enrolStudent(req, res) {
  const { id } = req.params;

  const applicant = (await db.query('SELECT * FROM applicants WHERE id = $1', [id])).rows[0];
  if (!applicant) return res.status(404).json({ error: 'Applicant not found' });
  if (applicant.status !== 'accepted') return res.status(400).json({ error: 'Applicant must be in accepted status to enrol' });

  // Find the accepted offer to get intake + programme
  const offer = (await db.query(
    `SELECT ao.intake_id, i.programme_id
     FROM admission_offers ao
     JOIN intakes i ON i.id = ao.intake_id
     WHERE ao.applicant_id = $1 AND ao.status = 'accepted'
     ORDER BY ao.accepted_at DESC LIMIT 1`,
    [id]
  )).rows[0];

  // Fall back to first programme choice if no offer found
  const fallback = !offer && (await db.query(
    `SELECT ap.intake_id, i.programme_id
     FROM application_programmes ap
     JOIN intakes i ON i.id = ap.intake_id
     WHERE ap.applicant_id = $1
     ORDER BY ap.preference_order LIMIT 1`,
    [id]
  )).rows[0];

  const intake_id = (offer || fallback)?.intake_id;
  const programme_id = (offer || fallback)?.programme_id;
  if (!intake_id || !programme_id) return res.status(400).json({ error: 'No intake/programme linked to this applicant' });

  // Generate student number: A + 5 digits, starting from A10001
  const maxRow = (await db.query(
    `SELECT MAX(CAST(SUBSTRING(student_no FROM 2) AS INTEGER)) AS max_seq
     FROM students WHERE student_no ~ '^A[0-9]+$'`
  )).rows[0];
  const nextSeq = (maxRow.max_seq || 10000) + 1;
  const student_no = `A${nextSeq}`;

  // Create user account for the student
  const bcrypt = require('bcryptjs');
  const email = applicant.email || `${student_no.toLowerCase()}@student.latech.ac.ug`;
  const tempPassword = await bcrypt.hash(student_no, 12);

  const existingUser = (await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()])).rows[0];
  let user_id;
  if (existingUser) {
    user_id = existingUser.id;
  } else {
    const userRow = (await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, other_names, phone, gender, date_of_birth)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [email.toLowerCase(), tempPassword, applicant.first_name, applicant.last_name,
       applicant.other_names, applicant.phone, applicant.gender, applicant.date_of_birth]
    )).rows[0];
    user_id = userRow.id;

    // Assign student role
    const studentRole = (await db.query(`SELECT id FROM roles WHERE name = 'student'`)).rows[0];
    if (studentRole) {
      await db.query(
        'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [user_id, studentRole.id, req.user.id]
      );
    }
  }

  // Create student record
  const studentRow = (await db.query(
    `INSERT INTO students (user_id, student_no, applicant_id, intake_id, programme_id, nationality, enrollment_date)
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE) RETURNING *`,
    [user_id, student_no, id, intake_id, programme_id, applicant.nationality]
  )).rows[0];

  // Mark applicant as enrolled
  await db.query('UPDATE applicants SET status = $1, updated_at = NOW() WHERE id = $2', ['enrolled', id]);

  res.status(201).json({
    message: 'Student enrolled successfully',
    student_no,
    student_id: studentRow.id,
    login_email: email,
    temp_password: student_no,
  });
}

module.exports = { listApplicants, getApplicant, createApplicant, updateStatus, makeOffer, acceptOffer, enrolStudent };
