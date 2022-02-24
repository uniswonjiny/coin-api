/**
 * 코인정산 유니포인트구매요청후 장기 미입금 제거등 정기 배치작업용 컨트롤러
 * @author 송원진
 * */
const logger = require('../config/logger');
const {dbQuery} = require("../config/dbModule");
const env = process.env.NODE_ENV || 'development';
const dbConn = require('../config/dbInfo')[env];

// 정기 채굴 코인 수익 배분
const profitSettlement = async() => {
    const conn = await dbConn.getConnection();
    let sql, coinType='bitcoin', dayStr, rows;
    try {
        logger.error(`accountController.js - uniPointList - 에러 ${e}`);
        // 1. 미정산 코인 목록 추출 - 일단 bitcoin 만 존재하는 것으로 상정
        // 1-1 . 미정산된 코인의 날짜별 추출
        sql = dbQuery('calculate', 'selectCoinConfirmStatusList', null);
        rows = await conn.execute(sql);
        await conn.commit();
    } catch (e) {
        await conn.rollback();
    } finally {
        conn.release();
    }

    // 1. 미정산 코인 목록 추출 - 일단 bitcoin 만 존재하는 것으로 상정


    // 2. 정산 코인중 별도배분용 25% 차감 - 추천인 추천인 플러스 본사등에 나눠 입금한다. -- 수수료용 코인 수익배분이다

    // 2-1 추천인 해당 사용자 추출

    // 2-2 추청닝 플러스 해당 사용자 추출

    // 2-3 추천인 추천인 플러스 사용자용 코인 배분 수익

    // 2-4 2-3 지급후 남은 코인 본사로 입금 -- 본사 코인은 unicore 사용자로 지정해서 넣는다다

    // 3. 현재 효한 각사용자자별 유니포인트 정보 확인 -- 수수료를 제외한 코인수익이다.!!!!!

    // 4. 일반 사용자별 수익코인확인 확인및 입금


}

export {profitSettlement}