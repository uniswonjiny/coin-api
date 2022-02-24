/**
 * 결제 코인잔량등 계좌 관련 서비스 컨트롤러
 * @author 송원진
 */

const logger = require('../config/logger');
const {dbQuery} = require("../config/dbModule");
const env = process.env.NODE_ENV || 'development';
const dbConn = require('../config/dbInfo')[env];
const authUtil = require('../utils/authUtil');

// 구매 유니포인트 정보
exports.uniPointList = async (req, res, next) => {
    const conn = await dbConn.getConnection();
    try {
        let sql, rows, user_no, userSumInfo, userPointList;
        const {body} = req;
        let {
            user_id
        } = body;
        sql = dbQuery('user', 'selectUserId', {user_id});
        rows = await conn.execute(sql);
        if (rows[0][0].length === 0) throw new Error("구매 사용자 정보를 확인하세요");
        // 사용자 번호 획득
        user_no = rows[0][0].user_no;
        // 현재 최종확정 보유한 유니포인트
        sql = dbQuery('account', 'selectUserSum', {user_no});
        rows = await conn.execute(sql);
        userSumInfo = rows[0]
        // 모든 유니포인트 목록
        sql = dbQuery('account', 'selectBuyPointHistory', {user_no});
        rows = await conn.execute(sql);
        userPointList = rows[0];
        res.send({userSumInfo, userPointList});
    } catch (e) {
        logger.error(`accountController.js - uniPointList - 에러 ${e}`);
        next(e)
    } finally {
        conn.release();
    }
}

// 포인트 구매요청 - 실제 결제가 아닌 계좌이체후 관리자가 확인하는 구조다.
exports.buyUniPoint = async (req, res, next) => {
    const conn = await dbConn.getConnection();
    try {
        await conn.beginTransaction();
        let sql = '', user_no, rows, type = 'R', btc_point = 0;
        const {body} = req;
        let {
            user_id,
            money,
            tax,
            uni_point,
            document_type,
            document_number
        } = body;
        // 필수 데이터 검사

        if (!user_id) throw new Error("구매 사용자를 확인하세요.");

        if (!money || !tax || !uni_point) throw new Error("구매 정보를 확인하세요.");

        // 숫자로 형변환
        money = Number(money);
        tax = Number(tax);
        uni_point = Number(uni_point);
        // tax 는 ?
        if (money === 0 || uni_point === 0) throw new Error("구매금액정보를 확인하세요");

        // 사용자가 존재확인
        sql = dbQuery('user', 'selectUserId', {user_id});
        rows = await conn.execute(sql);
        if (rows[0].length === 0) throw new Error("구매 사용자 정보를 확인하세요");
        // 사용자 번호 획득
        user_no = rows[0][0].user_no;

        // * 유니포인트 정보 이력부 작성 --!!!헤갈림주의!!!! 이곳은 그냥 구매요청이므로 입금 확인은 관리자 확정에서 하는것이다
        if(document_number && document_number.length > 10){
            document_number = authUtil.getEncryptToken(document_number, process.env.JWT_SECRET_OR_KEY);
        }
        sql = dbQuery('account', 'insertBuyPointHistory', {
            user_no,
            type,
            uni_point,
            money,
            tax,
            document_type,
            document_number
        });
        await conn.execute(sql);
        // 고객의 실제 금액이 아니고 요청만된 금액
        sql = dbQuery('account', 'selectUserSum', {user_no, type});
        rows = await conn.execute(sql);
        if (rows[0].length === 0) {
            sql = dbQuery('account', 'insertUserSum', {user_no, type, uni_point, btc_point, money});
        } else {
            uni_point += Number(rows[0][0].uni_point);
            btc_point += Number(rows[0][0].btc_point);
            money += Number(rows[0][0].money);
            sql = dbQuery('account', 'updateUserSum', {user_no, type, uni_point, btc_point, money});
        }
        await conn.execute(sql);
        //await conn.rollback();
        await conn.commit();
        res.send();
    } catch (e) {
        await conn.rollback();
        logger.error(`accountController.js - buyUniPoint - 에러 ${e}`);
        next(e)
    } finally {
        conn.release();
    }
}

