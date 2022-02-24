/**
 * 일반정보나 공통 정보 서비스 컨트롤러
 * @author 송원진
 * */

const logger = require('../config/logger');
const {dbQuery} = require("../config/dbModule");
const env = process.env.NODE_ENV || 'development';
const dbConn = require('../config/dbInfo')[env];

// 유니포인트 입금계좌
exports.accountInfo = async (req, res, next) => {
    const conn = await dbConn.getConnection();
    try {
        const sql =  dbQuery('common', 'selectUnicoreAccountInfo', null);
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

// 유니포인트 현재 가격정보
exports.uniPointPrice = async (req, res, next) => {
    const conn = await dbConn.getConnection();
    try {
        const sql =  dbQuery('common', 'selectUniPointPrice', null);
        const rows = await conn.execute(sql);
        if (rows[0].length === 0) throw new Error("유니코어 포인트 시세정보가 없습니다.");
        res.json(rows[0][0].price);
    } catch (e) {
        logger.error(`commonController.js - accountInfo - 에러 ${e}`);
        next(e);
    } finally {
        conn.release();
    }
}