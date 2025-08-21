const { session } = require("passport");

const requireAuth = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    req.session.error = 'You must be logged in to view this page';
    res.redirect('/');
};


module.exports = {
    requireAuth,
};