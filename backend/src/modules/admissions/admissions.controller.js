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

module.exports = { listApplicants, getApplicant, createApplicant, updateStatus, makeOffer, acceptOffer };