// !!!!!!!!!!관리자와 연계되므로 다시 검토후 수정해야함!!!!!!!!
// 포인트 구매 확정 - 관리자에서 하는 부분
// 동시에 여러건인 경우도 생각해봐야 한다. -- 설계중
exports.buyUniPointConfirm = async (req, res, next) => {
    const conn = await dbConn.getConnection();
    try {
        let sql, user_no, rows, btc_point = 0, money = 0, uni_point = 0;
        const {body} = req;
        let {
            user_id,
            type, // Y 승인됨 C 요청취소
            no // 구매 히스토리 넘버
        } = body;

        await conn.beginTransaction();
        // 필수 값 확인
        // 구매 히스토리 확인
        if (!no || no === 0) throw new Error("확인 요청 정보를 확인하세요");
        if (!type) throw new Error("요청 정보를 확인하세요");
        // 사용자 확인
        sql = dbQuery('user', 'selectUserId', {user_id});
        rows = await conn.execute(sql);
        if (rows[0].length === 0) throw new Error("구매한 사용자 정보를 확인하세요");
        user_no = rows[0][0].user_no;
        // 구매요청 정보확인
        sql = dbQuery('account', 'selectBuyPointHistory', {user_no, no, type: 'R', no});
        rows = await conn.execute(sql);
        if (rows[0].length === 0) throw new Error("유니포인트구매요청 정보를 확인하세요");
        money = rows[0][0].money;
        uni_point = rows[0][0].uni_point;

        // 승인인경우
        if (type === 'Y') {
            sql = dbQuery('account', 'confirmBuyPointHistory', {no, type});
            await conn.execute(sql);
            // 승인되었으니 요청금액을 최종 합금액에 더해준다.
            sql = dbQuery('account', 'selectUserSum', {user_no, type: 'Y'});
            rows = await conn.execute(sql);
            // 최종 합계 금액이 없는 경우 신규 생성
            if (rows[0].length === 0) {
                sql = dbQuery('account', 'insertUserSum', {user_no, type: 'Y', uni_point, money, btc_point});
                await conn.execute(sql);
            } else {
                // 기존 확정금액에 요청금액을 더한다.
                const update_uni_point = rows[0][0].uni_point + uni_point;
                const update_money = rows[0][0].money + money;
                const update_btc_point = rows[0][0].btc_point + btc_point;
                sql = dbQuery('account', 'updateUserSum', {
                    user_no,
                    type,
                    uni_point: update_uni_point,
                    money: update_money,
                    btc_point: update_btc_point
                });
                await conn.execute(sql);
            }
        }
        // 취소이면 삭제의 개념으로 한다. -- 요건 확정이 아니라 단순 요청 취소 거래요청만하고 실제로 계좌로 입금을 한동안 안하는 등의 요청기록만 있는 거래 취소이다
        // 최종 승인 기록과는 무관함
        if (type === 'C') {
            sql = dbQuery('account', 'deleteBuyPointHistory', {no});
            await conn.execute(sql);
            // 합계 요청금액을 삭감한다.

        }
        // 취소든 승인이든 요청 합계 금액은 삭감한다.// 판매요청하고는 다른것이다 헤갈리면 안됨!!!!!!
        if (type === 'C' || type === 'Y') {
            sql = dbQuery('account', 'selectUserSum', {user_no, type: 'R'});
            rows = await conn.execute(sql);
            if (rows[0].length === 0) throw new Error("유니포인트구매요청 정보가 부정확합니다.");
            // 합계정보에서 요청금액을 빼준다.
            btc_point = rows[0][0].btc_point - btc_point;
            money = rows[0][0].money - money;
            uni_point = rows[0][0].uni_point - uni_point;


            sql = dbQuery('account', 'updateUserSum', {user_no, no, btc_point, money, uni_point, type: 'R'});
            await conn.execute(sql);
        }
        await conn.commit();
        //await conn.rollback();
        res.send();
    } catch (e) {
        logger.error(`accountController.js - confirmUniPoint - 에러 ${e}`);
        await conn.rollback();
        next(e);
    } finally {
        conn.release();
    }
}