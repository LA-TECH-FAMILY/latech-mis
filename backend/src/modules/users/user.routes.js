const router = require('express').Router();
const { authenticate, requireRole } = require('../../middleware/auth.middleware');
const wrap = require('../../middleware/asyncHandler');
const { listUsers, getUser, createUser, updateUser, assignRoles, listRoles, searchStudents, listStudents } = require('./user.controller');

router.use(authenticate);

router.get('/search/students', requireRole('admin', 'registrar'), wrap(searchStudents));
router.get('/students', requireRole('admin', 'registrar', 'finance_officer', 'hod', 'dean'), wrap(listStudents));
router.get('/', requireRole('admin', 'registrar', 'hr_officer'), wrap(listUsers));
router.get('/roles', requireRole('admin'), wrap(listRoles));
router.post('/', requireRole('admin'), wrap(createUser));
router.get('/:id', requireRole('admin', 'registrar', 'hr_officer'), wrap(getUser));
router.put('/:id', requireRole('admin'), wrap(updateUser));
router.put('/:id/roles', requireRole('admin'), wrap(assignRoles));

module.exports = router;
