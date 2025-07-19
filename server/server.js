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

// Create images directory
const IMAGES_DIR = path.join(__dirname, 'persistent_images');
fs.mkdir(IMAGES_DIR, { recursive: true }).catch(console.error);

app.use(cors({
    origin: ['https://find-my-teacher.vercel.app', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
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
            .resize(200, 267, {
                fit: 'contain',
                position: 'center',
                background: { r: 255, g: 255, b: 255, alpha: 1 },
                withoutEnlargement: true,
                quality: 90
            })
            .jpeg({ quality: 90, progressive: true })
            .png({ quality: 90, progressive: true })
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

app.get("/api/search", async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ error: "Search query is required" });
        }

        const teachers = await prisma.teacher.findMany({
            where: {
                name: {
                    contains: query,
                    mode: 'insensitive'
                }
            },
            select: {
                name: true,
                floor: true,
                branch: true,
                directions: true,
                Image: true
            },
            take: 10 // Limit results for faster response
        });

        res.status(200).json({ teachers });
    } catch (error) {
        console.error("Error searching teachers:", error);
        res.status(500).json({ error: "Failed to search teachers" });
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

        console.log("Found teacher with image:", teacher);

        // Use the request's protocol and host for the image URL
        const protocol = req.protocol;
        const host = req.get('host');
        const imageUrl = teacher.Image
            ? `${protocol}://${host}/api/images/${teacher.Image.id}`
            : null;

        console.log("Constructed image URL:", imageUrl);

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

        const protocol = req.protocol;
        const host = req.get('host');

        console.log("Teacher created successfully:", teacher);
        res.status(201).json({
            message: "Teacher added successfully!",
            teacher: {
                name: teacher.name,
                floor: teacher.floor,
                branch: teacher.branch,
                directions: teacher.directions,
                imageUrl: `${protocol}://${host}/api/images/${image.id}`
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

// Password management endpoints
app.post("/api/set-password", async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log(`[set-password] Request for username: ${username}`);
        if (!username || !password) {
            console.log('[set-password] Missing username or password');
            return res.status(400).json({ error: "Username and password are required." });
        }
        // Check if password already exists for this username
        const existingPassword = await prisma.password.findUnique({
            where: { username }
        });
        if (existingPassword) {
            console.log(`[set-password] Updating password for username: ${username}`);
            await prisma.password.update({
                where: { username },
                data: { password }
            });
            res.status(200).json({ message: "Password updated successfully." });
        } else {
            console.log(`[set-password] Creating new password for username: ${username}`);
            await prisma.password.create({
                data: { username, password }
            });
            res.status(201).json({ message: "Password set successfully." });
        }
    } catch (error) {
        console.error("[set-password] Error:", error);
        res.status(500).json({ error: "Failed to set password." });
    }
});

app.post("/api/verify-password", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required." });
        }

        // Find password in database
        const passwordRecord = await prisma.password.findUnique({
            where: { username }
        });

        if (!passwordRecord) {
            return res.status(401).json({ error: "Invalid credentials." });
        }

        // Compare passwords
        if (passwordRecord.password === password) {
            res.status(200).json({ message: "Password verified successfully." });
        } else {
            res.status(401).json({ error: "Invalid credentials." });
        }
    } catch (error) {
        console.error("Error verifying password:", error);
        res.status(500).json({ error: "Failed to verify password." });
    }
});

app.put("/api/change-password", async (req, res) => {
    try {
        const { username, oldPassword, newPassword } = req.body;

        if (!username || !oldPassword || !newPassword) {
            return res.status(400).json({ error: "Username, old password, and new password are required." });
        }

        // Find password in database
        const passwordRecord = await prisma.password.findUnique({
            where: { username }
        });

        if (!passwordRecord) {
            return res.status(401).json({ error: "Invalid credentials." });
        }

        // Verify old password
        if (passwordRecord.password !== oldPassword) {
            return res.status(401).json({ error: "Invalid old password." });
        }

        // Update password
        await prisma.password.update({
            where: { username },
            data: { password: newPassword }
        });

        res.status(200).json({ message: "Password changed successfully." });
    } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).json({ error: "Failed to change password." });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
