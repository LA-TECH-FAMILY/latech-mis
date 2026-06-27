const db = require('../../config/db');

// ─── Fee Items ────────────────────────────────────────────────────────────────

async function listFeeItems(req, res) {
  const { category } = req.query;
  const where = category ? `WHERE category = $1` : '';
  const { rows } = await db.query(
    `SELECT * FROM fee_items ${where} ORDER BY category, name`,
    category ? [category] : []
  );
  res.json(rows);
}

async function createFeeItem(req, res) {
  const { name, description, category, billing_period } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const { rows } = await db.query(
    'INSERT INTO fee_items (name, description, category, billing_period) VALUES ($1, $2, $3, $4) RETURNING *',
    [name, description, category || 'other', billing_period || 'per_semester']
  );
  res.status(201).json(rows[0]);
}

async function updateFeeItem(req, res) {
  const { id } = req.params;
  const { name, description, is_active, category, billing_period } = req.body;
  await db.query(
    `UPDATE fee_items SET
       name           = COALESCE($1, name),
       description    = COALESCE($2, description),
       is_active      = COALESCE($3, is_active),
       category       = COALESCE($4, category),
       billing_period = COALESCE($5, billing_period)
     WHERE id = $6`,
    [name, description, is_active, category, billing_period, id]
  );
  res.json({ message: 'Updated' });
}

// ─── Fee Structures ────────────────────────────────────────────────────────────

async function listFeeStructures(req, res) {
  const { academic_year_id, semester, status } = req.query;
  const params = [];
  const where = ['1=1'];
  if (academic_year_id) { params.push(academic_year_id); where.push(`fs.academic_year_id = $${params.length}`); }
  if (semester) { params.push(parseInt(semester)); where.push(`(fs.semester = $${params.length} OR fs.semester IS NULL)`); }
  if (status) { params.push(status); where.push(`fs.status = $${params.length}`); }

  const { rows } = await db.query(
    `SELECT fs.*,
            fi.name AS fee_item_name, fi.category, fi.description AS fee_item_description,
            ay.label AS academic_year_label,
            p.name AS programme_name, p.code AS programme_code,
            u.first_name || ' ' || u.last_name AS created_by_name,
            ab.first_name || ' ' || ab.last_name AS approved_by_name
     FROM fee_structures fs
     JOIN fee_items fi ON fi.id = fs.fee_item_id
     JOIN academic_years ay ON ay.id = fs.academic_year_id
     LEFT JOIN programmes p ON p.id = fs.programme_id
     LEFT JOIN users u ON u.id = fs.created_by
     LEFT JOIN users ab ON ab.id = fs.approved_by
     WHERE ${where.join(' AND ')}
     ORDER BY fs.semester NULLS LAST, fi.category, fi.name, p.name NULLS FIRST`,
    params
  );
  res.json(rows);
}

async function getFeeStructureStats(req, res) {
  const { academic_year_id } = req.query;
  if (!academic_year_id) return res.status(400).json({ error: 'academic_year_id required' });
  const { rows } = await db.query(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'approved') AS approved,
       COUNT(*) FILTER (WHERE status = 'draft') AS draft,
       COUNT(*) FILTER (WHERE status = 'outgoing') AS outgoing,
       COUNT(DISTINCT fi.category) AS categories,
       COALESCE(SUM(fs.amount) FILTER (WHERE status = 'approved' AND fs.programme_id IS NULL AND fs.semester = 1), 0) AS sem1_total,
       COALESCE(SUM(fs.amount) FILTER (WHERE status = 'approved' AND fs.programme_id IS NULL AND fs.semester = 2), 0) AS sem2_total
     FROM fee_structures fs
     JOIN fee_items fi ON fi.id = fs.fee_item_id
     WHERE fs.academic_year_id = $1`,
    [academic_year_id]
  );
  res.json(rows[0]);
}

async function createFeeStructure(req, res) {
  const {
    academic_year_id, programme_id, year_of_study, semester,
    fee_item_id, amount, status, student_type, billing_period, notes,
  } = req.body;
  if (!academic_year_id || !fee_item_id || !amount) {
    return res.status(400).json({ error: 'academic_year_id, fee_item_id, amount are required' });
  }
  const { rows } = await db.query(
    `INSERT INTO fee_structures
       (academic_year_id, programme_id, year_of_study, semester, fee_item_id,
        amount, status, student_type, billing_period, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      academic_year_id, programme_id || null, year_of_study || null, semester || null,
      fee_item_id, amount,
      status || 'draft', student_type || 'all', billing_period || 'per_semester',
      notes || null, req.user.id,
    ]
  );
  res.status(201).json(rows[0]);
}

