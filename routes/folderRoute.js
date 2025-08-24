const db = require('../db/queries');
const { Router } = require('express');
const { requireAuth } = require('../middleware/requireAuth')
const fs = require('fs');
const path = require('path');
const Busboy = require('busboy');
const { uploadBufferToSupabase, removeObjects } = require('../services/storage'); // add removeObjects
const prisma = require('../db/prisma'); // use prisma for file lookups/deletes

const router = Router();

router.get('/:id', requireAuth, async (req, res) => {
    const id = req.params.id;
    const result = await db.getFoldersAndFilesByParentId(id, req.user.id);
    res.render('folder', { result, id });
});

router.post('/:id/create-folder', requireAuth, async (req, res) => {
    const { folderName } = req.body;
    try {
        await db.createFolder(folderName, req.user.id, req.params);
    } catch (error) {
        console.error('Error creating folder:', error);
        return res.status(500).send('Error creating folder');
    }
    res.redirect(`/folder/${req.params.id}`);
});

// Replace Multer with Busboy streaming upload
router.post('/:id/upload-file', requireAuth, async (req, res) => {
    const folderId = req.params.id;
    const MAX_BYTES = 10 * 1024 * 1024; // 10MB
    let handled = false;
    let uploadErr;

    const bb = Busboy({ headers: req.headers, limits: { files: 1, fileSize: MAX_BYTES } });

    bb.on('file', (fieldname, file, info) => {
        const { filename, mimeType } = info;
        const chunks = [];
        let truncated = false;

        file.on('data', (d) => chunks.push(d));
        file.on('limit', () => { truncated = true; });
        file.on('end', async () => {
            try {
                if (truncated) throw new Error('File too large');

                const buffer = Buffer.concat(chunks);
                const folderPath = await db.getFolderPath(folderId, req.user.id); // mirrors app tree
                const ext = path.extname(filename);
                const base = path.basename(filename, ext);
                const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
                const storedName = `${base}-${unique}${ext}`;
                const storageKey = `${req.user.id}/${folderPath ? folderPath + '/' : ''}${storedName}`;

                await uploadBufferToSupabase(buffer, storageKey, mimeType);

                // Persist metadata; localPath empty since no disk
                await db.uploadFile(
                    { originalname: filename, size: buffer.length, mimetype: mimeType, path: '' },
                    folderId,
                    req.user,
                    storageKey
                );
            } catch (e) {
                uploadErr = e;
            }
        });
    });

    bb.on('error', (e) => { uploadErr = e; });
    bb.on('close', () => {
        if (handled) return;
        handled = true;
        if (uploadErr) {
            console.error('Error uploading file:', uploadErr);
            return res.status(400).send(uploadErr.message);
        }
        return res.redirect(`/folder/${folderId}`);
    });

    req.pipe(bb);
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

// Delete a file (cloud + db + local fallback)
router.post('/:folderId/file/:id/delete', requireAuth, async (req, res) => {
  const folderId = Number(req.params.folderId);
  const fileId = Number(req.params.id);

  try {
    const file = await prisma.file.findFirst({
      where: { id: fileId, ownerId: req.user.id },
      select: { id: true, cloudUrl: true, localPath: true, folderId: true, name: true },
    });
    if (!file) return res.sendStatus(404);

    // Delete from Supabase (if a real storage key is present)
    const key = file.cloudUrl && !file.cloudUrl.startsWith('<') ? file.cloudUrl : null;
    if (key) {
      await removeObjects([key]);
    }

    // Best-effort local cleanup (in case legacy/local files exist)
    if (file.localPath) {
      try { await fs.promises.unlink(file.localPath); } catch {}
    }

    // Delete DB row
    await prisma.file.delete({ where: { id: fileId } });

    return res.redirect(`/folder/${file.folderId ?? folderId}`);
  } catch (err) {
    console.error('Delete file error:', err);
    return res.status(500).send('Error deleting file');
  }
});

module.exports = { FolderRouter: router }