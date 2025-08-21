const db = require('../db/prisma');
const { Router } = require('express');
const bcrypt = require('bcrypt');


const router = Router();


router.get('/log-in', (req, res) => {
  res.render('log-in');
});




module.exports = {LoginRoute: router}