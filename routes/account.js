const express = require('express');
const router = express.Router();
const { accountController : controller } = require('../controller')
const auth = require('../middleware/auth');

// 유니포인트 구매
router.post('/buyUniPoint', controller.buyUniPoint);
// 유니포인트 구매 확정 / 취소
router.post('/buyUniPointConfirm', controller.buyUniPointConfirm);
// 유니포인트 목록
router.post('/uniPointList', controller.uniPointList);

module.exports = router;