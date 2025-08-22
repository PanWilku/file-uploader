const db = require('./prisma');

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

module.exports = {
  getUserByEmail,
  getUserById,
  isEmailTaken,
  createUser,
  createUserFolder,
  getTopLevelFolders,
  getFoldersAndFilesByParentId,
  createFolder
};


