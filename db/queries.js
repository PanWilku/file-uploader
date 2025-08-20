const db = require('./prisma');

const getUserByEmail = async (email) => {
  return await db.user.findUnique({
    where: { email }
  });
};

const getUserById = async (id) => {
  return await db.user.findUnique({
    where: { id }
  });
};

module.exports = {
  getUserByEmail,
  getUserById
};


