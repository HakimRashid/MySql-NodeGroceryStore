const express = require('express');
const router = express.Router();

const sqlConfig = {
    user: process.env.SQL_SERVER_USER || 'sa',
    password: process.env.SQL_SERVER_PASSWORD || '304#sa#pw',
    database: process.env.SQL_SERVER_DATABASE || 'orders',
    server: process.env.SQL_SERVER_HOST || 'cosc304-sqlserver',
    port: parseInt(process.env.SQL_SERVER_PORT || '1433', 10),
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

router.get('/', function(req, res, next) {
    res.setHeader('Content-Type', 'text/html');
    // Set the message for the login, if present
    let loginMessage = false;
    if (req.session.loginMessage) {
        loginMessage = req.session.loginMessage;
        req.session.loginMessage = false;
    }

    res.render('login', {
        title: "Login Screen",
        loginMessage: loginMessage
    });
});

module.exports = router;
