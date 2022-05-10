/**
 * 코인 정보 모델
 * @author 송원진
 * */
const logger = require('../config/logger');
const {dbQuery} = require("../config/dbModule");
const {getTimeStamp, getDate, randomNumber} = require('../utils/comUtil')
const fetch = require("node-fetch");
const env = process.env.NODE_ENV || 'development';
const dbConn = require('../config/dbInfo')[env];

/**
 * 코인정보 - 분배용코인 수수료용코인 정보 -- 분배 코인항목이
 * @param { String } batch_day 배치날짜 코인수익금 입금날짜
 * @param { String } coin_type 코인타입
 * @param { Number } confirm_yn 코인배분상태 1배분 0미배분
 * @param { Object } conn mysql2 pool promise 디비접속 커넥션
 * @returns { Object<float, float> } - coinSum 코인배분전체함 , coinFee - 코인수수료 전체합
 */
const confirmCoin = async (batch_day, coin_type, confirm_yn, conn) => {
    try {
        logger.info(`분배용코인 수수료용코인 확정`)
        const sql = dbQuery('calculate', 'selectCoinConfirmStatusList', {mining_day: batch_day, coin_type, confirm_yn});
        const rows = await conn.execute(sql);

        let coinSum = 0.0, rootCoin = 0.0, recommendPlusCoin = 0.0, recommenderCoin = 0.0;
        // 수수료 분배용 코인 추천인 본사 등등
        let coinFee = 0.0;
        if (rows[0].length === 0) throw new Error('코인정보가 없습니다.');
        // 미배정 코인 총합
        rows[0].forEach(({coin_value}) => coinSum += Number(coin_value));
        // 분배 코인오차가 발생할수 있으므로 버림으로 수수료에 적용 버림된 수치는 자연스럽게 분배용 코인으로 간다.
        // 수수료율은 디비에서 조회해와야 한다 수정필요!!!!
        // 추천인 관련 수수료는 추천인을 입력한 고객에게 유니코아의 수수료에서 빼서 주는것이다.
        coinFee = Math.floor(Number(coinSum) * 100000000 * 0.25) / 100000000;
        // 분배대상 코인에서 수수료를 제외한다.
        coinSum = (coinSum * 100000000 - coinFee * 100000000) / 100000000;
        return {coinSum, coinFee}
    } catch (e) {
        console.error(e)
        throw e;
    }
}

/**
 * 코인정보 - 분배용코인 수수료용코인 정보 입력
 * @param { Array } list 분배받을 사용자목록 -- 참고로 사용자가 수천명단위로 생기지 않을 것을 예상하고 반복문 처리한다. 만약 배치가 느리다면 대량입력형식으로 바꿔라!
 * @param { Object } conn mysql2 pool promise 디비접속 커넥션
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

/**
 * 업비트 비트코인실시간 시세정보 확인및 검색당시 시세 디비에 저장
 * @param { Object } conn mysql2 pool promise 디비접속 커넥션
 * @param { Boolean } insertFlag 디비접속 커넥션
 * @returns { Object } - 코인정보
 */

const upBitBitCoinPrice = async (conn, insertFlag) => {
    try {
        console.log("코인 2")
        const options = {method: 'GET', headers: {Accept: 'application/json'}};
        const url = 'https://api.upbit.com/v1/candles/minutes/1?market=KRW-BTC&count=1';
        const response = await fetch(url, options);
        console.log(response)
        const data = await response.json();
        console.log(data)
        const search_time = data[0].candle_date_time_kst;
        const one_price = data[0].trade_price;
        const coin_type = 'bit_coin';
        const company_name = '업비트';
        if (insertFlag) {
            const sql = dbQuery('batch', 'insertCoinCurrency', {
                search_time, one_price, coin_type, company_name
            });
            await conn.execute(sql);
        }
        return data[0];
    } catch (e) {

        logger.error(e);
    }
}

/**
 * 채굴기 숫자구매횟수 만큼 업체에서 정보를 준다는 가정하에 진행한다.
 * @param { string } mining_day 채굴날짜
 * */
