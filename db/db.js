const mariadb = require('mariadb');

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tiendaonline',
    connectionLimit: 5,
    acquireTimeout: 300
};

class DBConnector {
    constructor() {
        this.dbconnector = mariadb.createPool(config);
    }

    async query(param) {
        let conn;
        try {
            conn = await this.dbconnector.getConnection();
            return await conn.query(param);
        } catch (err) {
            console.error("Query error:", err);
            throw err;
        } finally {
            if (conn) conn.release();
        }
    }

    async queryWithParams(query, params) {
        let conn;
        try {
            conn = await this.dbconnector.getConnection();
            return await conn.query(query, params);
        } catch (err) {
            console.error("QueryWithParams error:", err);
            throw err;
        } finally {
            if (conn) conn.release();
        }
    }

    async close() {
        if (this.dbconnector) {
            await this.dbconnector.end();
        }
    }
}

module.exports = new DBConnector();