async function updateFeeStructure(req, res) {
  const { id } = req.params;
  const { amount, status, student_type, billing_period, notes, programme_id, year_of_study, semester } = req.body;

  const existing = (await db.query('SELECT * FROM fee_structures WHERE id=$1', [id])).rows[0];
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (existing.status === 'approved' && status !== 'outgoing') {
    return res.status(400).json({ error: 'Approved fee structures can only be set to outgoing' });
  }

  await db.query(
    `UPDATE fee_structures SET
       amount         = COALESCE($1, amount),
       status         = COALESCE($2, status),
       student_type   = COALESCE($3, student_type),
       billing_period = COALESCE($4, billing_period),
       notes          = COALESCE($5, notes),
       programme_id   = $6,
       year_of_study  = $7,
       semester       = $8,
       updated_at     = NOW()
     WHERE id = $9`,
    [amount, status, student_type, billing_period, notes,
     programme_id || null, year_of_study || null, semester || null, id]
  );
  res.json({ message: 'Updated' });
}

async function approveFeeStructure(req, res) {
  const { id } = req.params;
  const { action } = req.body; // 'approve' | 'decline' | 'outgoing'
  const statusMap = { approve: 'approved', decline: 'draft', outgoing: 'outgoing' };
  const newStatus = statusMap[action];
  if (!newStatus) return res.status(400).json({ error: 'Invalid action' });

  await db.query(
    `UPDATE fee_structures SET
       status = $1::varchar,
       approved_by = CASE WHEN $1::varchar = 'approved' THEN $2::uuid ELSE approved_by END,
       approved_at = CASE WHEN $1::varchar = 'approved' THEN NOW() ELSE approved_at END,
       updated_at  = NOW()
     WHERE id = $3::uuid`,
    [newStatus, req.user.id, id]
  );
  res.json({ message: `Fee structure ${action}d` });
}

async function deleteFeeStructure(req, res) {
  const existing = (await db.query('SELECT status FROM fee_structures WHERE id=$1', [req.params.id])).rows[0];
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (existing.status === 'approved') return res.status(400).json({ error: 'Cannot delete an approved fee structure. Set it to outgoing first.' });
  await db.query('DELETE FROM fee_structures WHERE id = $1', [req.params.id]);
  res.json({ message: 'Deleted' });
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

function generateInvoiceNo() {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 900000) + 100000);
  return `INV-${year}-${rand}`;
}

