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

// Create persistent images directory
const IMAGES_DIR = path.join(__dirname, 'persistent_images');
fs.mkdir(IMAGES_DIR, { recursive: true }).catch(console.error);

app.use(cors({
    origin: ['https://find-my-teacher.vercel.app', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/images', express.static(IMAGES_DIR));
app.use(express.static(path.join(__dirname, 'public')));
// added this line and moved all your static files [ CSS, HTML, JS ] to 'www' folder
app.use(express.static(__dirname + '/www'));

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            await fs.mkdir(IMAGES_DIR, { recursive: true });
            cb(null, IMAGES_DIR);
        } catch (err) {
            console.error("Error creating images directory:", err);
            cb(err, null);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
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

        // Clean up original file
        try {
            await fs.unlink(filePath);
        } catch (unlinkError) {
            console.warn("Warning: Could not delete original image file:", unlinkError);
        }
        next();
    } catch (err) {
        console.error("Error resizing image:", err);
        // Clean up files in case of error
        try {
            await fs.unlink(filePath);
            await fs.unlink(resizedFilePath).catch(() => { });
        } catch (cleanupError) {
            console.error("Error cleaning up files:", cleanupError);
        }
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
            },
            include: {
                Image: true
            }
        });

        if (!teacher) {
            return res.status(404).json({ error: "Teacher not found." });
        }

        console.log("Found teacher with image:", teacher); // Debug log

        // Construct image URL with localhost
        const imageUrl = teacher.Image
            ? `http://localhost:${PORT}/api/images/${teacher.Image.id}`
            : null;

        console.log("Constructed image URL:", imageUrl); // Debug log

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

app.get("/api/images/:id", async (req, res) => {
    try {
        const imageId = parseInt(req.params.id);
        console.log("Fetching image with ID:", imageId);

        const image = await prisma.image.findUnique({
            where: {
                id: imageId
            }
        });

        if (!image) {
            console.log("Image not found for ID:", imageId);
            return res.status(404).json({ error: "Image not found" });
        }

        console.log("Found image with mimeType:", image.mimeType);

        // Convert Prisma's Bytes to Buffer if needed
        const imageBuffer = Buffer.from(image.data);

        // Set proper headers
        res.set({
            'Content-Type': image.mimeType,
            'Content-Length': imageBuffer.length,
            'Cache-Control': 'public, max-age=31557600',
            'Pragma': 'public'
        });

        // Send the buffer directly
        res.send(imageBuffer);
    } catch (error) {
        console.error("Error serving image:", error);
        res.status(500).json({ error: "Failed to serve image" });
    }
});

app.post("/api/add-teacher", upload.single("image"), resizeImage, async (req, res) => {
    try {
        console.log("Received request body:", req.body);
        console.log("Received file:", req.file);

        const { name, floor, branch, directions } = req.body;

        if (!name || !floor || !branch || !directions || !req.file) {
            console.log("Validation failed:", { name, floor, branch, directions });
            if (req.file) {
                try {
                    await fs.unlink(req.file.path);
                } catch (cleanupError) {
                    console.error("Error cleaning up file after validation failure:", cleanupError);
                }
            }
            return res.status(400).json({
                error: "All fields are required.",
                details: { name, floor, branch, directions }
            });
        }

        // Read the image file as a buffer
        const imageBuffer = await fs.readFile(req.file.path);

        // Create the image record with proper binary data
        const image = await prisma.image.create({
            data: {
                data: imageBuffer,
                mimeType: req.file.mimetype
            }
        });

        console.log("Image created with ID:", image.id);

        // Create the teacher with the image relationship
        const teacher = await prisma.teacher.create({
            data: {
                name,
                floor,
                branch,
                directions,
                imageId: image.id
            },
            include: {
                Image: true
            }
        });

        // Clean up the temporary file
        try {
            await fs.unlink(req.file.path);
        } catch (cleanupError) {
            console.error("Error cleaning up file:", cleanupError);
        }

        console.log("Teacher created successfully:", teacher);
        res.status(201).json({
            message: "Teacher added successfully!",
            teacher: {
                name: teacher.name,
                floor: teacher.floor,
                branch: teacher.branch,
                directions: teacher.directions,
                imageUrl: `http://localhost:${PORT}/api/images/${image.id}`
            }
        });
    } catch (error) {
        console.error("Detailed error adding teacher:", error);
        // Clean up uploaded file if database operation fails
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (cleanupError) {
                console.error("Error cleaning up file after database error:", cleanupError);
            }
        }
        res.status(500).json({
            error: "Failed to add teacher.",
            details: error.message
        });
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
