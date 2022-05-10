const jwt = require('jsonwebtoken');
const logger = require('../config/logger');
const dotenv = require('dotenv');
dotenv.config();

const auth = {
    /**
     * 인증전용 서비스 인증확인용 미들웨어
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    async ensureAuth(req, res, next) {
        try {
            const {authorization} = req.headers;
            // 헤더에 인증키가 존재하는지 확인
            if (!authorization) {
                logger.error(`인증키가 존재하지 않음 - ${req.ip}`);
                return res.status(401).send('인증키가 존재하지 않음');
            }
            // 인증키가 위변조 된것인지 확인
            await jwt.verify(authorization, process.env.JWT_SECRET_OR_KEY, null, null);
            next();
        } catch (e) {
            logger.error(`인증키에 문제가 있습니다. ${e}`);
            res.status(401).send('인증이 필요한 서비스 요청입니다. 다시 로그인하세요');
        }
    },

    /**
     * 인증키 없이 들어와야 한다.
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    notAuth(req, res, next) {
        try {
            const {authorization} = req.headers;
            if (!authorization) return next();
            jwt.verify(authorization, process.env.PRIVATE_KEY, null, (err, decoded) => {
                    if (err) res.status(401).send('불법 인증키 확인! 인증키 해제후. 서비스를 이용하세요');
                    if (decoded) {
                        if (decoded.issuer === process.env.JWT_ISSUER) {
                            res.status(401).send('인증키 해제후. 서비스를 이용하세요');
                        }
                    }
                    next();
                }
            );


        } catch (e) {
            logger.error(`인증키에 문제가 있습니다. ${e}`);
            res.status(401).send('인증키 해제후. 서비스를 이용하세요');
        }
    }
}

module.exports = auth;
