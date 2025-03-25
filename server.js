const mariadb = require('mariadb');
require('dotenv').config(); // Load environment variables from .env file

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Ricardoydiego1', // Use an empty string or remove for security
    database: process.env.DB_NAME || 'tiendaonline',
    connectionLimit: 5,
    acquireTimeout: 300
};

const express = require('express');
const cors = require('cors'); // If you're using CORS
const formularioContactoRoutes = require("./routes/formularioContacto.js");

class DBConnector {
    constructor() {
        this.dbconnector = mariadb.createPool(config);
    }

    async query(param) {
        let conn;
        try {
            conn = await this.dbconnector.getConnection();
            const ret = await conn.query(param);
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

    async closePool() {
        await this.dbconnector.end();
        console.log("Database pool closed.");
    }
}

// Initialize DBConnector instance
const dbInstance = new DBConnector();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files (HTML, CSS, JS)
app.use(express.static("public"));

// Routes
app.use("/api/formularioContacto", formularioContactoRoutes);

app.get("/products", async (req, res) => {
    try {
        const products = await dbInstance.queryWithParams("SELECT * FROM Products", []);
        res.json(products);
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ error: "Error fetching products" });
    }
});

// Route to handle form submission
app.post("/submit-form", async (req, res) => {
    const { nombre, correo, mensaje } = req.body;

    try {
        // Insert the data into the database
        await dbInstance.queryWithParams("INSERT INTO formularios (nombre, correo, mensaje) VALUES (?, ?, ?)", [nombre, correo, mensaje]);
        res.json({ message: "Formulario enviado con éxito." });
    } catch (error) {
        console.error("Error submitting form:", error);
        res.status(500).json({ error: "Error al enviar el formulario." });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Close the pool when the process exits
process.on('SIGINT', async () => {
    console.log("\nClosing database pool...");
    await dbInstance.closePool();
    process.exit(0);
});