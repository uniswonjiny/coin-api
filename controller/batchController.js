/**
 * 코인정산 유니포인트구매요청후 장기 미입금 제거등 정기 배치작업용 컨트롤러
 * @author 송원진
 * */

const {dbQuery} = require("../config/dbModule");
const {getTimeStamp} = require('../utils/comUtil');
const logger = require('../config/logger');
const env = process.env.NODE_ENV || 'development';
const dbConn = require('../config/dbInfo')[env];
const {uniPointModel, coinModel, authModel, calcModel} = require('../model');
const {sourceCoinGet, dividendCoinCalc, dividendCoin} = require("../model/Coin");
/**
 * 채굴기 구매단위로 배당 가능 코인을 구한다.
 * @param { String } mining_day 배치실행대상 날짜
 */
// 아래 항목 시간차 두고 따로 따로 배치 돌려야 한다.
exports.setFitCoinBatch = async (mining_day ) => {
    logger.info(`정기코인수익 배분 실행`);

    let sql = '', rows = [];
    let originalCoin = 0.00000000; // 분배대상 원래 코인
    try {
        // 업체로 부터 최초 분배가능 금액을 확인및 입력한다.
        // await sourceCoinGet(mining_day);
        // 감가 상각및 배당 가능 코인 금액을 계산한다.
        // await dividendCoinCalc(mining_day);
        // 코인들 배당실행

        await dividendCoin(mining_day)

    } catch (e) {
        logger.error(e)
        throw new Error('채굴기별 코인수익 분배에서 문제가 발생했습니다.');
    }

    //
}


/* 코인 입고 확인 */
exports.coinWalletConfirm = async () => {
    const conn = await dbConn.getConnection();
    // 1. 코인업체별 오늘 지급금액확인 (방식은 달라질수도 있다)
    let coinSeller = 'kingkong', wallet_type, trans_type, detail_type, amount = 0.0, balance = 0.0;
    let apiData = null;
    // 2. 채굴업체에 api 호출을 통한 코인정보 확인
    // 2-1. 킹콩측 api 에서 확인해야 하나 미공개중 2022.03.15
    // 2-2. 채굴업체측 구분 가능 고유키 존재확인이나 매일 한차레만 분배되어야함
    // 가상데이터처리 항목이름도 다를수 있다.
    apiData = {uniqueKey: ''+ coinSeller+ getTimeStamp(null).split(' ')[0] ,
        wallet_type : ''}

    // 2. 지급이 확인된 코인 정보 입고및 코인확인 잔고 수정
    // 2-1. 코인내역을 확인한다.

    const sql = dbQuery('calculate', 'insertWallet', {
        uniqueKey: apiData.uniqueKey,
        wallet_type,
        trans_type,
        detail_type,
        amount,
        balance,
        created_user_no: 1, // 배치이므로 1번
        seller: coinSeller,
        memo: '최초코인입고'
    });
}


// 코인배분 수케줄프로그램
// 기본 수소점 버림으로 진행한다. 비트코인의경우 소수점도 상당한 금액이라 더줄수 없다.
// 배치실행 날짜, 배치 실행 코인종류 값을 받는다.
// batch_day - 2020-01-01
/**
 * @param { String } batch_day 배치실행대상 날짜
 * @param { String } coin_type 배치대상이 되는 코인
 * **/
