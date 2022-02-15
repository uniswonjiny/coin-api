/**
 * 유저정보 jwt 토큰처리, 사용자정보처리 , 암호화 등
 * @author 송원진
 */

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const logger =  require('../config/logger');

dotenv.config();
// const expiresIn = 60 * 10 ; //  10분 테스트용으로 사용했음
//algorithm (default: SHA256)
const authUtil = {
    // 키값생성
    getToken(value , privateKey, expiresIn , issuer) {
        return new Promise((resolve) => (resolve(
            jwt.sign({ value }, privateKey, { expiresIn, issuer } ,null ))
        ))
    },
    // 암호화로 사용함
    getEncryptToken(value , privateKey) {
        return new Promise((resolve) => (resolve(
                jwt.sign({ value }, privateKey, null ,null ))
        ))
    },

    // jwt 복호화
    getDecryptToken(value, privateKey) {
        return new Promise((resolve , reject) => (resolve(
            jwt.verify(value , privateKey, null ,(err , decode) => {
                if(err) {
                    logger.error(err)
                    reject(Error('jwt 복호화 오류'));
                }
                return decode.value
            }))
        ))
    },

    // 패스워드 확인
    async passCompare(inputPassWord , dbPassWord ){
        try {
            const val = await bcrypt.compare(dbPassWord, inputPassWord);
            return val
        } catch (error) {
            logger.error(error);
            throw new Error('사용자확인 문제');
        }
    },

    // 해시 키생성
    async getHashPass(password){
        try {
            return await bcrypt.hash(password,Number(process.env.CRYPTO_SALT));
        } catch (error) {
            logger.error(error);
            throw new Error('비밀번호 생성이상');
        }
    }
}

module.exports = authUtil;