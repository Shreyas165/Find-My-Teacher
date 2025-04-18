require('dotenv').config();
const express = require("express");
const cors = require("cors");
const fs = require("fs").promises;
const path = require("path");
const multer = require("multer");
const sharp = require("sharp");
const { PrismaClient } = require('@prisma/client');

const app = express();
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

app.use(cors({
    origin: ['https://find-my-teacher.vercel.app'], // replace this with your deployed Vercel frontend URL
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup multer for memory storage to directly capture the file buffer
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Invalid file type. Only images are allowed."), false);
        }
    }
});

app.get("/", (req, res) => {
    res.status(200).send("Welcome to the Teacher Directory API!");
});

// Endpoint to get all teacher names
app.get("/api/people", async (req, res) => {
    try {
        const teachers = await prisma.teacher.findMany({
            select: {
                name: true
            }
        });
        res.status(200).json({ teachers });
    } catch (error) {
        console.error("Error fetching teachers:", error);
        res.status(500).json({ error: "Failed to fetch teacher data." });
    }
});

// Endpoint to get teacher details along with the image
app.get("/api/directions/:name", async (req, res) => {
    try {
        const teacherName = req.params.name;
        const teacher = await prisma.teacher.findFirst({
            where: {
                name: teacherName
            }
        });

        if (!teacher) {
            return res.status(404).json({ error: "Teacher not found." });
        }

        const imageUrl = teacher.image
            ? `${req.protocol}://${req.get('host')}/api/teacher-image/${teacherName}`
            : null;

        res.status(200).json({
            name: teacher.name,
            floor: teacher.floor,
            branch: teacher.branch,
            directions: teacher.directions,
            imageUrl: imageUrl,
        });
    } catch (error) {
        console.error("Error fetching teacher details:", error);
        res.status(500).json({ error: "Failed to fetch teacher details." });
    }
});

// Endpoint to serve image from database as binary data
app.get("/api/teacher-image/:name", async (req, res) => {
    try {
        const teacher = await prisma.teacher.findFirst({
            where: { name: req.params.name },
            select: { image: true }  // Retrieve the image as Bytes
        });

        if (!teacher || !teacher.image) {
            return res.status(404).json({ error: "Image not found." });
        }

        res.set("Content-Type", "image/png");  // Adjust the MIME type if needed
        res.send(teacher.image);  // Send the binary image data
    } catch (error) {
        console.error("Error fetching image:", error);
        res.status(500).json({ error: "Failed to fetch image." });
    }
});

// Endpoint to add a new teacher with image stored as Bytes in the database
app.post("/api/add-teacher", upload.single("image"), async (req, res) => {
    try {
        const { name, floor, branch, directions } = req.body;
        const imageBuffer = req.file ? req.file.buffer : null;  // Get the image buffer directly from multer

        if (!name || !floor || !branch || !directions || !imageBuffer) {
            return res.status(400).json({ error: "All fields are required." });
        }

        const teacher = await prisma.teacher.create({
            data: {
                name,
                floor,
                branch,
                directions,
                image: imageBuffer  // Store the image as Bytes (binary data)
            }
        });

        res.status(201).json({ message: "Teacher added successfully!" });
    } catch (error) {
        console.error("Error adding teacher:", error);
        res.status(500).json({ error: "Failed to add teacher." });
    }
});

// Endpoint to update teacher details
app.put("/api/update-teacher/:name", async (req, res) => {
    try {
        const teacherName = req.params.name;
        const { name, floor, branch, directions } = req.body;

        const teacher = await prisma.teacher.update({
            where: {
                name: teacherName
            },
            data: {
                name,
                floor,
                branch,
                directions
            }
        });

        res.status(200).json({ message: "Teacher updated successfully." });
    } catch (error) {
        console.error("Error updating teacher:", error);
        res.status(500).json({ error: "Failed to update teacher." });
    }
});

// Endpoint to delete teacher details
app.delete("/api/delete-teacher/:name", async (req, res) => {
    try {
        const teacherName = req.params.name;

        await prisma.teacher.delete({
            where: {
                name: teacherName
            }
        });

        res.status(200).json({ message: "Teacher deleted successfully." });
    } catch (error) {
        console.error("Error deleting teacher:", error);
        res.status(500).json({ error: "Failed to delete teacher." });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
