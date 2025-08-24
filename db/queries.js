const db = require('./prisma');
const { removeObjects } = require('../services/storage');

const getUserByEmail = async (email) => {
  return await db.user.findUnique({
    where: { email }
  });
};

const getUserById = async (id) => {
  const user = await db.user.findUnique({
    where: { id }
  });

  return user; //same as return await instantly
};

const isEmailTaken = async (email) => {

  const user = await db.user.findUnique({
    where: { email }
  });

  return user ? true : false; // If user exists, email is taken

};


const createUser = async (name, email, password) => {

  return await db.user.create({
    data: {
      name,
      email,
      password
    }
  })
}

const createUserFolder = async (email) => {
  const user = await getUserByEmail(email);

  // Create a folder for the user
  await db.folder.create({
    data: {
      name: "Default Folder",
      ownerId: user.id
    }
  });
}

const getTopLevelFolders = async (email) => {
  const user = await getUserByEmail(email);

  const folders = await db.folder.findMany({
    where: {
      ownerId: user.id,
      parentId: null
    }
  });

  return folders;
}


const getFoldersAndFilesByParentId = async (folderId, userId) => {

  const folder = await db.folder.findUnique({
    where: {
      ownerId: userId,
      id: Number(folderId)
    },
    include: {
      children: {
        where: {
          ownerId: userId
        }
      },
      files: {
        where: {
          ownerId: userId
        }
      },
      _count: {
        select: {
          children: true,
          files: true
        }
      }
    },
  });

  return {
    folder,
    folders: folder.children,
    files: folder.files
  };
}


const createFolder = async (folderName, userId, params) => {

  console.log("create folder function from now!", params)

  if (params === null) {

    //create a folder for dashboard
    return await db.folder.create({
      data: {
        name: folderName,
        ownerId: userId
      }
    });
  } else {
    //create a folder with a parent
    const result = await db.folder.create({
      data: {
        name: folderName,
        ownerId: userId,
        parentId: Number(params.id)
      }
    });
    console.log(result);
    return result;
  }
};


const safeSegment = (name) => String(name || '').replace(/[\\/]+/g, '-').trim();

const getFolderPath = async (folderId, userId) => {
  if (!folderId) return ''; // dashboard/root uploads
  let curr = Number(folderId);
  const parts = [];
  while (curr) {
    const f = await db.folder.findUnique({
      where: { id: curr },
      select: { id: true, name: true, parentId: true, ownerId: true },
    });
    if (!f || f.ownerId !== userId) break;
    parts.unshift(safeSegment(f.name));
    curr = f.parentId;
  }
  return parts.join('/');
};

const uploadFile = async (file, folderId, user, storageKey = null) => {
  if (!file || !folderId || !user) {
    throw new Error('Invalid file, folderId or user');
  }

  return await db.file.create({
    data: {
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
      localPath: file.path,              // still keep local path
      cloudUrl: storageKey ?? '<cloud_url>', // store storage key here
      folderId: Number(folderId),
      ownerId: user.id
    }
  });
};


const getFilesInFolderTree = async (rootFolderId, userId) => {
  // collect all descendant folder ids
  const toVisit = [Number(rootFolderId)];
  const allIds = [Number(rootFolderId)];

  while (toVisit.length) {
    const batch = await db.folder.findMany({
      where: { parentId: { in: toVisit }, ownerId: userId },
      select: { id: true },
    });
    toVisit.length = 0;
    const ids = batch.map(b => b.id);
    allIds.push(...ids);
    toVisit.push(...ids);
  }

  return await db.file.findMany({
    where: { ownerId: userId, folderId: { in: allIds } },
    select: { cloudUrl: true }, // storage keys
  });
};

const deleteFolder = async (folderId, userId) => {
  // collect keys first
  const files = await getFilesInFolderTree(folderId, userId);
  const keys = files.map(f => f.cloudUrl).filter(Boolean);

  // delete folder (DB cascades to children + files)
  await db.folder.deleteMany({
    where: { id: Number(folderId), ownerId: userId },
  });

  // best-effort cloud deletion
  try {
    await removeObjects(keys);
  } catch (e) {
    console.warn('Cloud delete warning:', e?.message);
  }
}


const getParentFolderIdByChildrenId = async (folderId, userId) => {
  const folder = await db.folder.findFirst({
    where: {
      id: Number(folderId),
      ownerId: userId, // ensure ownership
    },
    select: { parentId: true },
  });

  return folder ? folder.parentId : null; // null for top-level or not found
}

module.exports = {
  getUserByEmail,
  getUserById,
  isEmailTaken,
  createUser,
  createUserFolder,
  getTopLevelFolders,
  getFoldersAndFilesByParentId,
  createFolder,
  uploadFile,
  deleteFolder,
  getParentFolderIdByChildrenId,
  getFolderPath, // export for routes
};