exports.profitSettlement = async (batch_day, coin_type) => {
    logger.info(`정기코인수익 배분 실행 : ${batch_day} - ${coin_type}`);

    const conn = await dbConn.getConnection();
    await conn.beginTransaction();
    await calcModel.coinBatchInsert(conn, coin_type, 0, batch_day, '');
    // 분배받을 코인정보목록
    let dividendUserList = []; // {user_no: 0, coin_value: 0.0, type: 'I'}
    let recommendPlusList = []; // 추천인 플러스에 해당하는 사용자정보
    let recommendCoin = 0.0; // 추천인을 입력하 경우 추가로 받는것 직접가입한경우는 목받는다
    let recommendCoinSum = 0.0; // 유니코어 입금금액에서 빼버린다.
    let recommenderCoin = 0.0; // 추천인용 코인 - 추천받은사용자
    let recommenderCoinSum = 0.0; // 추친인용 코인 합
    let recommendPlusCoin = 0.0;
    let recommendPlusSum = 0.0; // 추천인 플러스의 합계금액
    // _ 하용하는 경우는 디비컬럼명 네이밍과 같거나 유사하게 하기위해
    let root_fee = 0.0; // 유니코어가 가져가는 분배비율
    let recommend_plus_fee = 0.0; // 추천인 플러스가 가져가는 분배비율
    let recommender_fee = 0.0; // 추천인이 가져가는 비율
    let recommend_user_fee = 0.0; // 추천인을 입력한 사용자가 가져가는 비율
    let user_fee = 0.0; // 일반적인 분배비율
    let dividendCoin = 0.0;
    let unicoreCoin = 0.0; // 회사에서 가져가는 코인

    try {
        // 0. 이미 실행된 배치 인지 확인
        // 0-1 이전에 실행된 배치 라면 바로 중단
        const batchInfo = await calcModel.coinBatchInfo(conn, coin_type, 1, batch_day, '')

        if (!!batchInfo && batchInfo.length !== 0) {
            logger.error('이미실행된 배치입니다.');
            return;
        }


        // 1. 미배정 코인정보확인
        // 1-1 coinInfo - coinSum - 분배할 코인 coinFee - 수수료 코인
        const feeList = await calcModel.feeList(conn);
        // 수수료율 / 배당금비율 확인
        for (const el of feeList) {
            if (el.fee_type === 'root') root_fee = el.fee_value;
            if (el.fee_type === 'recommend_plus') recommend_plus_fee = el.fee_value;
            if (el.fee_type === 'recommender') recommender_fee = el.fee_value;
            if (el.fee_type === 'recommend_user') recommend_user_fee = el.fee_value;
            if (el.fee_type === 'user') user_fee = el.fee_value;
        }

        const coinInfo = await coinModel.confirmCoin(batch_day, coin_type, 0, conn);
        // 2. 배정필요 고객들 유니코인 확인
        const pointInfo = await uniPointModel.uniPointList(batch_day, conn);

        // 3 . 1포인트당 분배 코인량 확정
        if (!!pointInfo) dividendCoin = Math.floor(coinInfo.coinSum * 100000000 / pointInfo.totalUniPoint) / 100000000;


        // 4. 사용자중 추천인인 존재하는 확인 - 추천인이 있다면 유니코아에서 포인트빼서 준다.
        const userRecommendList = await authModel.userRecommendInfo(null, conn);

        // 5. 일반 배정분 분배
        dividendUserList = pointInfo.pointList.map(item => {
            return {
                user_no: item.user_no,
                coin_value: item.uni_point * dividendCoin,
                type: 'I',
                register_no: 1,
                processed_time: getTimeStamp(null)
            }
        });

        // 6. 가입당시 추천인 정보를 입력한 경우 추가격려성 코인정보입력(추천인 제도를 활성화하기위해 유니코아본사의 금액을 주는것이다.)
        recommendCoin = (dividendCoin * 100000000 * recommend_user_fee) / 100000000;

        dividendUserList = dividendUserList.concat(pointInfo.pointList.map(item => {
            for (const el of userRecommendList) {
                if (el.user_no === item.user_no) {
                    recommendCoinSum += recommendCoin;
                    return {
                        user_no: item.user_no,
                        coin_value: recommendCoin,
                        type: 'R',
                        register_no: 1,
                        processed_time: getTimeStamp(null)
                    }
                }
            }
        }));

        // 7. 추천인 배당금
        recommenderCoin = (dividendCoin * 100000000 * recommender_fee) / 100000000;

        dividendUserList = dividendUserList.concat(pointInfo.pointList.map(item => {
            for (const el of userRecommendList) {
                if (item.user_no === el.recommend_user_no) {
                    recommenderCoinSum += recommenderCoin
                    // 추천여러번 받았어도  코인값 입력부분은 디비테이블의  순번이 구분값이므로 중복된 값이 어도 상관없다.
                    return {
                        user_no: item.user_no,
                        coin_value: recommenderCoin,
                        type: 'C',
                        register_no: 1,
                        processed_time: getTimeStamp(null)
                    }
                }
            }
        }));

        // 8. 추천인 플러스 배당금 -- 전체 채굴 코인에서
        recommendPlusCoin = (coinInfo.coinSum * recommend_plus_fee * 100000000) / 100000000;
        // 8-2 추천 플러스 배당받을 사람정보 획득
        recommendPlusList = await calcModel.recommendPlusList(conn);
        recommendPlusCoin = (recommendPlusCoin * 100000000 / recommendPlusList.length) / 100000000;
        dividendUserList = dividendUserList.concat(recommendPlusList.map(item => {
            recommendPlusSum += recommendPlusCoin;
            return {
                user_no: item,
                coin_value: recommendPlusCoin,
                type: 'P',
                register_no: 1,
                processed_time: getTimeStamp(null)
            }
        }))

        // 9. 회사배당금 계산 - 회사배당금은 모든 마이너스요소를 감수하는 배당금이다.
        unicoreCoin = coinInfo.coinSum - (recommendCoinSum + recommenderCoinSum + recommendPlusSum);
        // 회사의 사용자 번호는 1번이다. 1번의 수익은 모두 채굴수익이다.
        dividendUserList.concat({
            user_no: 1,
            coin_value: unicoreCoin,
            type: 'I',
            register_no: 1,
            processed_time: getTimeStamp(null)
        });

        // 10. 모든 정보 입력 -- 일단은 사용자가 적은것을 기준으로 단건 입력으로 한다. 만약 만단위의 사용자가 있다면 대량 입력문으로 변경한다.
        for (const el of dividendUserList) {
            const sql = dbQuery('account', 'insertUserAccount', el);
            await conn.execute(sql);
        }
        return;
        // 11. 배치기록 남기기
        await calcModel.coinBatchInsert(conn, coin_type, 1, batch_day, '')

        //await conn.rollback();
        await conn.commit();
    } catch (e) {
        console.log('메인에러발생!!!!!!!!!!')
        console.error(e);
        //await conn.rollback();

        //await calcModel.coinBatchInsert(conn, coin_type, 0, batch_day, '');
        //await conn.rollback();
        // await conn.commit();
    } finally {
        conn.release();
    }
}
