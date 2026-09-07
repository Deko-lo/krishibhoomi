require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const multer = require("multer");

const app = express();


app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// PostgreSQL connection
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT)
});
// File upload configuration
const upload = multer({
    storage: multer.diskStorage({
        destination: "uploads/",
        filename: (req, file, cb) => {
            const extension = file.originalname.substring(
                file.originalname.lastIndexOf(".")
            );

            const uniqueName =
                Date.now() + "-" + Math.round(Math.random() * 1E9);

            cb(null, uniqueName + extension);
        }
    })
});

// Test database connection
app.get("/api/db-test", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");
        
        res.json({
            success: true,
            message: "KrishiBhoomi database connected successfully!",
            time: result.rows[0].now
        });
    } catch (error) {
        console.error(error);
        
        res.status(500).json({
            success: false,
            message: "Database connection failed"
        });
    }
});

// Get farmers from database
app.get("/api/farmers", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM farmers ORDER BY id"
        );

        res.json(result.rows);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Could not get farmers"
        });
    }
});
// Add a new farmer
app.post("/api/farmers", async (req, res) => {
    try {
        const { name, village, district, land_area, phone } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Farmer name is required"
            });
        }

        const result = await pool.query(
            `INSERT INTO farmers
            (name, village, district, land_area, phone)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [name, village, district, land_area, phone]
        );

        res.status(201).json({
            success: true,
            message: "Farmer added successfully",
            farmer: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Could not add farmer"
        });
    }
});


// Create a new survey request
app.post("/api/surveys", upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "document", maxCount: 1 }
]), async (req, res) => {
    try {
        const {
            survey_number,
            village,
            district,
            recorded_area,
            land_type,
            reason,
            latitude,
            longitude,
            boundary_notes,
            additional_notes
        } = req.body;
                
       console.log("Uploaded files:", req.files);

    
        if (!survey_number || !village || !district || !recorded_area || !reason) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required survey details"
            });
        }

        const result = await pool.query(
    `INSERT INTO survey_requests
    (
        survey_number,
        village,
        district,
        recorded_area,
        land_type,
        reason,
        latitude,
        longitude,
        boundary_notes,
        additional_notes,
        photo_path,
        document_path
    )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *`,
          
   [
    survey_number,
    village,
    district,
    recorded_area,
    land_type,
    reason,
    latitude,
    longitude,
    boundary_notes,
    additional_notes,
    req.files?.photo?.[0]?.path || null,
    req.files?.document?.[0]?.path || null
]
        );

        res.status(201).json({
            success: true,
            message: "Survey request created successfully",
            survey: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Could not create survey request"
        });
    }
});




// Get all survey requests
app.get("/api/surveys", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM survey_requests ORDER BY id"
        );

        res.json({
            success: true,
            surveys: result.rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Could not get survey requests"
        });
    }
});

// Serve KrishiBhoomi website
app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`KrishiBhoomi Backend running on http://localhost:${PORT}`);
});