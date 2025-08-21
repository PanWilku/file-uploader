const db = require('../db/prisma');
const { Router } = require('express');
const bcrypt = require('bcrypt');


const router = Router();


router.get('/', (req, res) => {
  res.render('index');
});




module.exports = {indexRoute: router}