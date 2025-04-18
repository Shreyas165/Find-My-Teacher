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
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));
app.use(express.static(path.join(__dirname, 'public')));
// added this line and moved all your static files [ CSS, HTML, JS ] to 'www' folder
app.use(express.static(__dirname + '/www'));

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const dir = path.join(__dirname, "public", "images");
        try {
            await fs.mkdir(dir, { recursive: true });
            cb(null, dir);
        } catch (err) {
            console.error("Error creating images directory:", err);
            cb(err, null);
        }
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

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

const resizeImage = async (req, res, next) => {
    if (!req.file) {
        return next();
    }

    const filePath = req.file.path;
    const resizedFilePath = filePath.replace(/(\.[\w]+)$/, "-passport$1");

    try {
        await sharp(filePath)
            .resize(132, 170, { fit: 'fill' })
            .toFile(resizedFilePath);

        req.file.path = resizedFilePath;
        req.file.filename = path.basename(resizedFilePath);

        await fs.unlink(filePath);
        next();
    } catch (err) {
        console.error("Error resizing image:", err);
        res.status(500).json({ error: "Failed to process the uploaded image." });
    }
};

app.get("/", (req, res) => {
    res.status(200).send("Welcome to the Teacher Directory API!");
});

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
            ? `${req.protocol}://${req.get('host')}${teacher.image}`
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

app.post("/api/add-teacher", upload.single("image"), resizeImage, async (req, res) => {
    try {
        const { name, floor, branch, directions } = req.body;
        const image = req.file ? `/images/${req.file.filename}` : null;

        if (!name || !floor || !branch || !directions || !image) {
            return res.status(400).json({ error: "All fields are required." });
        }

        const teacher = await prisma.teacher.create({
            data: {
                name,
                floor,
                branch,
                directions,
                image
            }
        });

        res.status(201).json({ message: "Teacher added successfully!" });
    } catch (error) {
        console.error("Error adding teacher:", error);
        res.status(500).json({ error: "Failed to add teacher." });
    }
});

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
