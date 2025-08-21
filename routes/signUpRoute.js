const { Router } = require('express');
const bcrypt = require('bcrypt');
const db = require('../db/queries');


const router = Router();


router.get('/sign-up', (req, res) => {
  res.render('sign-up');
});

router.post('/sign-up', async (req, res) => {

    const { name, email, password } = req.body;


    try {
        const isEmailTaken = await db.isEmailTaken(email)
        if (isEmailTaken) {
            res.render('sign-up', { error: 'email already taken'});
        } 


        const hashedPassword = await bcrypt.hash(password, 10);
        await db.createUser(name, email, hashedPassword);


        res.redirect('/log-in');

    } catch (error) {
        console.error('Error during sign-up:', error);
        return res.status(500).send('Internal server error');
    }

});




module.exports = {SignUpRouter: router}