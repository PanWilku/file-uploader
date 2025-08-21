const db = require('../db/queries');
const { Router } = require('express');
const passport = require('../config/auth');
const { requireAuth } = require('../middleware/requireAuth');
const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })
const fs = require('fs');
const path = require('path');


const router = Router();


router.get('/dashboard', requireAuth, (req, res) => {
    console.log('Dashboard route hit!');
    console.log('User authenticated:', !!req.user);
    console.log('User data:', req.user);
    res.render('dashbaord', { user: req.user }); // Keep this as 'dashbaord' to match your EJS file
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
    res.render('dashbaord', { user: req.user});
});


module.exports = { DashboardRoute: router }