const sourceCoinGet = async (mining_day) => {
    logger.info(`분배용코인 수수료용코인 확정`);
    const conn = await dbConn.getConnection();
    let sql = '', rows = [], rows2 = [];
    let company_code = '', fee_coin = 0.0, coin_type = '', coin_value = 0.0;
    try {
        await conn.beginTransaction();
        if (!mining_day) mining_day = getDate();
        //업체제공 api 에 따라서 추가 개발 해야 하는 부분!!!!! 개발 !!!!
        // 일단은 구매한 th 단위 즉 업체측의 구매단위 코드순으로 조회하고 배당 가능 btc 를 생성한다.
        sql = dbQuery('batch', 'selectPurchaseMachineList', null);
        rows = await conn.execute(sql);
        // 1. 업체측 구매 단위 조회 (즉 유니코아가 2회 구매한것 금액X 구매회수O)
        for (const el of rows[0]) {
            company_code = el.company_code
            // 이미 정보 획득했는지 확인
            sql = dbQuery('batch', 'selectSourceIncomeCoin', {
                company_code, mining_day
            });
            rows2 = await conn.execute(sql);
            // 존재한다면 이미 조회해온것이다.
            if (rows2[0].length > 0) continue;

            // 1th 당 채굴개수 -- 채굴업체 정보가 없어서 임시 로 랜덤 생성
            const returnCoinValue = randomNumber(200000000, 100000000) / 100000000 * el.th;
            const returnCoinFee = randomNumber(20000000, 10000000) / 100000000 * el.th;
            sql = dbQuery('batch', 'insertSourceIncomeCoin', {
                coin_type: 'bit_coin',
                coin_value: returnCoinValue,
                mining_day,
                company_code,
                fee_coin: returnCoinFee,
                purchase_machine_no: el.purchase_no
            });
            await conn.execute(sql);
        }
        await conn.commit();
    } catch (e) {
        logger.error(e);
        await conn.rollback();
    } finally {
        conn.release();
    }
}


/**
 * 감가강각 & 배당가능 btc 계산하기 및 지갑 현황 변경
 * @param { string } mining_day 채굴날짜
 * */
