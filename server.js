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

app.get("/getAllCategories", async (req, res) => {
    try {
        const categories = await dbInstance.queryWithParams("SELECT * FROM Categories", []);
        res.json(categories);
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ error: "Error fetching categories" });
    }
});


// =============================
// GET Routes: Fetching Data
// =============================

/**
 * Get all categories from the database.
*/
app.get("/categories/getAll", async (req, res) => {
    try {
      const categories = await dbInstance.queryWithParams("SELECT * FROM Categories", []);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Error fetching categories" });
    }
});
  
/**
* Get all brands from the database.
*/
app.get("/brands/getAll", async (req, res) => {
    try {
      const brands = await dbInstance.queryWithParams("SELECT * FROM Brands", []);
      res.json(brands);
    } catch (error) {
      console.error("Error fetching brands:", error);
      res.status(500).json({ error: "Error fetching brands" });
    }
});
  
/**
* Get all shelves from the database.
*/
app.get("/shelves/getAll", async (req, res) => {
    try {
      const shelves = await dbInstance.queryWithParams("SELECT * FROM Shelfs", []);
      res.json(shelves);
    } catch (error) {
      console.error("Error fetching shelves:", error);
      res.status(500).json({ error: "Error fetching shelves" });
    }
});
  
/**
* Get all units from the database.
*/
app.get("/units/getAll", async (req, res) => {
    try {
      const units = await dbInstance.queryWithParams("SELECT * FROM Units", []);
      res.json(units);
    } catch (error) {
      console.error("Error fetching units:", error);
      res.status(500).json({ error: "Error fetching units" });
    }
});
  
/**
* Get all dimensions from the database.
*/
app.get("/dimensions/getAll", async (req, res) => {
    try {
      const dimensions = await dbInstance.queryWithParams("SELECT * FROM Dimensions", []);
      res.json(dimensions);
    } catch (error) {
      console.error("Error fetching dimensions:", error);
      res.status(500).json({ error: "Error fetching dimensions" });
    }
});
  
// =============================
// POST Route: Submit Product Form
// =============================
  
/**
* Handle product form submission and insert the new product into the database.
*/
app.post("/submit-Product-form", async (req, res) => {
    let Code;
    const {  
      Name, 
      Description, 
      Category_Id, 
      Shelf_Id, 
      Price, 
      Dimension_Id, 
      Dimension_Value, 
      Unit_Id, 
      Unit_Value, 
      stock_Quantity, 
      ImagePath 
    } = req.body;
  
    try {
      // Retrieve the last product code from the database
      const result = await dbInstance.queryWithParams("SELECT MAX(Code) AS lastCode FROM Products", []);
      
      // Assign a new product code (incrementing the last one)
      const lastCode = (result && result.length > 0 && result[0].lastCode) ? result[0].lastCode : 0;
      Code = lastCode + 1;
  
      // Insert the new product into the database
      await dbInstance.queryWithParams(
        `INSERT INTO products (
            Code, 
            Name, 
            Description, 
            Category_Id, 
            Shelf_Id, 
            Price, 
            Dimension_Id, 
            Dimension_Value, 
            Unit_Id, 
            Unit_Value, 
            stock_Quantity, 
            ImagePath
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
        [
            Code, 
            Name, 
            Description, 
            Category_Id, 
            Shelf_Id, 
            Price, 
            Dimension_Id, 
            Dimension_Value, 
            Unit_Id, 
            Unit_Value, 
            stock_Quantity || 0, // Default to 0 if null
            ImagePath || "default.jpg" // Default image if none is provided
        ]
      );
  
      res.json({ success: true, message: "Form submitted successfully.", Code });
    } catch (error) {
      console.error("Error processing form:", error);
      res.status(500).json({ success: false, error: "Error processing the form." });
    }
});

app.get("/users/getId", async (req, res) => {
    const username = req.query.username; // Get the username from the query parameters
    try {
        const dimensions = await dbInstance.queryWithParams("SELECT Usuario_Id FROM usuarios WHERE Nombre LIKE ?", [username]); // Use LIKE and pass the username
        if (dimensions.length === 0) {
            return res.status(404).json({ error: "User  not found" }); // Handle case where user is not found
        }
        res.json(dimensions[0]); // Return the first result
    } catch (error) {
        console.error("Error fetching user ID:", error);
        res.status(500).json({ error: "Error fetching User ID" });
    }
});

app.get("/users/getpassword", async (req, res) => { // Added leading slash
    const username = req.query.username; // Get the username from the query parameters
    try {
        const dimensions = await dbInstance.queryWithParams("SELECT password FROM usuarios WHERE Nombre = ?", [username]); // Use the username to fetch the password
        if (dimensions.length === 0) {
            return res.status(404).json({ error: "User  not found" }); // Handle case where user is not found
        }
        res.json(dimensions[0]); // Return the first result
    } catch (error) {
        console.error("Error fetching user password:", error);
        res.status(500).json({ error: "Error fetching User Password" });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Close the pool when the process exits
process.on('SIGINT', async () => {
    // Logging server shutdown process
    console.log("\nServer is stopping...");
    // Logging database pool closure process
    console.log("\nClosing database pool...");
    process.exit(0);
});