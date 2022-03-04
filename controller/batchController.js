/**
 * 코인정산 유니포인트구매요청후 장기 미입금 제거등 정기 배치작업용 컨트롤러
 * @author 송원진
 * */
const logger = require('../config/logger');
const env = process.env.NODE_ENV || 'development';
const dbConn = require('../config/dbInfo')[env];
const {uniPointModel, coinModel} = require('../model')

// 코인배분 수케줄프로그램
// 기본 수소점 버림으로 진행한다. 비트코인의경우 소수점도 상당한 금액이라 더줄수 없다.
// 배치실행 날짜, 배치 실행 코인종류 값을 받는다.
// batch_day - 2020-01-01
const profitSettlement = async (batch_day, coin_type) => {
    logger.info(`정기코인수익 배분 실행 : ${batch_day} - ${coin_type}`);
    const conn = await dbConn.getConnection();
    // 분배받을 사람들 목록
    let dividendUserList = [];
    let recomendCoin = 0.0; // 추천인을 입력하 경우 추가로 받는것 직접가입한경우는 목받는다
    let dividendCoin = 0.00000000;
    try {
        // 1. 미배정 코인정보확인
        // 1-1 coinInfo - coinSum - 분배할 코인 coinFee - 수수료 코인
        const coinInfo = coinModel.confirmCoin( batch_day, coin_type, 0, conn);

        // 2. 배정필요 고객들 유니코인 확인
        const pointInfo = uniPointModel.uniPointList(batch_day, conn);

        /*  2022-03-04 여기까지함!!! */

        // 3. 1포인트당 주어질 비트코인량 확정
        // 배정가능한 포인트가 존재할경우에 한해서진행한다.
        if (pointInfo) {
            dividendCoin = Math.floor(coinInfo.coinSum / pointInfo.totalUniPoint * 100000000) / 100000000;
            if (pointInfo.pointList && pointInfo.pointList.length === 0) {
                dividendUserList = pointInfo.pointList.map(element => {
                    return {
                        btc_point: element.uni_point * dividendCoin,
                        user_no: element.user_no,
                        type: 'Y',
                        uni_point: 0
                    };
                })
            }
        }
        // 4. 수익코인 분배

        // 유효한 유니포인트가 없는경우 배정할 포인트가 없는 경우 수수료로 모두 사용한다.
        if (dividendUserList.length === 0) {
            coinInfo.coinFee += coinInfo.coinSum;
        } else {
            // 투자자 들에게 비트코인 분배
            // 시용자별 입출금 내역에 입금
            // 추천수익으로 변경한다.
            dividendUserList = dividendUserList.map(item => {
                if(item.recommend_user_no) {
                    item.type='C';
                    item.coin_value = recomendCoin;
                    return item;
                }
            });

            coinModel.insertUserCoin(dividendUserList, conn);
            // 사용자 전체 합계금액수정
            coinModel.insertCoinSum(dividendUserList, conn);
        }
        // 5. 수수료 비트코인 윗단계 판매자들에게 분배
        // 추천인을 입력한 사용자에게 추가로 지급하는 코인 - 직접이아닌 추천인을 입력한 경우에 유니코아본사의 코인을 떼어서 준다.
        recomendCoin = ((coinInfo.coinFee + coinInfo.coinSum) * 0.077 * 100000000) / 100000000;

        // 추천인 플러스

        // 추천인

        // 유니코아


        await conn.commit();
    } catch (e) {
        console.error(e);
        await conn.rollback();
    } finally {
        conn.release();
    }
}


export {profitSettlement}