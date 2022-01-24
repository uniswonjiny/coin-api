/**
 * 로그 설정부분
 * @author 송원진
 * @date  2021-12-00
 */

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, errors, printf } = format;
const fs = require('fs');
const path = require('path');
require('winston-daily-rotate-file');

const myFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} ${level}: ${message} `;
});

// 로그 출력위치 및 생성
const LOGS_DIR = path.join(__dirname, '../logs');
fs.existsSync(LOGS_DIR) || fs.mkdirSync(LOGS_DIR);
const LOGGER_COMMON_CONFIG = {
    datePattern:'yyyy-MM-dd',
    prepend: true,
    maxSize: 1024 * 1024 * 100,//100 메가
    maxFiles: '365d',
    colorize: false,
    zippedArchive: true
};

const logger = new createLogger({
    format: combine(
        errors({ stack: true }),
        timestamp(),
        myFormat
    ),
    transports: [
        new (transports.DailyRotateFile) ({
            name: 'error',
            level: 'error',
            filename: LOGS_DIR + '/error-%DATE%.log',
            LOGGER_COMMON_CONFIG,
        }),
        new (transports.DailyRotateFile) ({
            name: 'info',
            level: 'info',
            filename: LOGS_DIR + '/info-%DATE%.log',
            LOGGER_COMMON_CONFIG
        }),
        new transports.Console({
            name: 'debug',
            level: 'debug',
            colorize: true,
            json: false,
            handleExceptions: true,
        }),
    ],
    exitOnError: false,
});

module.exports = logger;