/**
 * 결제 코인잔량등 계좌 관련 서비스 컨트롤러
 * @author 송원진
 */

const logger = require('../config/logger');
const {dbQuery} = require("../config/dbModule");
const env = process.env.NODE_ENV || 'development';
const dbConn = require('../config/dbInfo')[env];
const authUtil = require('../utils/authUtil');
const {getUserBtcSum, getUserBtcBalance, getUserCoinList, getBenefit, getSumBuyMoney} = require("../model/Coin");
const {getUserNo} = require("../model/Auth");

/**
 * 구매처등록
 * @param { request } req
 * @param { response } res
 * @param { function } next
 */
exports.buyCompany = async (req, res, next) => {
    const conn = await dbConn.getConnection();
    try {
        let sql = '';
        const {body} = await req;
        const {
            company_name,
            coin_type,
            position,
            fee_type,
            fee,
            admin_user_no,
            status,
            memo,
            charge_contact,
            charge_name
        } = body;

        //  중복검사
        sql = dbQuery('account', 'selectPurchaseCount', {company_name, position, fee_type, fee})
        const rows = await conn.execute(sql);
        if (Number(rows[0][0].cnt) > 0) {
            throw new Error('이미 등록하셨습니다.');
        }

        sql = dbQuery('account', 'insertPurchase', {
            company_name,
            coin_type,
            position,
            fee_type,
            fee,
            admin_user_no,
            status,
            memo,
            charge_contact,
            charge_name
        });

        await conn.execute(sql);
        res.send('ok');
    } catch (e) {
        logger.error(e)
        next(e)
    } finally {
        conn.release();
    }
}

// 구매처 목록 - 단건의 경우 no 있으면 된다. 구매처가 많을수 없으므로 정렬은 뺐다.
exports.buyCompanyList = async (req, res, next) => {
    const conn = await dbConn.getConnection();
    try {
        const {body} = req;
        let start_date = null, end_date = null, size = 100, start_no = 0, status = null, no = null;
        if (body.start_date) start_date = body.start_date;
        if (body.end_date) end_date = body.end_date;
        if (body.size) size = Number(body.size);
        if (body.start_no) start_no = Number(body.start_no);
        if (body.status) status = body.status;
        if (body.no) no = Number(body.no);

        const sql = dbQuery('account', 'selectPurchaseList', {start_date, end_date, size, start_no, status, no});
        const rows = await conn.execute(sql);
        await res.send(rows[0]);
    } catch (e) {
        logger.error(e)
        next(e)
    } finally {
        conn.release();
    }
}

// 회사의 판매용 포인트(판매상품재고관리 개념) 추가와 소멸
// 사용자의 포인트 구매와 환매와 구별필요
exports.pointThPreInsert = async (req, res, next) => {
    const conn = await dbConn.getConnection();
    try {
        const {body} = req;
        const {buy_date, purchase_no, amount, th, uni_point, created_user_no} = body;
        // 1. 채굴장비 정보 입력
        const sql = dbQuery('account', 'insertPurchaseMachine', {
            buy_date, purchase_no, amount, th, uni_point, created_user_no
        });
        await conn.execute(sql);
        res.send();
    } catch (e) {
        logger.error(e)
        e.message = '채굴기구매정보 입력에 실패했습니다.'
        next(e)
    } finally {
        conn.release();
    }
}

// 채굴기 구매 목록
exports.pointThList = async (req, res, next) => {
    const conn = await dbConn.getConnection();
    try {
        const {body} = req;
        let start_date = null, end_date = null, no = null, status = null, purchase_no = null;
        if (body.start_date) start_date = body.start_date
        if (body.end_date) end_date = body.end_date
        if (body.no) no = body.no
        if (body.status) status = body.status;
        if (body.purchase_no) purchase_no = body.purchase_no;

        const sql = dbQuery('account', 'selectPurchaseMachineInfo', {
            start_date, end_date, no, status, purchase_no
        });
        const rows = await conn.execute(sql);
        res.send(rows[0]);
    } catch (e) {
        console.error(e)
        next(e)
    } finally {
        conn.release();
    }
}

