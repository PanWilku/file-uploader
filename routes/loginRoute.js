const db = require('../db/prisma');
const { Router } = require('express');
const bcrypt = require('bcrypt');
const passport = require('../config/auth');

const router = Router();

router.get('/', (req, res) => {
  const error = req.session.error || null;
  req.session.error = null; // Clear the error after displaying it
  res.render('index', { error });
});

router.post('/', passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/',
  failureFlash: false
}));

module.exports = {LoginRoute: router}