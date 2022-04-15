/**
 * 배치용 연산관련부분 정리
 * @author 송원진
 * */
const {dbQuery} = require("../config/dbModule");
const logger = require("../config/logger");

/**
 * 수수료율
 * */

const feeList = async (conn) => {
    try {
        logger.info('수수료율 확인')
        const sql = dbQuery('calculate' , 'selectFeeList' , null);
        const rows = await conn.execute(sql);

        return rows[0];
    } catch (e) {
        throw e;
    }
}

// 추천플러스해당 사용자 목록
const recommendPlusList = async (conn) => {
    logger.info('추천인 플러스에 해당하는 사용자목록 확인');
    try {
        let sql = dbQuery('calculate' , 'selectPointSetting' , null);
        let rows = await conn.execute(sql);
        const recommendInfo = await rows[0].find(item => item.type === 'recommendPlus');
        // recommendInfo.value; // 추천인 플러스 모집기준
        sql = dbQuery('calculate' , 'selectRecommendPlusMoneySum' , null);
        rows = await conn.execute(sql);
        if(rows[0].length === 0) return [];
        return rows[0].map(item => {
            if(item.money <= recommendInfo.value) {
                return item.recommend_user_no;
            }
        }
    );
    } catch (e) {
        throw e;
    }

}

/**
 * 코인분배 배치 실행상태확인
 * @param { Promise<connection> } conn 디비접속 커넥션
 * @param { string } type
 * @param { int } status
 * @param { string } target_date
 * @param { string } target_time
 * */
const coinBatchInfo = async (conn, type,status, target_date, target_time) => {
    logger.info('배치실행상태확인');
    const sql = dbQuery('calculate' , 'selectBatchList' , {
        status,
        type,
        target_date,
        target_time
    });
    const rows = await conn.execute(sql);
    console.log(`coinBatchInfo : ${rows[0][0]}`);
    return rows[0][0];
}

/**
 * 코인분배 배치 실행결과 입력
 * @param { Promise<connection> } conn 디비접속 커넥션
 * @param { string } type
 * @param { int } status
 * @param { string } target_date
 * @param { string } target_time
 * */
const coinBatchInsert = (conn, type,status, target_date, target_time) => {
    logger.info('배치실행정보입력');
    try {
        const sql = dbQuery('calculate' , 'insertBatch' , {
            status,
            type,
            target_date,
            target_time
        });
        return conn.execute(sql);
    } catch (e) {
        throw e;
    }
}

// 채굴업체로 부터 채굴기 수익확인 // 채굴업채별, 날짜별
const inComeCoinCheck = (conn , company , miningDay) => {
    // 업체로 부터 제공되는 코인정보 -- 날짜별로 되는 지 확인필요
    logger.info('업체별 채굴날짜별 코인수익 확인');
    let rows = [], sql;
    try {
        // 업체 API 정보 확인 전까지는 불가 있다고 가정하에 함
        // 이미 채굴된사항인지 검사




        sql = dbQuery('calculate' , 'insertBatch' , {
            status,
            type,
            target_date,
            target_time
        });
        return conn.execute(sql);
        const coinIncome = {
            
        }
    } catch (e) {
        throw e;
    }
}

module.exports = { feeList, recommendPlusList, coinBatchInfo, coinBatchInsert }