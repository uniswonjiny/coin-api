/**
 * 사용자 인증정보 관련 모델
 * @author 송원진
 * */

const logger = require('../config/logger');
const {dbQuery} = require("../config/dbModule");

/**
 * 사용자의 추천인 정보(목록)을 확인한다.
 * @param { Number<int> } userNo 사용자번호 널일수도 있다.
 * @param { Promise<connection> } conn 디비접속 커넥션
 * @returns { Array<int , int>} 사용자번호 - 해당 추천인 번호
 * */

const userRecommendInfo = async (userNo , conn) => {
    try {
        logger.info(`추천인 정보 확인 : ${userNo}`)
        const sql = dbQuery('user' , 'selectRecommendUserList' , {userNo});
        const rows = await conn.execute(sql);
        return rows[0];
    } catch (e) {
        throw e;
    }
}
/**
 * 사용자의 추천인 정보(목록)을 확인한다.
 * @param { String } user_id 사용자번호 널일수도 있다.
 * @param { Promise<connection> } conn 디비접속 커넥션
 * @returns { Number<int>} 사용자번호
 * */
const getUserNo = async(user_id, conn) =>{
    try {
        const sql = dbQuery('user' , 'getUserNo' , {user_id});
        const rows = await conn.execute(sql);
        if( rows[0][0].length ===0) throw new Error("사용자정보를 정확히 확인하세요");
        return rows[0][0].user_no;
    } catch (e) {
        throw e;
    }
}

module.exports = {userRecommendInfo,getUserNo}