const dividendCoinCalc = async (mining_day) => {
    let sql = '', rows = [], rows2 = [];
    const conn = await dbConn.getConnection();
    try {
        await conn.beginTransaction();
        if (!mining_day) mining_day = getDate();

        // 구매 th
        sql = dbQuery('batch', 'getThSourceList', {mining_day});
        rows = await conn.execute(sql);
        if (rows[0].length === 0) throw new Error(`${mining_day} : 입금대상 코인정보가 없습니다.`);
        // 현재 비트코인 시세확인
        const coinInfo = await upBitBitCoinPrice(conn, true);
        if (!coinInfo) throw new Error(`${mining_day} : 코인 가격 확인실패로 중단함`);

        for (const el of rows[0]) {
            // 감사상각 계산
            const de_coin = Math.floor((el.amount / el.de_day / coinInfo.trade_price) * 100000000) / 100000000; // amount 는 th금액 * 운영 th 수이다
            // 배당코인
            const fit_coin = Number(el.coin_value) - Number(de_coin);
            // 감가상각 배당대상코인 정보 추가
            sql = dbQuery('batch', 'updateSourceIncomeCoinDeFitCoin', {
                de_coin, fit_coin, mining_day, company_code: el.company_code,
                coin_currency: coinInfo.trade_price, coin_currency_time: coinInfo.candle_date_time_kst.replace('T', ' ')
            });
            await conn.execute(sql);
            // 지갑 현환 변경및 이력 저장
            // 감가상각 코인처리
            // 현지갑 현황 확인
            sql = dbQuery('batch', 'getWalletCoinValue', {
                wallet_type: 'depreciation_wallet',
                coin_type: el.coin_type
            });
            // 이값은 무조건 존재한다는 가정이다.
            rows2 = await conn.execute(sql);
            const depreciation_wallet_coin_value = rows2[0][0].coin_value;
            // 이력부 입력
            sql = dbQuery('batch', 'insertWalletHistory', {
                wallet_type: 'D',
                trans_type: 'I',
                amount: depreciation_wallet_coin_value,
                balance: Number(depreciation_wallet_coin_value) + Number(de_coin),
                created_user_no: 1, // 배치에서 작동하는것이므로 1 unicore
                income_no: el.income_no
            });
            await conn.execute(sql);
            // 현황변경
            sql = dbQuery('batch', 'updateWalletInfo', {
                wallet_type: 'depreciation_wallet',
                coin_value: Number(depreciation_wallet_coin_value) + Number(de_coin),
                coin_type: el.coin_type
            });
            await conn.execute(sql);
            // 배당코인처리
            sql = dbQuery('batch', 'getWalletCoinValue', {
                wallet_type: 'benefit_wallet', // 수익지갑
                coin_type: el.coin_type
            });
            rows2 = await conn.execute(sql);
            const benefit_wallet_coin_value = rows2[0][0].coin_value;
            // 이력부 입력
            sql = dbQuery('batch', 'insertWalletHistory', {
                wallet_type: 'F',
                trans_type: 'I',
                amount: benefit_wallet_coin_value,
                balance: Number(benefit_wallet_coin_value) + Number(fit_coin),
                created_user_no: 1, // 배치에서 작동하는것이므로 1 unicore
                income_no: el.income_no
            });
            await conn.execute(sql);

            // 현황변경
            sql = dbQuery('batch', 'updateWalletInfo', {
                wallet_type: 'benefit_wallet',
                coin_value: Number(benefit_wallet_coin_value) + Number(fit_coin),
                coin_type: el.coin_type
            });
            await conn.execute(sql);
        }
        await conn.commit();
    } catch (e) {
        await conn.rollback();
        logger.error(e);
    } finally {
        conn.release();
    }
}

/**
 * 배당코인을 각 개인 추천 추천인 본가 로 분배한다
 * @param { string } mining_day 채굴날짜
 * */
