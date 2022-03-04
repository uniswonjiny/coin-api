/**
 * 인증 사용자정보 서비스 컨트롤러
 * @author 송원진
 */

const logger = require('../config/logger');
const {dbQuery} = require("../config/dbModule");
const env = process.env.NODE_ENV || 'development';
const dbConn = require('../config/dbInfo')[env];
const authUtil = require('../utils/authUtil');

exports.loginInfo = async (req, res, next) =>{
    const conn = await dbConn.getConnection();
    try {
        // 사용자 정보 아이디로 추출
        const {user_id , user_password} = req.body;
        const sql = dbQuery('user', 'selectUserInfo',{ user_id });
        let [rows] = await conn.query(sql);

        if(rows.length === 0) {
            throw new Error('사용자를 확인하세요');
        }
        // 비번 확인

        if( !await authUtil.passCompare(rows[0].user_password, user_password)){
            throw new Error('비밀번호를 확인하세요');

        }
        // 패스워드 삭제
        delete rows[0].user_password;

        if(rows[0].mobile_phone){
            rows[0].mobile_phone = await authUtil.getDecryptToken(rows[0].mobile_phone, process.env.JWT_SECRET_OR_KEY);
        }
        if(rows[0].bank_name){
            rows[0].bank_name = await authUtil.getDecryptToken(rows[0].bank_name, process.env.JWT_SECRET_OR_KEY);
        }
        if(rows[0].bank_account){
            rows[0].bank_account = await authUtil.getDecryptToken(rows[0].bank_account, process.env.JWT_SECRET_OR_KEY);
        }
        if(rows[0].bank_holder){
            rows[0].bank_holder = await authUtil.getDecryptToken(rows[0].bank_holder, process.env.JWT_SECRET_OR_KEY);
        }
        // jwt 획득하기
        const token = await authUtil.getToken(user_id, process.env.JWT_SECRET_OR_KEY, process.env.JWT_EXPIRES_TIME, process.env.JWT_ISSUER);
        // jwt 정보 response 헤더 삽입
        res.header('authorization' , token);
        res.send(rows[0]);
    } catch (e) {
        logger.error(`authController.js - loginInfo - 에러 ${e}`);
        next(e)
    } finally {
        conn.release();
    }
}


/**
 * 사용자 존재 확인 -존재하면 1 없다면 0
 * @param { request } req
 * @param { response } res
 * @param { function } next
 */
exports.countUserId = async (req , res, next) => {
    const conn = await dbConn.getConnection(async connection=>connection);
    try {
        logger.info('사용자 존재 확인');
        const sql = dbQuery('user', 'selectUserCount',{user_id: req.params.userId });
        const [rows] = await conn.query(sql);
        await res.send(rows[0]);
    } catch (e) {
        logger.error(`authController.js - countUserId - 에러 ${e}`);
        throw new Error("사용자 확인이 안됩니다.");
    } finally {
        logger.info('마지막 실행되냐')
        conn.release();
    }
}

/**
 * 사용자 기본정보 확인
 * @param { request } req
 * @param { response } res
 * @param { function } next
 */
exports.userIdUserName = async (req , res , next) => {
    logger.info('사용자 기본정보 확인');
    const conn = await dbConn.getConnection(async connection=>connection);
    try {
        const sql = dbQuery('user', 'selectUserIdName',{user_id: req.params.userId});
        const [rows] = await conn.query(sql);
        res.send(rows[0]);
    } catch (e) {
        logger.error(`authController.js - userIdUserName - 에러 ${e}`)
        next(e);
    } finally {

        conn.release();
    }
}

/**
 * 신규 사용자 저장
 * @param { request } req
 * @param { response } res
 * @param { function } next
 */
