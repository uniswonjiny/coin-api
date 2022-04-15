const express = require('express');
const router = express.Router();
const {commonController} = require('../controller');

// 유니포인트 현재 가격
router.get('/uniPointPrice', commonController.uniPointPrice);
// 유니코어 입금 계좌 정보
router.get('/unicoreAccount', commonController.accountInfo);
// 업비트 비트코인시세저장
router.get('/bitCoinInfoInsert/:insert', commonController.bitCoinInfoInsert);
// 비트코인 현제 시세정보
router.get('/bitCoinCurrent', commonController.bitCoinCurrent);
// 유니코아의 수수료율 - 대외적으로 알려져도 상관없는 것들
router.get('/settingFeeList',commonController.settingFeeList);
module.exports = router;