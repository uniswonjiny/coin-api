// 이 배치는 단순한 시세등 복잡하지 않은 정보 조회스케줄러이다.

const schedule = require('node-schedule');
const { upBitCoinPrice} = require("./controller/batchController");

// 1. 코인시세 스케줄러
const coinPriceJob = () =>{
    schedule.scheduleJob('1 0/10 * * * * ',upBitCoinPrice)
}

coinPriceJob();

// const coinPriceJob = () =>{
//     schedule.scheduleJob('1 0/10 * * * * ',upBitCoinPrice)
// }
//
// coinPriceJob();



// const job1 = async () => {
//     await setFitCoinBatch('2022-03-01')
//     // const coin_type = "bitCoin";
//     // let batchDay = new Date();
//     // batchDay.setDate(batchDay.getDate() - 1);
//     // batchDay = batchDay.toISOString().split('T')[0].toString();
//     // batchDay = '2022-02-17';
//     // try {
//     //
//     //     await profitSettlement(batchDay, coin_type);
//     //     await console.log('배치종료');
//     // } catch (e) {
//     //     console.log('에러발생')
//     //     console.log(e)
//     // }
// }
// job1().then()
//schedule.scheduleJob('* * * * * *', ()=> (console.log("테스트")));
// 실제 실행 스케줄러 새벽 00시 1분 59초
console.log("배치시행");


// const job1 = schedule.scheduleJob('59 * * * * *',
//     function () {
//         console.log("배치시행11111");
//         profitSettlement(batchDay.toISOString().split('T')[0], coin_type).then(r => (console.log("테스트")))
//     }
// );
// 테스트이므로 실행후 바로 잡 삭제
// job1.cancel();
