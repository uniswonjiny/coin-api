const logger = require('../config/logger');

    /**
     * 커넥션 풀정보와 쿼리문을 리턴한다.
     * @param {string} mapperName 맵퍼이름
     * @param {string} queryName 쿼리이름
     * @param {Object} param 파라미터정보
     * @return {String} 완성된 쿼리문
     */
    const dbQuery = (mapperName , queryName, param) => {
        const time = new Date().getUTCMilliseconds();
        const format = { language: 'sql', indent: '  ' };
        const mybatisMapper = require("mybatis-mapper");
        mybatisMapper.createMapper([ `./query/${mapperName}.xml`]);
        const sql = mybatisMapper.getStatement( mapperName, queryName, param, format);
        logger.info(`[${time}] - 맵퍼이름: ${mapperName} , 쿼리이름: ${queryName}`)
        logger.info(sql);
        return sql;
    }

module.exports = { dbQuery };