//  송금처리 완료 / 채굴시작일자
// 사용자의 포인트 구매와 환매와 구별필요
exports.pointThPreUpdate = async (req, res, next) => {
    const conn = await dbConn.getConnection();
    try {
        await conn.beginTransaction();
        const {body} = req;
        const {target_date, type, no, admin_user_no} = body;
        let nowTh = 0, nowAmount = 0, nowUniPoint = 0; // 사들여서 판매 재고로 올려야 하는 부분
        let statusTh = 0, statusUniPoint = 0, money = 0, statusSoldUniPoint = 0; // 재고 정보
        let sql = '', rows = [];
        // 0. 존재하는지 확인
        sql = dbQuery('account', 'selectPurchaseMachineInfo', {no});
        rows = await conn.execute(sql);
        if (rows[0][0].length === 0) throw new Error('존재하지 않는 장비입니다');
        if (rows[0][0].status === "F") throw new Error('작동 불가 장비입니다.');
        if (rows[0][0].status === "T") throw new Error('이미 채굴시작된 장비입니다.');

        nowTh = rows[0][0].th;
        nowAmount = rows[0][0].amount;
        nowUniPoint = rows[0][0].uni_point;

        // 1. 송금완료인경우
        if (type === 'P') {
            if (rows[0][0].status === "P") throw new Error('이미 송금완료 되었습니다');
            sql = dbQuery('account', 'updatePurchaseMachine', {
                no,
                payment_date: target_date,
                status: type,
                updated_user_no: admin_user_no
            });
            await conn.execute(sql);
        }
        // 채굴시작 요청인경우
        if (type === 'T') {
            if (rows[0][0].status === "R") throw new Error('송금완료되지 않았습니다.');
            sql = dbQuery('account', 'updatePurchaseMachine', {
                no,
                start_date: target_date,
                status: type,
                updated_user_no: admin_user_no
            });
            await conn.execute(sql);
            // 판매용 포인터 현황확인
            sql = dbQuery('account', 'selectThPointStatusNow', null);
            rows = await conn.execute(sql);

            if (rows[0].length === 0) {
                // 모든 데이터를 초기화하고 처음 실행될때 만 해당
                statusTh = nowTh;
                statusUniPoint = nowUniPoint;
                money = nowAmount;
                statusSoldUniPoint = 0;
            } else {
                statusTh = Number(rows[0][0].th) + Number(nowTh);
                statusUniPoint = Number(rows[0][0].uni_point) + Number(nowUniPoint);
                money = Number(rows[0][0].money) + Number(nowAmount);
                statusSoldUniPoint = Number(rows[0][0].sold_uni_point); // 이건 거래하는게 아니라 판매재고를 늘리거나 줄이는 작업이르모 더하거나 빼면안된다.
            }

            // 2-2 채굴기 판매가능 포인트 정보 업데이트
            sql = dbQuery('account', 'insertThPointStatus', {
                th: statusTh,
                uni_point: statusUniPoint,
                sold_uni_point: statusSoldUniPoint,
                created_user_no: admin_user_no,
                money
            });
            await conn.execute(sql);
        }

        await conn.commit();
        res.send();
    } catch (e) {
        console.error(e)
        await conn.rollback();
        next(e)
    } finally {
        conn.release();
    }
}
// 포인트 구매요청 -- 사용자가 구매요청하고 관리자의 입금확인후 확정을 기다리는 것이다.
exports.buyUniPoint = async (req, res, next) => {
    const conn = await dbConn.getConnection();
    try {
        await conn.beginTransaction();
        let sql = "", user_no = 0, rows = [], btc_point = 0, sales_type = 'M', type = 'R';
        let soldUniPoint = 0, soldMoney = 0, soldTh = 0, uniPoint = 0;
        const {body} = req;
        let {
            user_id,
            money,
            tax,
            uni_point,
            document_type,
            document_number,
            account_no
        } = body;

        // 필수 정보 확인
        if (isNaN(money) || isNaN(uni_point) || isNaN(tax)) throw new Error("금액 정보를 확인하세요.");
        if (money === 0 || uni_point === 0) throw new Error("구매금액정보를 확인하세요");
        // 구매가능한 포인수량확인 구매요청인경우
        sql = dbQuery('account', 'selectThPointStatusNow', null);
        rows = await conn.execute(sql);
        soldUniPoint = Number(rows[0][0].sold_uni_point) + Number(uni_point);
        if (Number(rows[0][0].uni_point) < soldUniPoint) throw new Error("판매가능한 유니포인트가 없습니다.");
        soldMoney = rows[0][0].money;
        soldTh = rows[0][0].th;
        uniPoint = rows[0][0].uni_point;
        // 사용자가 존재확인
        // 사용자 번호 획득
        user_no = await getUserNo(user_id, conn);

        // 판매가능 포인트 상태변경
        sql = dbQuery('account', 'insertThPointStatus', {
            th: soldTh,
            uni_point: uniPoint,
            sold_uni_point: soldUniPoint,
            created_user_no: user_no,
            money: soldMoney
        });
        await conn.execute(sql);
        if (document_number && document_number.trim().length > 0) {
            document_number = await authUtil.getEncryptToken(document_number, process.env.JWT_SECRET_OR_KEY);
        }
        sql = dbQuery('account', 'insertBuyPointHistory', {
            user_no,
            type,
            sales_type,
            uni_point,
            money,
            tax,
            document_type,
            document_number,
            account_no
        });
        await conn.execute(sql);

        // 사용자의 유니포인트 구매정보 입력및 수정
        sql = dbQuery('account', 'selectUserSum', {user_no, type});
        rows = await conn.execute(sql);
        if (rows[0].length === 0) {
            sql = dbQuery('account', 'insertUserSum', {user_no, type, uni_point, btc_point, money});
        } else {
            uni_point = Number(uni_point) + Number(rows[0][0].uni_point);
            btc_point = Number(btc_point) + Number(rows[0][0].btc_point);
            money = Number(money) + Number(rows[0][0].money);
            sql = dbQuery('account', 'updateUserSum', {user_no, type, uni_point, btc_point, money});
        }
        await conn.execute(sql);
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
// 유니포인트 판매 신청
exports.sellUniPoint = async (req, res, next) => {
    const conn = await dbConn.getConnection();
    try {
        await conn.beginTransaction();
        let sql = "", rows = [], btc_point = 0, sales_type = 'P', type = 'S'; // 고객이 유니코아에 포인트를 판매하는 개념이다.
        const {body} = req;
        let {
            user_no,
            money,
            tax,
            uni_point
        } = body;

        // 필수 정보 확인
        if (isNaN(money) || isNaN(uni_point) || isNaN(tax)) throw new Error("금액 정보를 확인하세요.");
        if (money === 0 || uni_point === 0) throw new Error("구매금액정보를 확인하세요");

        sql = dbQuery('account', 'insertBuyPointHistory', {
            user_no,
            type,
            sales_type,
            uni_point,
            money,
            tax,
            document_type: null,
            document_number: null,
            account_no: null // 포인트 판매 확정일때 사용자의 계좌번호 순번을 여기에 넣어버리자!!!!!!
        });
        await conn.execute(sql);

        // 사용자의 유니포인트 구매정보 입력및 수정
        sql = dbQuery('account', 'selectUserSum', {user_no, type});
        rows = await conn.execute(sql);
        if (rows[0].length === 0) {
            sql = dbQuery('account', 'insertUserSum', {user_no, type, uni_point, btc_point, money});
        } else {
            uni_point = Number(uni_point) + Number(rows[0][0].uni_point);
            btc_point = Number(btc_point) + Number(rows[0][0].btc_point);
            money = Number(money) + Number(rows[0][0].money);
            sql = dbQuery('account', 'updateUserSum', {user_no, type, uni_point, btc_point, money});
        }
        await conn.execute(sql);
        await conn.commit();
        res.send();
    } catch (e) {
        await conn.rollback();
        logger.error(`accountController.js - sellUniPoint - 에러 ${e}`);
        next(e)
    } finally {
        conn.release();
    }
}

// 포인트 요청 확정 - 관리자가 하는 부분
exports.uniPointConfirm = async (req, res, next) => {
    const conn = await dbConn.getConnection();
    try {
        await conn.beginTransaction();
        let sql = '', user_no = 0, rows = [], type = 'Y';
        let userUniPoint = 0, userBtcPoint = 0.0, userMoney = 0;
        let salesUniPoint = 0, salesMoney = 0;
        let sumBool = false; //tb_user_sum 값이 존재확인
        const {body} = req;
        let {no, confirmType} = body;
        // 구매요쳥확정
        if (confirmType === 'Y') type = 'R'
        // 환매요청 확정
        if (confirmType === 'P') type = 'S'

        // 포인트요청정보확인
        sql = dbQuery('account', 'selectBuyPointHistory', {no, type});
        rows = await conn.execute(sql);
        if (rows[0].length === 0) throw new Error("포인트 거래정보를 확인하세요.");
        user_no = rows[0][0].user_no;
        salesUniPoint = rows[0][0].uni_point;
        salesMoney = rows[0][0].money;

        // 요청정보 확정으로 변경
        sql = dbQuery('account', 'updateBuyPointHistory', {no, type: confirmType});
        await conn.execute(sql);
        // 사용자 금액중 요청 금액 줄인다.
        sql = dbQuery('account', 'selectUserSum', {user_no, type});
        rows = await conn.execute(sql);
        userUniPoint = Number(rows[0][0].uni_point) - Number(salesUniPoint);
        userBtcPoint = rows[0][0].btc_point;
        userMoney = Number(rows[0][0].money) - Number(salesMoney);
        // 사용자 금액중 최종 보유금액 변경
        sql = dbQuery('account', 'updateUserSum', {
            user_no,
            uni_point: userUniPoint,
            btc_point: userBtcPoint,
            money: userMoney,
            type // 타입구분 코드가 좀 헤갈리는 부분이 있음 조심!!!
        });
        await conn.execute(sql);

        // 사용자의 유니포인트 상태 변경
        // 구매확정
        sql = dbQuery('account', 'selectUserSum', {user_no, type: 'Y'});
        rows = await conn.execute(sql);
        if (confirmType === 'Y') {
            if (rows[0].length > 0) {
                sumBool = true;
                userUniPoint = Number(rows[0][0].uni_point) + Number(salesUniPoint);
                userBtcPoint = rows[0][0].btc_point;
                userMoney = Number(rows[0][0].money) + Number(salesMoney);
            } else {
                sumBool = false;
                userUniPoint = Number(salesUniPoint);
                userBtcPoint = 0.00000000;
                userMoney = Number(salesMoney);
            }
        }
        // 판매출금확인확정
        if (confirmType === 'P') {
            userUniPoint = Number(rows[0][0].uni_point) - Number(salesUniPoint);
            userBtcPoint = rows[0][0].btc_point;
            userMoney = Number(rows[0][0].money) - Number(salesMoney);
            // 판매용 유니포인트를 추가한다.
            sql = dbQuery('account', 'selectThPointStatusNow', null);
            rows = await conn.execute(sql);
            sql = dbQuery('account', 'insertThPointStatus', {
                th: rows[0][0].th,
                uni_point: rows[0][0].uni_point,
                sold_uni_point: Number(rows[0][0].sold_uni_point) - Number(salesUniPoint),
                money: Number(rows[0][0].money) - Number(salesMoney),
                created_user_no: user_no,
            });
        }

        if (sumBool) {
            sql = dbQuery('account', 'updateUserSum', {
                user_no,
                uni_point: userUniPoint,
                btc_point: userBtcPoint,
                money: userMoney,
                type: 'Y' // 타입구분 코드가 좀 헤갈리는 부분이 있음 조심!!!
            });
        } else {
            sql = dbQuery('account', 'insertUserSum', {
                user_no,
                uni_point: userUniPoint,
                btc_point: userBtcPoint,
                money: userMoney,
                type: 'Y'
            });
        }

        await conn.execute(sql);
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

// 포인트 환매요청
exports.refundPoint = async (req, res, next) => {
    const conn = await dbConn.getConnection();
    try {
        await conn.beginTransaction();
        let sql = "", user_no = 0, rows = [], btc_point = 0, sales_type = 'M', type = 'S';
        const {body} = req;
        let {
            user_id,
            money,
            tax,
            uni_point,
            bank_name,
            bank_account,
            bank_holder
        } = body;

        // 사용자 확인
        if (!user_id) throw new Error("구매 사용자를 확인하세요.");
        // 사용자가 환매 가능한 포인트 보유했는지 확인

        if (isNaN(money) || isNaN(money) || isNaN(money)) throw new Error("금액 정보를 확인하세요.");
        if (money === 0 || uni_point === 0) throw new Error("금액정보를 확인하세요");

        // 사용자가 존재확인
        sql = dbQuery('user', 'selectUserId', {user_id});
        rows = await conn.execute(sql);
        if (rows[0].length === 0) throw new Error("구매 사용자 정보를 확인하세요");
        // 사용자 번호 획득
        user_no = rows[0][0].user_no;

        sql = dbQuery('account', 'insertBuyPointHistory', {
            user_no,
            type,
            sales_type,
            uni_point,
            money,
            tax,
            document_type: null,
            document_number: null
        });
        await conn.execute(sql);
        // 출금요청인 경우 고객의 계좌 정보를 입력한다.

        // 입력된 유니포인트 번호 획득
        sql = dbQuery('account', 'selectBuyPointHistory', {user_no, type});
        rows = await conn.execute(sql);
        // 출금계좌 번호 입력
        sql = dbQuery('account', 'insertSalesPointAccount', {
            bank_name,
            bank_account,
            bank_holder,
            sales_no: rows[0][0].no
        });
        await conn.execute(sql);
        // 사용자의 유니포인트 구매정보 입력및 수정
        sql = dbQuery('account', 'selectUserSum', {user_no, type});
        rows = await conn.execute(sql);
        if (rows[0].length === 0) {
            sql = dbQuery('account', 'insertUserSum', {user_no, type, uni_point, btc_point, money});
        } else {
            uni_point = Number(uni_point) + Number(rows[0][0].uni_point);
            btc_point = Number(btc_point) + Number(rows[0][0].btc_point);
            money = Number(money) + Number(rows[0][0].money);
            sql = dbQuery('account', 'updateUserSum', {user_no, type, uni_point, btc_point, money});
        }
        await conn.execute(sql);
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


// 구매 유니포인트 정보
exports.uniPointList = async (req, res, next) => {
    const conn = await dbConn.getConnection();
    try {
        let sql, rows, user_no, userPointList;
        // 사용자가 확정금액
        let userSumInfo = {
            uni_point: 0,
            btc_point: 0,
            money: 0
        };
        // 판매요청금액
        let sellRSumInfo = {
            uni_point: 0,
            btc_point: 0,
            money: 0
        };
        // 구매요청금액
        let buyRSumInfo = {
            uni_point: 0,
            btc_point: 0,
            money: 0
        };

        const user_id = req.params.userId
        sql = dbQuery('user', 'selectUserId', {user_id});
        rows = await conn.execute(sql);
        if (rows[0][0].length === 0) throw new Error("구매 사용자 정보를 확인하세요");
        // 사용자 번호 획득
        user_no = rows[0][0].user_no;
        // 현재 최종확정 보유한 유니포인트
        sql = dbQuery('account', 'selectUserSum', {user_no, type: 'Y'});
        rows = await conn.execute(sql);
        if (rows) userSumInfo = rows[0][0];

        // 현재 판매요청중인 금액
        sql = dbQuery('account', 'selectUserSum', {user_no, type: 'S'});
        rows = await conn.execute(sql);
        if (rows) sellRSumInfo = rows[0][0]

        // 현재 구매요청중인 금액
        sql = dbQuery('account', 'selectUserSum', {user_no, type: 'R'});
        rows = await conn.execute(sql);
        if (rows) buyRSumInfo = rows[0][0]

        // 모든 유니포인트 목록
        sql = dbQuery('account', 'selectBuyPointHistory', {user_no});
        rows = await conn.execute(sql);
        userPointList = rows[0];
        if (userPointList && userPointList.document_number) {
            userPointList.document_number = await authUtil.getDecryptToken(userPointList.document_number, process.env.JWT_SECRET_OR_KEY)
        }
        if (userPointList.length > 0 && !!userPointList[0].document_number) userPointList[0].document_number = await authUtil.getDecryptToken(userPointList[0].document_number, process.env.JWT_SECRET_OR_KEY);
        res.send({userSumInfo, userPointList, sellRSumInfo, buyRSumInfo});
    } catch (e) {
        logger.error(`accountController.js - uniPointList - 에러 ${e}`);
        next(e)
    } finally {
        conn.release();
    }
}
///////////////////////// 하단 다시 작성해보자

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
//사용자의 누적수입
exports.getUserBtcSum = async (req, res, next) => {
    try {
        const {body} = req;
        const {user_no} = body;
        const userBtcSum = await getUserBtcSum(user_no);
        res.send({coin_value: userBtcSum});
    } catch (e) {
        next(e);
    }
}
//사용자의 코인잔고
exports.getUserBtcBalance = async (req, res, next) => {
    try {
        const {body} = req;
        const {user_no} = body;
        const value = await getUserBtcBalance(user_no);
        res.send({coin_value: value});
    } catch (e) {
        next(e);
    }
}
//사용자의 코인입출금내역
exports.getUserCoinList = async (req, res, next) => {
    try {
        const {body} = req;
        const {user_no, type, size, start_num} = body;
        const list = await getUserCoinList(user_no, type, size, start_num);
        res.send(list);
    } catch (e) {
        next(e);
    }
}

// 사용자별 누적코인수익
exports.getBenefit = async (req, res, next) => {
    try {
        const {body} = req;
        const {user_no} = body;
        const info = await getBenefit(user_no);
        res.send(info);
    } catch (e) {
        next(e);
    }
}
// 사용자별 누적유니포인트
exports.getSumBuyMoney = async (req, res, next) => {
    try {
        const {body} = req;
        const {user_no} = body;
        const info = await getSumBuyMoney(user_no);
        res.send(info);
    } catch (e) {
        next(e);
    }
}

// 사용자의 포인트 판매요청
exports.sellBtcUser = async (req, res, next) => {
    logger.info(`사용자의 포인트 판매요청`);
    const conn = await dbConn.getConnection();
    try {
        const {body} = req;
        const {
            user_no, // 사용자 번호
            resaleFee, // 환매 수수료
            withdrawal, // 송금수수료
            depositAmount, // 출금요청금액
            coinAmount, // 환매요청 코인수
            bankName, // 출금신청 은행이름
            accountNo, // 계좌번호
            accountHolder // 계좌주(이름)
        } = body;

        let sql = '', rows = [], accountListNo = 0;

        // 1. tb_user_account_list 사용자 매출에 환매요청 정보 입력
        sql = dbQuery('account', 'insertUserAccount', {
            mining_day: null,
            user_no,
            type: 'S',
            coin_value: coinAmount,
            register_no: user_no, // 사용자가 요청한것이니 사용자 번호가 들어가야 한다.
            coin_type: null, // 일단은 비트코인만 존재하는 것으로 생각한다.

        });
        await conn.execute(sql);

        // 1-1 tb_user_account_list 방금 입력한 번호를 가져온다.
        sql = dbQuery('account', 'selectUserAccountListNo', {
            user_no
        });
        rows = await conn.execute(sql);
        accountListNo = rows[0][0].no
        // 2.tb_user_resale_history 사용자의 출금에 경우 별도로 출금계좌 정보를 저장한다. 나중문제 생겼을때 추적용
        sql = dbQuery('account', 'insertUserResaleHistory', {
            account_list_no: accountListNo,
            bank_account_no: accountNo,
            bank_name: bankName,
            bank_holder: accountHolder,
            coin_value: coinAmount,
            money: depositAmount,
            resale_fee: resaleFee,
            withdrawal
        });

        await conn.execute(sql);
        await conn.commit();
    } catch (e) {
        console.error(e)
        conn.rollback();
        next(e)
    } finally {
        conn.release();
    }
}