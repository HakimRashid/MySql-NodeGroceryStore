const express = require('express');
const router = express.Router();
const auth = require('../auth');
const sql = require('mssql');

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

router.post('/', function(req, res) {

    (async () => {
        let authenticatedUser = await validateLogin(req);
        if (authenticatedUser) {
            req.session.authenticatedUser = authenticatedUser; 
            req.session.loginMessage = false;
            res.redirect("/");
        } else {
            req.session.loginMessage = "Invalid username or password.";
            res.redirect("/login");
        }
     })();
});

async function validateLogin(req) {
    if (!req.body || !req.body.username || !req.body.password) {
        return false;
    }

    let username = req.body.username;
    let password = req.body.password;
    let authenticatedUser =  await (async function() {
        try {
            let pool = await sql.connect(dbConfig);

            const result = await pool.request()
                .input("userid", sql.VarChar, username)
                .input("password", sql.VarChar, password)
                .query(`
                SELECT firstName, userid, lastName
                FROM customer
                WHERE userid = @userid AND password = @password
            `);

            if (result.recordset.length === 1) {
                return {
                    userid: result.recordset[0].userid,
                    firstName: result.recordset[0].firstName,
                    lastName: result.recordset[0].lastName
                };
            }

           return false;
        } catch(err) {
            console.dir(err);
            return false;
        }
    })();

    return authenticatedUser;
}

module.exports = router;
