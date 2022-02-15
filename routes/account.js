const express = require('express');
const router = express.Router();
const { accountController : controller } = require('../controller')
const auth = require('../middleware/auth');

// 유니포인트 구매
router.post('/buyUniPoint', controller.buyUniPoint);

module.exports = router;