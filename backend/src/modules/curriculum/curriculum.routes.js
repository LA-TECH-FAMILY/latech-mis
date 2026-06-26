const router = require('express').Router();
const { authenticate, requireRole } = require('../../middleware/auth.middleware');
const wrap = require('../../middleware/asyncHandler');
const c = require('./curriculum.controller');

router.use(authenticate);
const academic = requireRole('admin', 'registrar', 'hod', 'dean');

// Course catalogue
router.get('/courses', wrap(c.listCourses));
router.post('/courses', academic, wrap(c.createCourse));
router.put('/courses/:id', academic, wrap(c.updateCourse));

// Curricula (versioned per programme)
router.get('/programmes/:programme_id/curricula', wrap(c.listCurricula));
router.post('/programmes/:programme_id/curricula', academic, wrap(c.createCurriculum));
router.get('/curricula/:id', wrap(c.getCurriculum));
router.put('/curricula/:id', academic, wrap(c.updateCurriculum));
router.post('/curricula/:id/replicate', academic, wrap(c.replicateCurriculum));

// Curriculum units
router.get('/curricula/:id/units', wrap(c.listUnits));
router.post('/curricula/:id/units', academic, wrap(c.createUnit));
router.put('/curricula/:id/units/:unitId', academic, wrap(c.updateUnit));
router.delete('/curricula/:id/units/:unitId', academic, wrap(c.deleteUnit));

module.exports = router;
