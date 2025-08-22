const db = require('../db/queries');
const { Router } = require('express');
const { requireAuth } = require('../middleware/requireAuth')

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


module.exports = { FolderRouter: router }