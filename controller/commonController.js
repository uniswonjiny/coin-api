/**
 * 일반정보나 공통 정보 서비스 컨트롤러
 * @author 송원진
 * */

const logger = require('../config/logger');
const {dbQuery} = require("../config/dbModule");
const env = process.env.NODE_ENV || 'development';
const dbConn = require('../config/dbInfo')[env];
const {upBitBitCoinPrice} = require("../model/Coin");

/**
 * 비크코인 시세정보 확인및 입력
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.bitCoinInfoInsert = async (req, res) => {
    const conn = await dbConn.getConnection();
    try {
        const insert = req.params.insert === 'true';
        const date = await upBitBitCoinPrice(conn, insert);
        res.send(date)
    } catch (e) {
        logger.error(e);
        res.send("실패")
    } finally {
        conn.release();
    }
}

/**
 * 유니포인트 입금계좌
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.accountInfo = async (req, res, next) => {
    const conn = await dbConn.getConnection();
    try {
        const sql = dbQuery('common', 'selectUnicoreAccountInfo', null);
        const rows = await conn.execute(sql);
        if (rows[0].length === 0) throw new Error("유니코어 계좌정보가 없습니다.");
        res.json(rows[0][0]);
    } catch (e) {
        logger.error(`commonController.js - accountInfo - 에러 ${e}`);
        next(e);
    } finally {
        conn.release();
    }
}

/**
 * 유니포인트 현재 가격정보
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.uniPointPrice = async (req, res, next) => {
    const conn = await dbConn.getConnection();
    try {
        const sql = dbQuery('common', 'selectUniPointPrice', null);
        const rows = await conn.execute(sql);
        if (rows[0].length === 0) throw new Error("유니코어 포인트 시세정보가 없습니다.");
        const {price} = rows[0][0];
        if(!price) throw new Error("유니코어 포인트 시세정보가 없습니다.");
        res.json(price);
    } catch (e) {
        logger.error(`commonController.js - accountInfo - 에러 ${e}`);
        next(e);
    } finally {
        conn.release();
    }
}

/**
 * 비트코인 현재시세
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.bitCoinCurrent = async (req, res, next) => {
    const conn = await dbConn.getConnection();
    try {
        const sql = dbQuery('common', 'getBitCoinPrice', null);
        const rows = await conn.execute(sql);
        if (rows[0].length === 0) throw new Error("유니코어 포인트 시세정보가 없습니다.");
        res.json(rows[0][0]);
    } catch (e) {
        logger.error(`commonController.js - bitCoinCurrent - 에러 ${e}`);
        next(e);
    } finally {
        conn.release();
    }
}

/**
 * 회사설정 수수료율
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.settingFeeList = async (req, res, next) => {
    const conn = await dbConn.getConnection();
    try {
        const sql = dbQuery('common', 'getSettingFeeList', null);
        const rows = await conn.execute(sql);
        if (rows[0].length === 0) throw new Error("유니코어측 대외정보 설정에 문제가 있습니다.");
        res.json(rows[0]);
    } catch (e) {
        logger.error(`commonController.js - settingFeeList - 에러 ${e}`);
        next(e);
    } finally {
        conn.release();
    }
}
