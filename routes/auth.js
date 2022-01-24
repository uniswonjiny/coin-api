const express = require('express');
const router = express.Router();
const { authController : controller } = require('../controller');
const auth = require('../middleware/auth');

// 사용자 존재확인 - 사용자 숫자만 전달된다.
router.get('/userCount/:userId', auth.ensureAuth, controller.countUserId);
// 사용자확인(추천인) 존재확인 - 사용자 아이디로 {아이디:이름} 정보를 리턴한다.
router.get('/userName/:userId', auth.notAuth, controller.userIdUserName);
// 신규 사용자 등록
router.post('/userInsert', auth.ensureAuth, controller.userInsert);
// 사용자 정보 - 로그인 자세한 사용자 정보도
router.post('/loginInfo', auth.notAuth, controller.loginInfo);
// 비밀번호 변경
router.post('/updatePassword', auth.ensureAuth, controller.userUpdatePassword);
// 출금계좌 변경
router.post('accountModify', auth.ensureAuth, controller.accountModify);


module.exports = router;
