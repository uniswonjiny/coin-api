const jwt = require('jsonwebtoken');
const logger =  require('../config/logger');
const dotenv = require('dotenv');
const authUtil = require('../utils/authUtil');
dotenv.config();

const auth = {
    // 인증전용 서비스 인증확인용 미들웨어
    async ensureAuth(req , res, next) {
        try {
            const { authorization } = req.headers;
            // 헤더에 인증키가 존재하는지 확인
            if (!authorization) {
                logger.error(`인증키가 존재하지 않음 - ${req.ip}` );
                return res.status(401).send('인증키가 존재하지 않음');
                //throw new Error('인증되지 않은 요청입니다. 다시 로그인하세요');
            }
            // 인증키가 위변조 된것인지 확인
            const decoded = await jwt.verify(authorization, process.env.JWT_SECRET_OR_KEY, null , null);
            // 인증확인후 response 에 갱신된 인증키를 보낸다.
            const token = await authUtil.getToken(decoded.value ,process.env.PRIVATE_KEY , process.env.JWT_EXPIRES_TIME, process.env.JWT_ISSUER)
            // 인증용 갱신된 인증키를 response 에 적용한다.
            res.header('authorization' , token);
            next();
        } catch (e) {
            logger.error(`인증키에 문제가 있습니다. ${e}` );
            res.status(401).send('인증이 필요한 서비스 요청입니다. 다시 로그인하세요');
        }
    },
    // 인증키 없이 들어와야 한다.
    notAuth(req , res, next) {
        try {
            const { authorization } = req.headers;
            if(!authorization) return next();
            jwt.verify(authorization, process.env.PRIVATE_KEY, null , (err , decoded) =>{
                    if(err) res.status(401).send('불법 인증키 확인! 인증키 해제후. 서비스를 이용하세요');
                    if(decoded){
                        if(decoded.issuer === process.env.JWT_ISSUER ) {
                            res.status(401).send('인증키 해제후. 서비스를 이용하세요');
                        }
                    }
                next();
                }
            );


        } catch (e) {
            logger.error(`인증키에 문제가 있습니다. ${e}` );
            res.status(401).send('인증키 해제후. 서비스를 이용하세요');
        }
    }
}

module.exports = auth;
