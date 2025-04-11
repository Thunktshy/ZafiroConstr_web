// =============================
// Imports & Environment Setup
// =============================
require('dotenv').config(); // Load .env variables

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const mariadb = require('mariadb');
const path = require('path');
const bcrypt = require('bcrypt');
const dbInstance = require('../ZafiroConstr_web/db/db.js');
const app = express();

// =============================
// Database Configuration
// =============================
const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Ricardoydiego1', // Use a secure password or store it in .env
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
}

// =============================
// Middleware
// =============================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from "Public" folder (Note the case!)
app.use(express.static("Public"));

app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key', // Change this in production and use .env
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 60 * 60 * 1000 // 1 hour
    }
}));

// Middleware to require login
function requireLogin(req, res, next) {
    if (req.session && req.session.userID) {
        return next();
    }
    // If the request accepts HTML, redirect to the login page.
    if (req.headers.accept && req.headers.accept.indexOf('text/html') !== -1) {
        return res.redirect('/index.html');
    }
    // Otherwise, respond with a JSON error.
    return res.status(401).json({ error: "Unauthorized" });
}


// =============================
// Routes
// =============================

// --- Product Routes ---
app.get("/products", async (req, res) => {
    try {
        const products = await dbInstance.queryWithParams("SELECT * FROM Products", []);
        res.json(products);
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ error: "Error fetching products" });
    }
});

