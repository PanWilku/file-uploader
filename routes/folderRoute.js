const db = require('../db/queries');
const { Router } = require('express');
const { requireAuth } = require('../middleware/requireAuth')
const multer = require('multer')
const upload = multer({ dest: 'uploads/' })
const fs = require('fs');
const path = require('path');

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

    res.redirect('/dashboard');
});


router.post('/:id/upload-file', requireAuth, upload.single('file'), async (req, res) => {
    const folderId = req.params.id;
    const file = req.file;

    if (!file) {
        return res.status(400).send('No file uploaded');
    }


    try {
        console.log('File upload request received');
        fs.renameSync(file.path, path.join(__dirname, '../uploads', file.originalname));
        console.log('Uploaded file:', file);
    } catch (error) {
        console.error('Error during file upload:', error);
        return res.status(500).send('Error uploading file');
    }


    try {
        await db.uploadFile(file, folderId, req.user);
    } catch (error) {
        console.error('Error uploading file:', error);
        return res.status(500).send('Error uploading file');
    }

    res.redirect(`/folder/${folderId}`);
});


module.exports = { FolderRouter: router }