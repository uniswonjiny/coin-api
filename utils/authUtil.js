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

    /**
     * 인증용 토큰 키값생성
     * @param { String }  value 변경하려는 값 사용자아이디
     * @param { String }  privateKey 인증변경용 비밀키
     * @param { Number }  expiresIn, 만료시간 밀리세컨드초
     * @param { String }  issuer 토큰발행자
     * @returns { Promise<String> } 인증키
     */
    getToken(value , privateKey, expiresIn , issuer) {
        return new Promise((resolve) => (resolve(
            jwt.sign({ value }, privateKey, { expiresIn, issuer } ,null ))
        ))
    },

    /**
     * 인증용 토큰 키을 단순 암호화로 사용할 경우
     * @param { String }  value 변경하려는 값 사용자아이디
     * @param { String }  privateKey 인증변경용 비밀키
     * @returns { Promise<String> } 암호화키값
     */
    getEncryptToken(value , privateKey) {
        // 소스상에 린트설정등에서 오류나 주의 표시 주지만 jwt.verify 가 Promise 리턴하지 않음
        return new Promise((resolve) => (resolve(
                jwt.sign({ value }, privateKey, null ,null ))
        ))
    },

    /**
     * jwt 복호화 인증키값에서 복호화된 한값추출
     * @param { String }  value 변경하려는 값 사용자아이디
     * @param { String }  privateKey 인증변경용 비밀키
     * @returns {  Promise<String>  } 복호화된값
     */
    getDecryptToken(value, privateKey) {
        // 소스상에 린트설정등에서 오류나 주의 표시 주지만 jwt.verify 가 Promise 리턴하지 않음
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

    /**
     * bcrypt 를 이용한 입력암호 디비에암호화된 패스워드와 비교
     * @param { String }  inputPassWord  사용자가 입력한 패스워드
     * @param { String }  dbPassWord 디비에 저장된 암호화된 패스워드
     * @returns { Promise<String> } 복호화된값
     */
    async passCompare(inputPassWord , dbPassWord ){
        try {
            return await bcrypt.compare(dbPassWord, inputPassWord);
        } catch (error) {
            logger.error(error);
            throw new Error('사용자정보 확인중 문제가 발생했습니다.');
        }
    },

    /**
     * 해시키 생성 복호화 안되는 암호화! 비밀번호 암호화에 사용한다.
     * @param { String }  password  사용자가 입력한 패스워드
     * @returns { Promise<String> } 복호화된값
     */
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
