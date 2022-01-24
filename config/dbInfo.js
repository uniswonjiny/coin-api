/**
 * 디비 개발용 실제운영용 정보 설정하는부분 .env 를 사용함 실제 정보는 담당자에게 물어보기 바람
 * @author 송원진
 * @date  2022-01-00
 */

const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
dotenv.config();

module.exports = {
    development:
        mysql.createPool({
            host: process.env.DB_HOST_COIN_DEV,
            password: process.env.DB_PASSWORD_COIN_DEV,
            user: process.env.DB_USERNAME_COIN_DEV,
            port: process.env.DB_POST_COIN_DEV,
            database: process.env.DB_DATABASE_COIN_DEV,
            waitForConnections: true,
            connectionLimit: process.env.DB_DEV_CONN_LIMIT,
            timezone: '+09:00',
            debug: false,
            trace: true
        }),
    production:
        mysql.createPool({
            host: process.env.DB_HOST_COIN_PROP,
            password: process.env.DB_PASSWORD_COIN_PROP,
            user: process.env.DB_USERNAME_COIN_PROP,
            port: process.env.DB_POST_COIN_PROP,
            database: process.env.DB_DATABASE_COIN_PROP,
            waitForConnections: true,
            connectionLimit: process.env.DB_PROP_CONN_LIMIT,
            timezone: '+09:00',
            debug: true,
            trace: true
        })
};
