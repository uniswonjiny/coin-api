// 유니포인트 모델
const uniPointModel = require('./UniPoint');
// 코인관련 모델
const coinModel = require('./Coin');
// 인증 로그인 사용자정보 관련 모델
const authModel = require('./Auth');
// 수수료 분배금등 계산된 정보 관련 모델
const calcModel = require('./Calc')

module.exports = {
    uniPointModel,
    coinModel,
    authModel,
    calcModel
}
