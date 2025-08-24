const db = require('../db/queries');
const { Router } = require('express');
const passport = require('../config/auth');
const { requireAuth } = require('../middleware/requireAuth');
const fs = require('fs');
const path = require('path');
const { getSignedUrl } = require('../services/storage');
const prisma = require('../db/prisma');

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

router.post('/dashboard/delete-folder/:id', requireAuth, async (req, res) => {
    const folderId = req.params.id;
    try {
        await db.deleteFolder(folderId, req.user.id);
    } catch (error) {
        console.error('Error deleting folder:', error);
        return res.status(500).send('Error deleting folder');
    }
    res.redirect('/dashboard');
});

// Cloud-first download (falls back to local if present)
router.get('/file/:id/download', requireAuth, async (req, res) => {
  const fileId = Number(req.params.id);
  try {
    const file = await prisma.file.findFirst({
      where: { id: fileId, ownerId: req.user.id },
      select: { name: true, localPath: true, cloudUrl: true },
    });
    if (!file) return res.sendStatus(404);

    if (file.cloudUrl && !file.cloudUrl.startsWith('<')) {
      const signedUrl = await getSignedUrl(file.cloudUrl, 60 * 5);
      return res.redirect(signedUrl);
    }

    if (file.localPath && fs.existsSync(file.localPath)) {
      return res.download(file.localPath, file.name);
    }

    return res.status(404).send('File not found');
  } catch (err) {
    console.error('Download error:', err);
    return res.sendStatus(500);
  }
});

module.exports = { DashboardRouter: router }