/**
 * 유니포인트 정보 조회 모델
 * @author 송원진
 * */
const logger = require('../config/logger');
const {dbQuery} = require("../config/dbModule");
const env = process.env.NODE_ENV || 'development';

/**
 * 고객들 유니포인트 구매정보 확인
 * @param { String } day 유니포인트 구매확정전
 * @param { Object } conn mysql2 pool promise 디비접속 커넥션
 * @returns { Object<Array, int> } - 포인트 합과 사용자 포인트 리스트
 */
const uniPointList = async (day, conn) => {
    try {
        const sql = dbQuery('account', 'selectUserUniPointList', { day });
        const rows = await conn.execute(sql);
        let totalUniPoint = 0;
        if(rows[0].length === 0) return null;
        rows[0].forEach(item => {
            totalUniPoint = totalUniPoint + Number(item.uni_point);
        });
        return { pointList: rows[0], totalUniPoint}
    } catch (e) {
        console.error(e);
        throw e;
    }
}

module.exports = {uniPointList};
