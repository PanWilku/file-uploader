const db = require('../db/queries');
const { Router } = require('express');
const passport = require('../config/auth');
const { requireAuth } = require('../middleware/requireAuth');
const multer = require('multer')
const fs = require('fs');
const path = require('path');


// Ensure uploads dir exists
const UPLOADS_DIR = path.join(__dirname, '../uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Configure multer to write unique filenames (no manual rename needed)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext);
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${base}-${unique}${ext}`);
    },
});
const upload = multer({ storage });

const router = Router();


router.get('/dashboard', requireAuth, async (req, res) => {

    const folders = await db.getTopLevelFolders(req.user.email);

    res.render('dashboard', { user: req.user, folders });
});

router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.redirect('/dashboard');
        }
        res.redirect('/');
    });
});

router.post('/dashboard', requireAuth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No file uploaded');
        }
        console.log('Uploaded file:', req.file); // req.file.path is final path now
    } catch (error) {
        console.error('Error during file upload:', error);
        return res.status(500).send('Error uploading file');
    }
    res.render('dashboard', { user: req.user });
});


router.post('/dashboard/create-folder', requireAuth, async (req, res) => {
    const { folderName } = req.body;

    try {
        await db.createFolder(folderName, req.user.id, null);

    } catch (error) {
        console.error('Error creating folder:', error);
        return res.status(500).send('Error creating folder');
    }

    res.redirect('/dashboard');
});


module.exports = { DashboardRouter: router }