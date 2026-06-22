const router = require('express').Router();
const { authenticate, requireRole } = require('../../middleware/auth.middleware');
const c = require('./registration.controller');

router.use(authenticate);

router.get('/windows', c.listWindows);
router.post('/windows', requireRole('admin', 'registrar'), c.createWindow);
router.post('/register', requireRole('admin', 'registrar', 'student'), c.registerStudent);
router.get('/students/:student_id/years/:academic_year_id/semesters/:semester', c.getStudentRegistration);

module.exports = router;