app.post("/submit-Product-form", async (req, res) => {
    let Code;
    const {
        Name, Description, Category_Id, Shelf_Id, Price, Dimension_Id,
        Dimension_Value, Unit_Id, Unit_Value, stock_Quantity, ImagePath
    } = req.body;

    try {
        const result = await dbInstance.queryWithParams("SELECT MAX(Code) AS lastCode FROM Products", []);
        const lastCode = result[0]?.lastCode || 0;
        Code = lastCode + 1;

        await dbInstance.queryWithParams(
            `INSERT INTO products (
                Code, Name, Description, Category_Id, Shelf_Id, Price,
                Dimension_Id, Dimension_Value, Unit_Id, Unit_Value, stock_Quantity, ImagePath
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                Code, Name, Description, Category_Id, Shelf_Id, Price,
                Dimension_Id, Dimension_Value, Unit_Id, Unit_Value,
                stock_Quantity || 0, ImagePath || "default.jpg"
            ]
        );

        res.json({ success: true, message: "Form submitted successfully.", Code });
    } catch (error) {
        console.error("Error processing form:", error);
        res.status(500).json({ success: false, error: "Error processing the form." });
    }
});

// In your server route (example)
app.post("/update-product-form", async (req, res) => {
    const {
      productId, Name, Description, Category_Id, Shelf_Id, Price, 
      Dimension_Id, Dimension_Value, Unit_Id, Unit_Value, stock_Quantity, ImagePath
    } = req.body;
    try {
        // Example UPDATE query using a parameterized query:
        await dbInstance.queryWithParams(
            `UPDATE Products 
             SET Name = ?, Description = ?, Category_Id = ?, Shelf_Id = ?, Price = ?,
                 Dimension_Id = ?, Dimension_Value = ?, Unit_Id = ?, Unit_Value = ?, stock_Quantity = ?, ImagePath = ?
             WHERE Id = ?`,
            [
              Name, Description, Category_Id, Shelf_Id, Price,
              Dimension_Id, Dimension_Value, Unit_Id, Unit_Value,
              stock_Quantity || 0, ImagePath || "default.jpg", productId
            ]
        );
        res.json({ success: true, message: "Producto actualizado correctamente." });
    } catch (error) {
        console.error("Error al actualizar el producto:", error);
        res.status(500).json({ success: false, error: "Error al actualizar el producto." });
    }
});

app.get("/productwithId", async (req, res) => {
    try {
      const { id } = req.query; //  get 'id' from query params
      const product = await dbInstance.queryWithParams("SELECT * FROM Products WHERE Id = ?", [id]);
      
      if (product.length > 0) {
        res.json(product[0]);
      } else {
        res.status(404).json({ message: "Product not found" });
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Error fetching product" });
    }
  });
  
  
// --- Category Routes ---
app.get("/getAllCategories", async (req, res) => {
    try {
        const categories = await dbInstance.queryWithParams("SELECT * FROM Categories", []);
        res.json(categories);
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ error: "Error fetching categories" });
    }
});

app.post("/submit-Category-form", async (req, res) => {
    const { Name, Description } = req.body;
    try {
        await dbInstance.queryWithParams(
            "INSERT INTO categories (Name, Description) VALUES (?, ?)",
            [Name, Description]
        );
        res.json({ message: "Formulario enviado con éxito." });
    } catch (error) {
        res.status(500).json({ error: "Error al enviar el formulario." });
    }
});

app.get("/categories/getAll", async (req, res) => {
    try {
        const categories = await dbInstance.queryWithParams("SELECT * FROM Categories", []);
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: "Error fetching categories" });
    }
});

// --- Brand Routes ---
app.post("/submit-Brand-form", async (req, res) => {
    const { Name } = req.body;
    try {
        await dbInstance.queryWithParams("INSERT INTO brands (Name) VALUES (?)", [Name]);
        res.json({ message: "Formulario enviado con éxito." });
    } catch (error) {
        res.status(500).json({ error: "Error al enviar el formulario." });
    }
});

app.get("/brands/getAll", async (req, res) => {
    try {
        const brands = await dbInstance.queryWithParams("SELECT * FROM Brands", []);
        res.json(brands);
    } catch (error) {
        res.status(500).json({ error: "Error fetching brands" });
    }
});

// --- Other GET Routes ---
app.get("/shelves/getAll", async (req, res) => {
    try {
        const shelves = await dbInstance.queryWithParams("SELECT * FROM Shelfs", []);
        res.json(shelves);
    } catch (error) {
        res.status(500).json({ error: "Error fetching shelves" });
    }
});

app.get("/units/getAll", async (req, res) => {
    try {
        const units = await dbInstance.queryWithParams("SELECT * FROM Units", []);
        res.json(units);
    } catch (error) {
        res.status(500).json({ error: "Error fetching units" });
    }
});

app.get("/dimensions/getAll", async (req, res) => {
    try {
        const dimensions = await dbInstance.queryWithParams("SELECT * FROM Dimensions", []);
        res.json(dimensions);
    } catch (error) {
        res.status(500).json({ error: "Error fetching dimensions" });
    }
});

// --- Form Submissions ---
app.post("/submit-form", async (req, res) => {
    const { nombre, correo, mensaje } = req.body;
    try {
        await dbInstance.queryWithParams(
            "INSERT INTO formularios (nombre, correo, mensaje) VALUES (?, ?, ?)",
            [nombre, correo, mensaje]
        );
        res.json({ message: "Formulario enviado con éxito." });
    } catch (error) {
        res.status(500).json({ error: "Error al enviar el formulario." });
    }
});

app.get("/users/getId", async (req, res) => {
    const { username } = req.query;
    try {
        const user = await dbInstance.queryWithParams(
            "SELECT Usuario_Id FROM usuarios WHERE Nombre LIKE ?",
            [username]
        );
        if (user.length === 0) return res.status(404).json({ error: "User not found" });
        res.json(user[0]);
    } catch (error) {
        console.error("Error fetching user ID:", error);
        res.status(500).json({ error: "Error fetching User ID" });
    }
});

app.get("/users/getpassword", async (req, res) => {
    const { username } = req.query;
    try {
        const user = await dbInstance.queryWithParams(
            "SELECT password FROM usuarios WHERE Nombre = ?",
            [username]
        );
        if (user.length === 0) return res.status(404).json({ error: "User not found" });
        res.json(user[0]);
    } catch (error) {
        console.error("Error fetching user password:", error);
        res.status(500).json({ error: "Error fetching User Password" });
    }
});

app.get("/users/getUsernames", async (req, res) => {
    try {
        const users = await dbInstance.queryWithParams("SELECT Email, Nombre FROM USUARIOS", []);
        res.json(users);
    } catch (error) {
        console.error("Error fetching usernames:", error);
        res.status(500).json({ error: "Error fetching usernames" });
    }
});

app.post("/users/register", async (req, res) => {
    const { email, username, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10); // SALT = 10

        await dbInstance.queryWithParams(
            "INSERT INTO USUARIOS (Email, Nombre, password) VALUES (?, ?, ?)",
            [email, username, hashedPassword]
        );

        res.json({ success: true, message: "Usuario registrado exitosamente." });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ error: "Error al registrar el usuario." });
    }
});

// --- Login/Logout Routes ---
app.post('/login', async (req, res) => {
    const { user, password } = req.body;

    try {
        const userData = await dbInstance.queryWithParams(
            "SELECT Usuario_Id, password FROM Usuarios WHERE Nombre = ?",
            [user]
        );

        if (userData.length === 0) {
            return res.status(401).json({ success: false, message: "Usuario no encontrado." });
        }

        const userRecord = userData[0];
        const passwordMatch = await bcrypt.compare(password, userRecord.password);

        if (passwordMatch) {
            req.session.userID = userRecord.Usuario_Id;
            return res.json({ success: true, message: "Inicio de sesión exitoso." });
        } else {
            return res.status(401).json({ success: false, message: "Contraseña incorrecta." });
        }
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ success: false, message: "Error en el servidor." });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ success: false, message: "No se pudo cerrar sesión." });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true, message: "Sesión cerrada." });
        console.log("Sesion Cerrada: "+req.session)
    });
});

app.get('/session', (req, res) => {
    if (req.session.userID) {
        res.json({ loggedIn: true, userID: req.session.userID });
    } else {
        res.json({ loggedIn: false });
    }
});

// --- Admin Route ---
app.get('/admin', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'Protected', 'admin.html'));
});

// --- Auth Routes ---
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// 1) Protect the entire `Protected` folder
app.use(
    '/admin-resources',
    requireLogin,
    express.static(path.join(__dirname, 'Protected'))
  );
  
  // 2) Admin route
  app.get('/admin', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'Protected', 'admin.html'));
  });

// =============================
// Graceful Shutdown
// =============================
process.on('SIGINT', async () => {
    console.log("\nServer is stopping...");
    console.log("Clearing sessions and closing database pool...");

    if (dbInstance?.dbconnector) {
        await dbInstance.dbconnector.end();
        console.log("Database pool closed.");
    }

    process.exit(0);
});
