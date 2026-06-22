const router = require('express').Router();
const { authenticate, requireRole } = require('../../middleware/auth.middleware');
const c = require('./marks.controller');

router.use(authenticate);

router.post('/enter', requireRole('admin', 'lecturer'), c.enterMarks);
router.post('/submit', requireRole('admin', 'lecturer'), c.submitMarks);
router.post('/hod-approve', requireRole('admin', 'hod'), c.hodApprove);
router.post('/registrar-approve', requireRole('admin', 'registrar'), c.registrarApprove);
router.post('/publish', requireRole('admin', 'registrar'), c.publishMarks);

router.get('/students/:student_id', authenticate, c.getStudentResults);
router.get('/courses', requireRole('admin', 'registrar', 'hod', 'lecturer', 'dean'), c.getCourseMarks);

module.exports = router;
