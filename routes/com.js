const express = require('express');
const router = express.Router();
const {commonController} = require('../controller');

// 유니포인트 현재 가격
router.get('/uniPointPrice', commonController.uniPointPrice);
// 유니코어 입금 계좌 정보
router.get('/unicoreAccount', commonController.accountInfo);

module.exports = router;