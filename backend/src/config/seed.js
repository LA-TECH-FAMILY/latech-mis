const bcrypt = require('bcryptjs');
const db = require('./db');
require('dotenv').config();

const DEFAULT_ROLES = [
  { name: 'admin', description: 'System administrator — full access' },
  { name: 'registrar', description: 'Academic Registrar — student records, results, registration' },
  { name: 'admissions_officer', description: 'Handles applications and admissions' },
  { name: 'dean', description: 'Faculty Dean — faculty-level oversight' },
  { name: 'hod', description: 'Head of Department — department-level oversight' },
  { name: 'lecturer', description: 'Academic staff — mark entry' },
  { name: 'hr_officer', description: 'HR Officer — staff records' },
  { name: 'finance_officer', description: 'Finance — fees, payments, budgets' },
  { name: 'bursar', description: 'Bursar — financial approvals' },
  { name: 'student', description: 'Student — self-service access' },
  { name: 'applicant', description: 'Applicant — application portal access' },
  { name: 'auditor', description: 'External auditor — read-only access' },
];

async function seed() {
  console.log('Seeding roles...');
  for (const role of DEFAULT_ROLES) {
    await db.query(
      `INSERT INTO roles (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
      [role.name, role.description]
    );
  }
  console.log(`${DEFAULT_ROLES.length} roles seeded.`);

  // Default admin user
  const adminEmail = 'admin@latech.ac.ug';
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
  if (!existing.rows[0]) {
    const hash = await bcrypt.hash('Admin@1234', 12);
    const { rows } = await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name)
       VALUES ($1, $2, 'System', 'Admin') RETURNING id`,
      [adminEmail, hash]
    );
    const adminId = rows[0].id;
    const adminRole = await db.query(`SELECT id FROM roles WHERE name = 'admin'`);
    await db.query(
      'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
      [adminId, adminRole.rows[0].id]
    );
    console.log(`Admin user created: ${adminEmail} / Admin@1234`);
  } else {
    console.log('Admin user already exists, skipping.');
  }

  await db.pool.end();
  console.log('Seed complete.');
}

seed().catch(err => { console.error(err); process.exit(1); });
