const router = require('express').Router();
const { authenticate, requireRole } = require('../../middleware/auth.middleware');
const { listUsers, getUser, createUser, updateUser, assignRoles, listRoles } = require('./user.controller');

router.use(authenticate);

router.get('/', requireRole('admin', 'registrar', 'hr_officer'), listUsers);
router.get('/roles', requireRole('admin'), listRoles);
router.post('/', requireRole('admin'), createUser);
router.get('/:id', requireRole('admin', 'registrar', 'hr_officer'), getUser);
router.put('/:id', requireRole('admin'), updateUser);
router.put('/:id/roles', requireRole('admin'), assignRoles);

module.exports = router;
