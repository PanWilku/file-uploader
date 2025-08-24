const db = require('../db/queries');
const { Router } = require('express');
const { requireAuth } = require('../middleware/requireAuth')
const multer = require('multer')
const fs = require('fs');
const path = require('path');
const { uploadLocalFileToSupabase } = require('../services/storage');
const crypto = require('crypto');

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

router.get('/:id', requireAuth, async (req, res) => {

    const id = req.params.id;

    const result = await db.getFoldersAndFilesByParentId(id, req.user.id);

    res.render('folder', { result, id });
});



router.post('/:id/create-folder', requireAuth, async (req, res) => {
    const { folderName } = req.body;
    console.log(`entered ${req.params.id} create folder route!`);
    try {
        await db.createFolder(folderName, req.user.id, req.params);

    } catch (error) {
        console.error('Error creating folder:', error);
        return res.status(500).send('Error creating folder');
    }

    res.redirect(`/folder/${req.params.id}`);
});


router.post('/:id/upload-file', requireAuth, upload.single('file'), async (req, res) => {
    const folderId = req.params.id;
    const file = req.file;

    if (!file) {
        return res.status(400).send('No file uploaded');
    }

    try {
        // Build cloud key: <userId>/<folderPath>/<multer-unique-filename>
        const folderPath = await db.getFolderPath(folderId, req.user.id); // e.g., "Work/Images"
        const baseKey = `${req.user.id}/${folderPath ? folderPath + '/' : ''}${file.filename}`;

        // Upload local file to Supabase
        const storageKey = await uploadLocalFileToSupabase(file.path, baseKey, file.mimetype);

        // Save DB record (localPath + cloud key)
        await db.uploadFile(file, folderId, req.user, storageKey);

    } catch (error) {
        console.error('Error uploading file:', error);
        return res.status(500).send('Error uploading file');
    }

    res.redirect(`/folder/${folderId}`);
});

router.post('/:id/delete', requireAuth, async (req, res) => {
    const folderId = req.params.id;
    const parentId = await db.getParentFolderIdByChildrenId(folderId, req.user.id);
    try {

        await db.deleteFolder(folderId, req.user.id);
    } catch (error) {
        console.error('Error deleting folder:', error);
        return res.status(500).send('Error deleting folder');
    }

    res.redirect(`/folder/${parentId}`);
});

module.exports = { FolderRouter: router }