const dividendCoin = async (mining_day) => {
    let calCoin = 0.0, // 각상황별 계산되는 코인량
        reMainCoin = 0.0; // 분배해주고 남은 코인은 유니코아 회사의 코인이다.

    const conn = await dbConn.getConnection();
    try {
        if (!mining_day) throw new Error(`채굴된 날짜가 누락되었습니다.`);
        let sql = '', rows = [], benefitCoin = 0.0, uniPoint = 0, recommendPlusCoin = 0.0, recommendPlusCount = 0,
            recommendPlusList = [], // 추천인 플러스 목록
            soldUniPoint = 0,  // 판매된 유니포인트
            totalUniPoint = 0, // 전체 유니포인트(판매 + 미판매 포인트)
            pointPerCoin = 0.0; // 포인트당 코인분배량
        // 수수료율
        let rootFee = 0.0, recommendPlusFee = 0.0, recommendFee = 0.0, recommendUserFee = 0.0, userFee = 0.0;
        // 분배가능 코인수량 확인
        sql = dbQuery('batch', 'selectSourceIncomeConfirmN', {mining_day})
        rows = await conn.execute(sql);
        if (rows[0].length == 0) throw new Error(`${mining_day}: 배분 코인내역이 없습니다.`);
        benefitCoin = rows[0][0].coin;
        reMainCoin = rows[0][0].coin;
        uniPoint = rows[0][0].point;
        if (benefitCoin < 0.00000001) throw new Error(`${mining_day}: 배분할 코인수량이 없습니다.`);
        // 수수료율을 확인
        sql = dbQuery('batch', 'selectFeeInfo', null);
        rows = await conn.execute(sql);
        for (const el of rows[0]) {
            if (el.fee_type === 'root') rootFee = el.fee_value;
            if (el.fee_type === 'recommend_plus') recommendPlusFee = el.fee_value;
            if (el.fee_type === 'recommender') recommendFee = el.fee_value;
            if (el.fee_type === 'recommend_user') recommendUserFee = el.fee_value;
            if (el.fee_type === 'user') userFee = el.fee_value;
        }
        // * 추천인 플러스 해당 모집인들 추출
        // 1. 추천 플러스 해당 사용
        // 추천인 플러스에 해당하는 금액획득
        sql = dbQuery('batch', 'getRecommendPlusPrice', null);
        rows = await conn.execute(sql);
        // 추천인 플러스에 해당하는 목록획득
        sql = dbQuery('batch', 'selectRecommendPlusList', {money: rows[0][0].value});
        recommendPlusList = await conn.execute(sql);
        recommendPlusCount = recommendPlusList[0].length; // 추천인 플러스해당 인원수 확인
        // 판매된 유니포인트 수량확인
        sql = dbQuery('account', 'selectThPointStatusNow', null);
        rows = await conn.execute(sql); // sold_uni_point
        soldUniPoint = rows[0][0].sold_uni_point;
        totalUniPoint = rows[0][0].uni_point;

        //추천플러스 인당 지급금액 계산

        // 유니포인트당 분배코인량 계산
        pointPerCoin = Math.floor(benefitCoin * 100000000 / totalUniPoint) / 100000000;
        // 추천 플로스 해당자가 받게될 코인량 계산
        recommendPlusCoin = pointPerCoin * soldUniPoint * recommendPlusFee / recommendPlusCount;

        // 추천플러스 금액 해당 개인에게 입금
        for (const el of recommendPlusList) {
            reMainCoin -= recommendPlusCoin;
            await updateUserCoin(conn, mining_day, el.recommend_user_no, 'P', 'Y', 1, 'bit_coin', recommendPlusCoin)
        }

        // 추천인 소득입력
        //// 추천인(모집인) 목록과 모집 포인트 추출
        sql = dbQuery('calculate', 'selectRecommendUserNoList', null);
        rows = await conn.execute(sql);

        for (const el of rows) {
            //추천받은 사람들이 받게될 코인량 계산 -> 포인트당 배당 btc * 모집인 포인트 * 추천배당률
            calCoin = Math.floor(Number(pointPerCoin) * 100000000 * Number(el.uni_point) * Number(recommendFee)) / 100000000;
            reMainCoin -= calCoin;
            await updateUserCoin(conn, mining_day, el.recommend_user_no, 'C', 'Y', 1, 'bit_coin', calCoin);
        }

        // 채굴수익
        // 추천인입력한 회원과 추천인을 입력하지 않은 회원의 코인입력금액이 다른다. getUserRecommendUser
        sql = dbQuery('calculate', 'getUserRecommendUser', null);
        rows = await conn.execute(sql);
        for (const el of rows) {
            if (!el.uni_point) continue;
            if (el.recommend_user_no) {
                calCoin = Number(pointPerCoin) * el.uni_point * (recommendUserFee + recommendUserFee);
            } else {
                calCoin = Number(pointPerCoin) * el.uni_point * userFee;
            }
            reMainCoin -= calCoin;
            await updateUserCoin(conn, mining_day, el.user_no, 'I', 'Y', 1, 'bit_coin', calCoin);
        }
        // 남은 코인은 이제 회사에서 다가져간다
        await updateUserCoin(conn, mining_day, 1, 'I', 'Y', 1, 'bit_coin', reMainCoin);
        await conn.commit();
    } catch (e) {
        logger.error(e);
        await conn.rollback();
    } finally {
        conn.release();
    }
}

/**
 * 사용자의 포인트를 업데이트 하고 사용자의 전체 금액을 수정한다.
 * @param { Pool } conn 디비접속 커넥션
 * @param { string } mining_day 채굴날짜
 * @param { Number } user_no 사용자번호
 * @param { string } insertType 이력입력타입
 * @param { string } updateType 수정되는 총합타입
 * @param { Number } register_no 등록자 번호
 * @param { String } coin_type 채굴코인타입
 * @param { Number } coinValue 코인수량
 * */
