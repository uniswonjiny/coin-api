/**
 * 유용한 함수
 * @author 송원진
 */

/**
 * maridb timestatmp 형식의 날짜구하기
 * @param { Date } 변경하려는 날짜
 * @returns { String } 변경된 형식의 날짜
 */
const getTimeStamp = (date) => {
    // 닐짜를 지정해서 보내지 않으면 현재 시간을 기준으로 한다.
    if(!date) {
        date = new Date();
    }
    let year = date.getFullYear();
    let month = (1 + date.getMonth());
    month = month > 10 ? month : '0' + month;
    let day = date.getDate();
    day = day > 10 ? day : '0' + day;
    let hours = date.getHours();
    hours = hours > 10 ? hours : '0' + hours;
    let minutes = date.getMinutes();
    minutes =  minutes > 10 ? minutes : '0' + minutes;
    let seconds = date.getSeconds();
    seconds = seconds > 10 ? seconds : '0' + seconds;
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} `
}

module.exports = { getTimeStamp }