const schedule = require('node-schedule');
const {profitSettlement, setFitCoinBatch} = require("./controller/batchController");


// 실행을 새벽 에 실행하는것으로 하므로 이전 날짜 분에 대해서만 코인 분배를 실시한다.

const job1 = async () => {
    await setFitCoinBatch('2022-03-01')
    // const coin_type = "bitCoin";
    // let batchDay = new Date();
    // batchDay.setDate(batchDay.getDate() - 1);
    // batchDay = batchDay.toISOString().split('T')[0].toString();
    // batchDay = '2022-02-17';
    // try {
    //
    //     await profitSettlement(batchDay, coin_type);
    //     await console.log('배치종료');
    // } catch (e) {
    //     console.log('에러발생')
    //     console.log(e)
    // }
}
job1().then()
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
