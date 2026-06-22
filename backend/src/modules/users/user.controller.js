const bcrypt = require('bcryptjs');
const db = require('../../config/db');

async function listUsers(req, res) {
  const { role, search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let where = ['1=1'];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    where.push(`(u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }

  const baseQuery = `
    SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.is_active, u.last_login, u.created_at,
           ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL) AS roles
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    WHERE ${where.join(' AND ')}
    GROUP BY u.id
    ${role ? `HAVING '${role}' = ANY(ARRAY_AGG(r.name))` : ''}
    ORDER BY u.first_name, u.last_name
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const countQuery = `
    SELECT COUNT(DISTINCT u.id) AS total
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    WHERE ${where.join(' AND ')}
    ${role ? `AND EXISTS (SELECT 1 FROM user_roles ur2 JOIN roles r2 ON r2.id = ur2.role_id WHERE ur2.user_id = u.id AND r2.name = '${role}')` : ''}
  `;

  const [data, count] = await Promise.all([
    db.query(baseQuery, [...params, limit, offset]),
    db.query(countQuery, params),
  ]);

  res.json({
    data: data.rows,
    total: parseInt(count.rows[0].total),
    page: parseInt(page),
    limit: parseInt(limit),
  });
}

async function getUser(req, res) {
  const { id } = req.params;
  const { rows } = await db.query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.other_names, u.phone, u.gender,
            u.date_of_birth, u.profile_photo_url, u.is_active, u.last_login, u.created_at,
            ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL) AS roles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE u.id = $1
     GROUP BY u.id`,
    [id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
}

async function createUser(req, res) {
  const { email, password, first_name, last_name, other_names, phone, gender, date_of_birth, roles: roleNames = [] } = req.body;

  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ error: 'email, password, first_name, last_name are required' });
  }

  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows[0]) return res.status(409).json({ error: 'Email already in use' });

  const hash = await bcrypt.hash(password, 12);

  const { rows } = await db.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, other_names, phone, gender, date_of_birth)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [email.toLowerCase(), hash, first_name, last_name, other_names, phone, gender, date_of_birth]
  );

  const userId = rows[0].id;

  if (roleNames.length > 0) {
    const { rows: roleRows } = await db.query(
      `SELECT id, name FROM roles WHERE name = ANY($1)`,
      [roleNames]
    );
    for (const role of roleRows) {
      await db.query(
        'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [userId, role.id, req.user.id]
      );
    }
  }

  res.status(201).json({ id: userId, message: 'User created' });
}

async function updateUser(req, res) {
  const { id } = req.params;
  const { first_name, last_name, other_names, phone, gender, date_of_birth, is_active } = req.body;

  await db.query(
    `UPDATE users SET
       first_name = COALESCE($1, first_name),
       last_name = COALESCE($2, last_name),
       other_names = COALESCE($3, other_names),
       phone = COALESCE($4, phone),
       gender = COALESCE($5, gender),
       date_of_birth = COALESCE($6, date_of_birth),
       is_active = COALESCE($7, is_active),
       updated_at = NOW()
     WHERE id = $8`,
    [first_name, last_name, other_names, phone, gender, date_of_birth, is_active, id]
  );

  res.json({ message: 'User updated' });
}

async function assignRoles(req, res) {
  const { id } = req.params;
  const { roles: roleNames } = req.body;

  await db.query('DELETE FROM user_roles WHERE user_id = $1', [id]);

  if (roleNames && roleNames.length > 0) {
    const { rows } = await db.query('SELECT id FROM roles WHERE name = ANY($1)', [roleNames]);
    for (const role of rows) {
      await db.query(
        'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $3)',
        [id, role.id, req.user.id]
      );
    }
  }

  res.json({ message: 'Roles updated' });
}

async function listRoles(req, res) {
  const { rows } = await db.query('SELECT id, name, description FROM roles ORDER BY name');
  res.json(rows);
}

module.exports = { listUsers, getUser, createUser, updateUser, assignRoles, listRoles };
