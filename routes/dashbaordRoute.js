const db = require('../db/queries');
const { Router } = require('express');
const passport = require('../config/auth');
const { requireAuth } = require('../middleware/requireAuth');
const multer = require('multer')
const upload = multer({ dest: 'uploads/' })
const fs = require('fs');
const path = require('path');


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
        console.log('File upload request received');
        fs.renameSync(req.file.path, path.join(__dirname, '../uploads', req.file.originalname));
        console.log('Uploaded file:', req.file);
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