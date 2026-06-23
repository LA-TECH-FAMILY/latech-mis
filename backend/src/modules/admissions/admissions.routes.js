const router = require('express').Router();
const { authenticate, requireRole } = require('../../middleware/auth.middleware');
const wrap = require('../../middleware/asyncHandler');
const c = require('./admissions.controller');

router.use(authenticate);

const admissions = requireRole('admin', 'registrar', 'admissions_officer');

router.get('/', admissions, wrap(c.listApplicants));
router.get('/:id', admissions, wrap(c.getApplicant));
router.post('/', admissions, wrap(c.createApplicant));
router.put('/:id/status', admissions, wrap(c.updateStatus));
router.post('/:id/enrol', requireRole('admin', 'registrar'), wrap(c.enrolStudent));
router.post('/offers', admissions, wrap(c.makeOffer));
router.put('/offers/:offer_id/accept', admissions, wrap(c.acceptOffer));

module.exports = router;
