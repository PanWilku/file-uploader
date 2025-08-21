const express = require('express');
const passport = require('./config/auth');
const path = require('path');
const expressSession = require('express-session');
const { PrismaSessionStore } = require('@quixo3/prisma-session-store');
const db = require('./db/prisma');
require('dotenv').config();
const { SignUpRouter } = require('./routes/signUpRoute');
const { LoginRoute } = require('./routes/loginRoute');
const { DashboardRoute } = require('./routes/dashbaordRoute');


const app = express();
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
app.use(express.json());




app.use(
  expressSession({
    name: 'sid',
    secret: process.env.SESSION_SECRET || 'a santa at nasa',
    resave: false,                // let the store handle touch/updates
    saveUninitialized: false,     // don’t create empty sessions
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'development' ? false : true, // set to true in production
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
    store: new PrismaSessionStore(db, {
      checkPeriod: 2 * 60 * 1000,
      dbRecordIdIsSessionId: false, 
      ttl: 7 * 24 * 60 * 60 * 1000,  // match cookie.maxAge
    }),
  })
);

app.use(passport.initialize()); 
app.use(passport.session());


app.use('/', LoginRoute);
app.use('/', SignUpRouter);
app.use('/', DashboardRoute);



// Add sign-up route as needed

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});