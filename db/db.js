const mariadb = require("mariadb");
require("dotenv").config(); // Para usar variables de entorno

const pool = mariadb.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Ricardoydiego1",
  database: process.env.DB_NAME || "zafiro",
  connectionLimit: 5
});

module.exports = pool;