const updateUserCoin = async (conn, mining_day, user_no, insertType, updateType, register_no, coin_type, coinValue) => {
    try {
        let sql = dbQuery('account', 'insertUserAccount', {
            mining_day,
            user_no,
            type: insertType,
            coin_value: coinValue,
            register_no: 1,
            coin_type: coin_type
        })
        await conn.execute(sql);

        // 현재 추천인 플러스대상자가 보유한 금액수정
        // 개인 통합 코인 정보 변경 -- 확정금액이다 -- 개인들 코인금액들 부분 합계 이력 부분은 공통화해서 바꾼다
        sql = dbQuery('account', 'selectSumUniPoint', {type: 'Y'});
        const rows = await conn.execute(sql);
        sql = dbQuery('account', 'updateUserSum', {
            btc_point: Number(rows[0][0].btc_point) + Number(coinValue),
            user_no,
            type: updateType
        });
        await conn.execute(sql);
    } catch (e) {
        logger.error(e);
    }
}

/**
 * 사용자의 누적수입
 * @param { Number } user_no 사용자번호
 * */
const getUserBtcSum = async (user_no) => {
    const conn = await dbConn.getConnection();
    try {
        const sql = dbQuery('account', 'getUserBtcSum', {
            user_no
        })
        const rows = await conn.execute(sql);
        return rows[0][0].coin_value
    } catch (e) {
        logger.error(e);
    } finally {
        conn.release();
    }
}
/**
 * 사용자의 코인잔고
 * @param { Number } user_no 사용자번호
 * */
const getUserBtcBalance = async (user_no) => {
    const conn = await dbConn.getConnection();
    try {
        const sql = dbQuery('account', 'getUserBtcBalance', {user_no})
        const rows = await conn.execute(sql);
        return rows[0][0].coin_value
    } catch (e) {
        logger.error(e);
    } finally {
        conn.release();
    }
}
/**
 * 사용자의  코인입출금내역
 * @param { Number } user_no 사용자번호
 * @param { String } type 입출력양식
 * @param { Number } size 찾을갯수
 * @param { Number } start_num 찾을때 시작 위치 페이징 위치
 * @returns { Object }
 * */
const getUserCoinList = async (user_no, type, size, start_num) => {
    const conn = await dbConn.getConnection();
    try {
        let returnObject = {list : [] , count : 0}
        let sql = dbQuery('account', 'getUserCoinList', {user_no, type, size, start_num})
        let rows = await conn.execute(sql);
        returnObject.list = rows[0]
        sql = dbQuery('account', 'countUserCoinList', {user_no, type, size, start_num})
        rows = await conn.execute(sql);
        returnObject.count = rows[0][0].count;
        return returnObject;
    } catch (e) {
        logger.error(e);
    } finally {
        conn.release();
    }
}
// 사용자별 코인 누적 수익
const getBenefit = async (user_no) => {
    const conn = await dbConn.getConnection();
    try {
        const sql = dbQuery('account', 'getBenefit', {user_no})
        const rows = await conn.execute(sql);
        return rows[0];
    } catch (e) {
        logger.error(e);
    } finally {
        conn.release();
    }
}

// 사용자별 누적 포인트구매
const getSumBuyMoney = async (user_no) => {
    const conn = await dbConn.getConnection();
    try {
        const sql = dbQuery('account', 'getSumBuyMoney', {user_no})
        const rows = await conn.execute(sql);
        return rows[0][0];
    } catch (e) {
        logger.error(e);
    } finally {
        conn.release();
    }
}


module.exports = {
    confirmCoin,
    insertUserCoin,
    insertCoinSum,
    upBitBitCoinPrice,
    sourceCoinGet,
    dividendCoinCalc,
    dividendCoin,
    updateUserCoin,
    getUserBtcSum,
    getUserBtcBalance,
    getUserCoinList,
    getBenefit,
    getSumBuyMoney
};
