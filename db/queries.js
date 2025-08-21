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

module.exports = {
        getUserByEmail,
        getUserById,
        isEmailTaken,
        createUser
};


