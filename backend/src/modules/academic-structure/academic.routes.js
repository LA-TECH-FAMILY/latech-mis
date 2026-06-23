const router = require('express').Router();
const { authenticate, requireRole } = require('../../middleware/auth.middleware');
const wrap = require('../../middleware/asyncHandler');
const c = require('./academic.controller');

router.use(authenticate);

const admin = requireRole('admin', 'registrar');

// Faculties
router.get('/faculties', wrap(c.listFaculties));
router.post('/faculties', admin, wrap(c.createFaculty));
router.put('/faculties/:id', admin, wrap(c.updateFaculty));

// Departments
router.get('/departments', wrap(c.listDepartments));
router.post('/departments', admin, wrap(c.createDepartment));
router.put('/departments/:id', admin, wrap(c.updateDepartment));

// Programmes
router.get('/programmes', wrap(c.listProgrammes));
router.post('/programmes', admin, wrap(c.createProgramme));
router.put('/programmes/:id', admin, wrap(c.updateProgramme));

// Academic Years
router.get('/years', wrap(c.listAcademicYears));
router.post('/years', admin, wrap(c.createAcademicYear));
router.put('/years/:id/set-current', admin, wrap(c.setCurrentYear));

// Intakes
router.get('/intakes', wrap(c.listIntakes));
router.post('/intakes', admin, wrap(c.createIntake));

module.exports = router;
