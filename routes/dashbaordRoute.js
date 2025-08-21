const db = require('../db/queries');
const { Router } = require('express');
const passport = require('../config/auth');
const { requireAuth } = require('../middleware/requireAuth');


const router = Router();


router.get('/dashboard', requireAuth, (req, res) => {
    console.log('Dashboard route hit!');
    console.log('User authenticated:', !!req.user);
    console.log('User data:', req.user);
    res.render('dashbaord', { user: req.user }); // Keep this as 'dashbaord' to match your EJS file
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


module.exports = { DashboardRoute: router }