async function listInvoices(req, res) {
  const { student_id, academic_year_id, semester, status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const params = [];
  const where = ['1=1'];

  if (student_id) { params.push(student_id); where.push(`i.student_id = $${params.length}`); }
  if (academic_year_id) { params.push(academic_year_id); where.push(`i.academic_year_id = $${params.length}`); }
  if (semester) { params.push(semester); where.push(`i.semester = $${params.length}`); }
  if (status) { params.push(status); where.push(`i.status = $${params.length}`); }

  const { rows } = await db.query(
    `SELECT i.*,
            s.student_no, u.first_name, u.last_name,
            ay.label AS academic_year_label
     FROM invoices i
     JOIN students s ON s.id = i.student_id
     JOIN users u ON u.id = s.user_id
     JOIN academic_years ay ON ay.id = i.academic_year_id
     WHERE ${where.join(' AND ')}
     ORDER BY i.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  const count = await db.query(
    `SELECT COUNT(*) AS total FROM invoices i WHERE ${where.join(' AND ')}`,
    params
  );

  res.json({ data: rows, total: parseInt(count.rows[0].total), page: parseInt(page), limit: parseInt(limit) });
}

async function getInvoice(req, res) {
  const { id } = req.params;
  const inv = (await db.query(
    `SELECT i.*,
            s.student_no, u.first_name, u.last_name, u.email,
            ay.label AS academic_year_label,
            p.name AS programme_name
     FROM invoices i
     JOIN students s ON s.id = i.student_id
     JOIN users u ON u.id = s.user_id
     JOIN academic_years ay ON ay.id = i.academic_year_id
     JOIN programmes p ON p.id = s.programme_id
     WHERE i.id = $1`,
    [id]
  )).rows[0];
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });

  const items = (await db.query(
    `SELECT ii.*, fi.name AS fee_item_name
     FROM invoice_items ii
     JOIN fee_items fi ON fi.id = ii.fee_item_id
     WHERE ii.invoice_id = $1`,
    [id]
  )).rows;

  const pmts = (await db.query(
    `SELECT p.*, u.first_name || ' ' || u.last_name AS received_by_name
     FROM payments p
     LEFT JOIN users u ON u.id = p.received_by
     WHERE p.invoice_id = $1
     ORDER BY p.payment_date DESC`,
    [id]
  )).rows;

  res.json({ ...inv, items, payments: pmts });
}

async function createInvoice(req, res) {
  const { student_id, academic_year_id, semester } = req.body;
  if (!student_id || !academic_year_id || !semester) {
    return res.status(400).json({ error: 'student_id, academic_year_id, semester are required' });
  }

  // Prevent duplicate invoices
  const existing = (await db.query(
    'SELECT id FROM invoices WHERE student_id=$1 AND academic_year_id=$2 AND semester=$3',
    [student_id, academic_year_id, semester]
  )).rows[0];
  if (existing) return res.status(409).json({ error: 'Invoice already exists for this student/year/semester', invoice_id: existing.id });

  // Fetch student to get programme + year_of_study
  const student = (await db.query('SELECT * FROM students WHERE id = $1', [student_id])).rows[0];
  if (!student) return res.status(404).json({ error: 'Student not found' });

  // Resolve fee structures (most specific wins per fee_item)
  const { rows: structs } = await db.query(
    `SELECT DISTINCT ON (fee_item_id) fs.*, fi.name AS fee_item_name
     FROM fee_structures fs
     JOIN fee_items fi ON fi.id = fs.fee_item_id
     WHERE fs.academic_year_id = $1
       AND (fs.programme_id IS NULL OR fs.programme_id = $2)
       AND (fs.year_of_study IS NULL OR fs.year_of_study = $3)
       AND (fs.semester IS NULL OR fs.semester = $4)
     ORDER BY fee_item_id,
              (fs.programme_id IS NOT NULL)::int DESC,
              (fs.year_of_study IS NOT NULL)::int DESC,
              (fs.semester IS NOT NULL)::int DESC`,
    [academic_year_id, student.programme_id, student.year_of_study, semester]
  );

  const total = structs.reduce((s, r) => s + parseFloat(r.amount), 0);

  let invoice_no = generateInvoiceNo();
  while ((await db.query('SELECT id FROM invoices WHERE invoice_no=$1', [invoice_no])).rows[0]) {
    invoice_no = generateInvoiceNo();
  }

  const inv = (await db.query(
    `INSERT INTO invoices (invoice_no, student_id, academic_year_id, semester, total_amount, created_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [invoice_no, student_id, academic_year_id, semester, total, req.user.id]
  )).rows[0];

  for (const s of structs) {
    await db.query(
      'INSERT INTO invoice_items (invoice_id, fee_item_id, description, amount) VALUES ($1,$2,$3,$4)',
      [inv.id, s.fee_item_id, s.fee_item_name, s.amount]
    );
  }

  res.status(201).json({ ...inv, items: structs.map(s => ({ description: s.fee_item_name, amount: s.amount })) });
}

// ─── Payments ─────────────────────────────────────────────────────────────────

function generateReceiptNo() {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 900000) + 100000);
  return `RCT-${year}-${rand}`;
}

