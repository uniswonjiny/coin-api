const express = require('express');
const port = process.env.PORT || 80;
const cors = require('cors');
const morgan = require('morgan');
//const requestTimeout = require('connect-timeout'); // 접속요청 시간 제한하기
const app = express();
app.use(morgan('combined')); // http 요청 로그 관리
app.use(express.static('public'));
const path = require('path')
const prod = process.env.NODE_ENV === 'production';

app.use(cors({
    origin: '*', // 허용할 도메인 설정
    credentials: true,
}));
app.use(express.urlencoded({extended : false}));
app.use(express.json());

const userRouter = require('./routes/auth');
const accountRouter = require('./routes/account');
const comRouter = require('./routes/com')
app.use('/api/auth' , userRouter);
app.use('/api/account' , accountRouter);
app.use('/api/com' , comRouter);
// api 서버라 화면 구성안함
// app.use(express.static(path.join(__dirname,'/dist')));
/*
app.get('/!*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist' ,'index.html'))
});
*/

// 없는 요청인경우
app.use((req, res, next) => {
    // 그냥 에러로 날려버린다.
  next(Error('not found'));
})
// 요청부분 에러발생한경우

app.use(errorHandler);

// 오류사항 처리 미들웨어 - 나중에 세분화 할예정
function errorHandler(err, req, res, next){
    console.log("*********************************************");
    console.log(err)
    if(res.statusCode === 200)res.status(500);
    res.send({ message: err.message || '현재 서비스를 이용하실수 없습니다.' });
}

app.listen(port, () => console.log(`app listening at ${port}`))