const express = require('express');
const router = express.Router();
const { accountController : controller } = require('../controller')
const auth = require('../middleware/auth');

// 채굴기업체구매처 등록
router.post('/buyCompany', controller.buyCompany);
// 채굴기 업체 목록 단건 상세보기를 할경우 no 를 넣어서 보낸다.
router.post('/buyCompanyList', controller.buyCompanyList);
// 유니포인트(장비) 재고 추가구매 - 고객이 아니라 회사측이 실제 th 를 구매하는것
router.post('/pointThBuy', controller.pointThPreInsert);
// 유니포인트(장비) 송금완료 / 채굴시작일 처리
router.post('/pointThBuyUpdate', controller.pointThPreUpdate);
// 유니포인트(장비) 목록
router.post('/pointThList', controller.pointThList);


// 유니포인트(사용자) 구매
router.post('/buyUniPoint', controller.buyUniPoint);
// 유니포인트(사용자) 판매신청
router.post('/buyUniPoint', controller.buyUniPoint);

// 유니포인트(사용자) 구매*판매 신청 확정
router.post('/uniPointConfirm', controller.uniPointConfirm);
// 유니포인트(사용자) 목록
router.get('/uniPointList/:userId', controller.uniPointList);

// 사용자의 누적수입
router.post('/getUserBtcSum', controller.getUserBtcSum);
//사용자의 코인잔고
router.post('/getUserBtcBalance', controller.getUserBtcBalance);
//사용자의 코인입출금내역
router.post('/getUserCoinList', controller.getUserCoinList);

// 사용자별 누적 코인 수익정보
router.post('/getBenefit', controller.getBenefit);
// 사용자별 누적 유니포인트
router.post('/getSumBuyMoney', controller.getSumBuyMoney);
// 사용자의 코인출금신정
router.post('/sellBtcUser', controller.sellBtcUser);

module.exports = router;