async function recordPayment(req, res) {
  const { invoice_id, amount, payment_method, reference_no, payment_date, notes } = req.body;
  if (!invoice_id || !amount || !payment_date) {
    return res.status(400).json({ error: 'invoice_id, amount, payment_date are required' });
  }

  const inv = (await db.query('SELECT * FROM invoices WHERE id = $1', [invoice_id])).rows[0];
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });
  if (['paid', 'waived', 'cancelled'].includes(inv.status)) {
    return res.status(400).json({ error: `Invoice is already ${inv.status}` });
  }

  let receipt_no = generateReceiptNo();
  while ((await db.query('SELECT id FROM payments WHERE receipt_no=$1', [receipt_no])).rows[0]) {
    receipt_no = generateReceiptNo();
  }

  const pmt = (await db.query(
    `INSERT INTO payments (receipt_no, invoice_id, student_id, amount, payment_method, reference_no, payment_date, received_by, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [receipt_no, invoice_id, inv.student_id, amount, payment_method || 'bank', reference_no || null, payment_date, req.user.id, notes || null]
  )).rows[0];

  // Update invoice totals
  const newPaid = parseFloat(inv.amount_paid) + parseFloat(amount);
  const newStatus = newPaid >= parseFloat(inv.total_amount) ? 'paid'
                  : newPaid > 0 ? 'partial'
                  : 'unpaid';

  await db.query(
    'UPDATE invoices SET amount_paid=$1, status=$2, updated_at=NOW() WHERE id=$3',
    [newPaid, newStatus, invoice_id]
  );

  res.status(201).json({ ...pmt, invoice_status: newStatus });
}

async function listPayments(req, res) {
  const { student_id, invoice_id, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const params = [];
  const where = ['1=1'];

  if (student_id) { params.push(student_id); where.push(`p.student_id = $${params.length}`); }
  if (invoice_id) { params.push(invoice_id); where.push(`p.invoice_id = $${params.length}`); }

  const { rows } = await db.query(
    `SELECT p.*, s.student_no, u.first_name, u.last_name, i.invoice_no
     FROM payments p
     JOIN students s ON s.id = p.student_id
     JOIN users u ON u.id = s.user_id
     JOIN invoices i ON i.id = p.invoice_id
     WHERE ${where.join(' AND ')}
     ORDER BY p.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  const count = await db.query(
    `SELECT COUNT(*) AS total FROM payments p WHERE ${where.join(' AND ')}`,
    params
  );

  res.json({ data: rows, total: parseInt(count.rows[0].total), page: parseInt(page), limit: parseInt(limit) });
}

async function getStudentFinancials(req, res) {
  const { student_id } = req.params;

  const student = (await db.query(
    `SELECT s.*, u.first_name, u.last_name, u.email, p.name AS programme_name
     FROM students s JOIN users u ON u.id=s.user_id JOIN programmes p ON p.id=s.programme_id
     WHERE s.id=$1`,
    [student_id]
  )).rows[0];
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const invoices = (await db.query(
    `SELECT i.*, ay.label AS academic_year_label
     FROM invoices i JOIN academic_years ay ON ay.id=i.academic_year_id
     WHERE i.student_id=$1 ORDER BY i.created_at DESC`,
    [student_id]
  )).rows;

  res.json({ student, invoices });
}

// ─── Tuition Fees ─────────────────────────────────────────────────────────────

async function listTuitionFees(req, res) {
  const { academic_year_id, status } = req.query;
  const params = [];
  const where = ['1=1'];
  if (academic_year_id) { params.push(academic_year_id); where.push(`tf.academic_year_id = $${params.length}`); }
  if (status) { params.push(status); where.push(`tf.status = $${params.length}`); }

  const { rows } = await db.query(
    `SELECT tf.*,
            p.name AS programme_name, p.code AS programme_code, p.level AS programme_level,
            p.study_mode, p.duration_years,
            d.name AS department_name,
            f.name AS faculty_name,
            ay.label AS academic_year_label,
            u.first_name || ' ' || u.last_name AS created_by_name
     FROM tuition_fees tf
     JOIN programmes p ON p.id = tf.programme_id
     LEFT JOIN departments d ON d.id = p.department_id
     LEFT JOIN faculties f ON f.id = d.faculty_id
     JOIN academic_years ay ON ay.id = tf.academic_year_id
     LEFT JOIN users u ON u.id = tf.created_by
     WHERE ${where.join(' AND ')}
     ORDER BY f.name NULLS LAST, d.name NULLS LAST, p.name`,
    params
  );
  res.json(rows);
}

async function upsertTuitionFee(req, res) {
  const { academic_year_id, programme_id, national_amount, international_amount, study_time, status, notes } = req.body;
  if (!academic_year_id || !programme_id) {
    return res.status(400).json({ error: 'academic_year_id and programme_id are required' });
  }

  const { rows } = await db.query(
    `INSERT INTO tuition_fees
       (academic_year_id, programme_id, national_amount, international_amount, study_time, status, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (academic_year_id, programme_id, study_time) DO UPDATE SET
       national_amount      = EXCLUDED.national_amount,
       international_amount = EXCLUDED.international_amount,
       status               = EXCLUDED.status,
       notes                = EXCLUDED.notes,
       updated_at           = NOW()
     RETURNING *`,
    [
      academic_year_id, programme_id,
      national_amount || 0, international_amount || 0,
      study_time || 'day', status || 'current',
      notes || null, req.user.id,
    ]
  );
  res.status(201).json(rows[0]);
}

async function updateTuitionFee(req, res) {
  const { id } = req.params;
  const { national_amount, international_amount, study_time, status, notes } = req.body;
  await db.query(
    `UPDATE tuition_fees SET
       national_amount      = COALESCE($1, national_amount),
       international_amount = COALESCE($2, international_amount),
       study_time           = COALESCE($3, study_time),
       status               = COALESCE($4, status),
       notes                = COALESCE($5, notes),
       updated_at           = NOW()
     WHERE id = $6`,
    [national_amount, international_amount, study_time, status, notes, id]
  );
  res.json({ message: 'Updated' });
}

async function deleteTuitionFee(req, res) {
  await db.query('DELETE FROM tuition_fees WHERE id = $1', [req.params.id]);
  res.json({ message: 'Deleted' });
}

module.exports = {
  listFeeItems, createFeeItem, updateFeeItem,
  listFeeStructures, getFeeStructureStats, createFeeStructure, updateFeeStructure, approveFeeStructure, deleteFeeStructure,
  listTuitionFees, upsertTuitionFee, updateTuitionFee, deleteTuitionFee,
  listInvoices, getInvoice, createInvoice,
  recordPayment, listPayments, getStudentFinancials,
};
