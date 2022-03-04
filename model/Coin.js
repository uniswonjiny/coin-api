/**
 * 코인 정보 모델
 * @author 송원진
 * */
const logger = require('../config/logger');
const {dbQuery} = require("../config/dbModule");
const {getTimeStamp} = require('../utils/comUtil')

/**
 * 코인정보 - 분배용코인 수수료용코인
 * @param { String } batch_day 배치날짜 코인수익금 입금날짜
 * @param { String } coin_type 코인타입
 * @param { int } confirm_yn 코인배분상태 1배분 0미배분
 * @param { Promise<connection> } conn 디비접속 커넥션
 * @returns { Object<float, float> } - coinSum 코인배분전체함 , coinFee - 코인수수료 전체합
 */
const confirmCoin = async (batch_day, coin_type, confirm_yn, conn) => {
    try {
        const sql = dbQuery('calculate', 'selectCoinConfirmStatusList', {mining_day: batch_day, coin_type, confirm_yn});
        const rows = await conn.execute(sql);
        // 코인 소수점 아래 8자리 고정!
        let coinSum = 0.00000000;
        // 수수료 분배용 코인 추천인 본사 등등
        let coinFee = 0.00000000;
        if (rows[0][0].length === 0) return throw new Error('코인정보가 없습니다.');
        // 미배정 코인 총합
        rows[0][0].forEach(({coin_value}) => coinSum += coin_value);
        // 분배 코인오차가 발생할수 있으므로 버림으로 수수료에 적용 버림된 수치는 자연스럽게 분배용 코인으로 간다.
        // 수수료율은 디비에서 조회해와야 한다 수정필요!!!!
        // 추천인 관련 수수료는 추천인을 입력한 고객에게 유니코아의 수수료에서 빼서 주는것이다.
        coinFee = Math.floor(coinSum * 0.25 * 100000000) / 100000000;
        // 분배대상 코인에서 수수료를 제외한다.
        coinSum = coinSum - coinFee;
        return {coinSum, coinFee}
    } catch (e) {
        console.error(e)
        return throw new Error(e);
    }
}

/**
 * 코인정보 - 분배용코인 수수료용코인 정보 입력
 * @param { Array } 분배받을 사용자목록 -- 참고로 사용자가 수천명단위로 생기지 않을 것을 예상하고 반복문 처리한다. 만약 배치가 느리다면 대량입력형식으로 바꿔라!
 * @param { Promise<connection> } 디비접속 커넥션
 * @returns { Object<coinSum, coinFee> } - coinSum 코인배분전체함 , coinFee - 코인수수료 전체합
 */
const insertUserCoin = (list, conn) => {
    let sql = '';
    const processed_time = getTimeStamp;
    // register_no =1 은 unicore 최초사용자 최고사용자 배치책임자 관리자이다.
    try {
        list.forEach(el => {
            sql = dbQuery('account', 'insertUserAccount', {
                processed_time,
                user_no: el.user_no,
                type: el.type,
                coin_value: el.coin_value,
                register_no: 1,
                coin_type: 'bit_coin' // 현재는 비트코인만 존재한다고 가정함!
            });
            conn.execute(sql);
        })
    } catch (e) {
        throw e;
    }
}

const insertCoinSum = (list, conn) => {
    let sql = '';
    let rows = [];
    try {
        list.forEach(el => {
            // 사용자의 정보가 존재하는 확인
            sql = dbQuery('account', 'selectUserSum', {user_no: el.user_no, type: 'Y'});
            rows = conn.execute(sql);
            if (rows[0][0].length === 0) {
                sql = dbQuery('account', 'insertUserSum', {
                    user_no: el.user_no,
                    type: el.type,
                    money: 0,
                    uni_point: 0,
                    btc_point: el.btc_point
                });
            } else {
                // !!!!!!! 상황은 일단 10 개가 넘어가는 코인이 존재 하지 않을것으로 가정하고 진행한다.
                // 각코인의 합을 하나의 컬럼에 저장
                // 만약 수십개의 코인을 거래하겠다면 컬럼을 늘리지 말고 코인타입을 지정하고 코인액수를 저장하는 형태로 바꿔라
                const uni_point = rows[0].uni_point + el.uni_point;
                const btc_point = rows[0].btc_point + el.coin_value;
                const money = rows[0].money;

                sql = dbQuery('account', 'updateUserSum', {
                    user_no: el.user_no,
                    modify_type: 'Y',
                    money,
                    uni_point,
                    btc_point,
                    origin_type: 'Y'
                });
            }
            conn.execute(sql);
        })
    } catch (e) {
        throw e;
    }
}

module.exports = {confirmCoin, insertUserCoin, insertCoinSum};
