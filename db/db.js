const mariadb = require('mariadb');
require('dotenv').config(); // Load environment variables from .env file

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Ricardoydiego1', // You can keep the default for local testing
    database: process.env.DB_NAME || 'tiendaonline',
    connectionLimit: 5,
    acquireTimeout: 300
};

class DBConnector {
    constructor() {
        this.dbconnector = mariadb.createPool(config);
    }

    // Simple query (no parameters)
    async query(param) {
        let conn;
        try {
            conn = await this.dbconnector.getConnection();
            const ret = await conn.query(param);
            console.log(ret);
            return ret;
        } catch (err) {
            console.error("Query error:", err);
            throw err;
        } finally {
            if (conn) {
                conn.release(); // Release connection to the pool
                console.log("Connection released!");
            }
        }
    }

    // Query with parameters
    async queryWithParams(sQuery, params) {
        let conn;
        try {
            conn = await this.dbconnector.getConnection();
            const ret = await conn.query(sQuery, params);
            return ret;
        } catch (err) {
            console.error("QueryWithParams error:", err);
            throw err;
        } finally {
            if (conn) {
                conn.release();
                console.log("Connection released!");
            }
        }
    }

    // Close pool on app exit
    async closePool() {
        try {
            await this.dbconnector.end();
            console.log("Database pool closed.");
        } catch (err) {
            console.error("Error closing pool:", err);
        }
    }
}

// Export the DBConnector instance
const dbInstance = new DBConnector();
module.exports = dbInstance;

// Close the pool when the process exits
process.on('SIGINT', async () => {
    console.log("\nClosing database pool...");
    await dbInstance.closePool();
    process.exit(0);
});