const router = require('express').Router();
const { authenticate } = require('../../middleware/auth.middleware');
const wrap = require('../../middleware/asyncHandler');
const { getStats } = require('./dashboard.controller');

router.use(authenticate);
router.get('/stats', wrap(getStats));

module.exports = router;