exports.userInsert = async (req, res, next) => {
    logger.info('사용자 정보 저장')
    const conn = await dbConn.getConnection();
    try {
        let sql, rows, user_no, recommend_user_no;
        await conn.beginTransaction();
        // 사용하는 파라미터 추출
        const {body} = req;
        let {
            user_id,
            user_password,
            user_status,
            user_terms_agree,
            user_address,
            user_detail_address,
            mobile_phone,
            user_email,
            user_name,
            user_birth_day,
            recommend_id
        } = body;

        if (user_password) {
            user_password = await authUtil.getHashPass(user_password);
        }
        if (mobile_phone) {
            mobile_phone = await authUtil.getEncryptToken(mobile_phone, process.env.JWT_SECRET_OR_KEY);
        }

        // 1. 동일 아이디 검사
        sql = dbQuery('user', 'selectUserCount', {user_id});
        rows = await conn.execute(sql);
        if (rows[0][0].count !== 0) throw new Error("이미 사용자가 존재합니다");
        // 2. 사용자 마스터키 테이블 저장
        sql = dbQuery('user', 'insertTbUser', {
            user_id, user_password, user_status
        });
        await conn.execute(sql);
        // 3. 사용자 번호 획득 - 내부 정보 조회시는 사용자 번호로 한다. 단일한 키조회 유지와 조회시 필요한 데이터크기동일및 감소 추구함!
        sql = dbQuery('user', 'selectUserId', {user_id});
        rows = await conn.execute(sql);
        user_no = rows[0][0].user_no;
        // 4. 사용자 일반 정보 입력
        sql = dbQuery('user', 'insertTbUserInfo', {
            user_no,
            user_terms_agree,
            user_address,
            user_detail_address,
            mobile_phone,
            user_email,
            user_name,
            user_birth_day
        });
        await conn.execute(sql);
        // 5. 사용자 추천인 존재시 등록
        if (recommend_id) {
            // 다시한번 추천인 이 존재하는지 점검
            sql = dbQuery('user', 'selectUserId', {user_id: recommend_id});
            rows = await conn.execute(sql);
            if (rows[0].length > 0) {
                recommend_user_no = await rows[0][0].user_no;
                sql = dbQuery('user', 'insertUserRecommend', {user_no, recommend_user_no});
                await conn.execute(sql);
            } else {
                throw new Error("추천 사용자를 확인하시고 다시 가입해주세요");
            }
        }
        await conn.commit();
        await res.send();
    } catch (e) {
        await conn.rollback();
        logger.error(`authController.js - userInsert - 에러 ${e}`);
        next(e);
    } finally {
        conn.release();
    }
}
    /**
     * 비밀번호 변경
     * @param { request } req
     * @param { response } res
     * @param { function } next
     */
    exports.updatePassword = async (req, res, next) => {
        logger.info('비밀번호 변경');
            const conn = await dbConn.getConnection();
        try {
            await conn.beginTransaction();
            const { body } = req;
            let sql,rows;
            let { user_id , old_password , new_password} = body;

            // 기존 비밀번호 확인
            sql = dbQuery('user', 'selectUserId', {user_id});
            rows = await conn.execute(sql);
            if(rows[0][0].length === 0 ) throw new Error("사용아이디를 확인해주세요");
            // 변경 비빌 번호 암호화
            // if(!await authUtil.passCompare(old_password , rows[0][0].user_password)) {
            //     throw new Error("사용정보를 확인해주세요");
            // }
            new_password = await authUtil.getHashPass(new_password);
            // 비밀번호 변경
            sql = dbQuery('user', 'updateUserPassword', {user_id , user_password: new_password});
            await conn.execute(sql);
            res.send();
        }catch (e) {
            await conn.rollback();
            logger.error(`authController.js - userUpdatePassword - ${e}`);
            next(e);
        }finally {
            conn.release();
        }
    }

    /**
     * 계좌정보 수정
     * @param { request } req
     * @param { response } res
     * @param { function } next
     */
    exports.accountModify = async (req, res, next) => {
        logger.info('사용자 정보 저장')
        try {
            let sql,rows;
            const conn = await dbConn.getConnection();
            const { body } = req;
            const {
                user_id, bank_name, bank_account, bank_holder
            } = body;
            // 사용자 번호획득
            sql = dbQuery('user', 'selectUserId', {user_id});
            rows = await conn.execute(sql);
            if(rows[0][0].length === 0 ) throw new Error("사용아이디를 확인해주세요");
            sql = dbQuery('user', 'updateUserAccount',
                {user_no : rows[0][0].user_no,
                    bank_name, bank_account, bank_holder
                }
            );
            await conn.execute(sql);
            res.send();
        } catch (e) {
            logger.error(`authController.js - accountModify - ${e}`);
            next(e);
        }finally {
            conn.release();
        }

}


