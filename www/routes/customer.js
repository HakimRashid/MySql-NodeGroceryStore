const express = require('express');
const router = express.Router();
const sql = require('mssql');
const auth = require('../auth');

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

const pageTop = `
<style>
    body {
        font-family:'Segoe UI', Arial, sans-serif;
        background:#f5f5f5;
        margin:0;
        color:#1a202c;
    }

    .site-header {
        background:#1f2933;
        color:#fff;
        padding:18px 24px;
        display:flex;
        justify-content:space-between;
        align-items:center;
        flex-wrap:wrap;
        gap:10px;
    }
    .site-header h1 { margin:0; font-size:26px; }
    .site-header nav a {
        color:#f6e05e;
        margin-left:15px;
        text-decoration:none;
        font-weight:600;
    }
    .site-header nav a:hover { text-decoration:underline; }

    .card {
        max-width:750px;
        margin:40px auto;
        background:#fff;
        padding:30px 40px;
        border-radius:16px;
        box-shadow:0 2px 12px rgba(0,0,0,0.1);
    }

    .card h2 {
        margin-top:0;
        font-size:28px;
        border-bottom:2px solid #e2e8f0;
        padding-bottom:10px;
    }

    .info-table {
        width:100%;
        margin-top:20px;
        border-collapse:separate;
        border-spacing:0 12px;
    }

    .info-table td.label {
        font-weight:600;
        width:200px;
        color:#2d3748;
        text-align:right;
        padding-right:20px;
        vertical-align:top;
    }

    .info-table td.value {
        color:#4a5568;
        font-size:16px;
    }
</style>

<header class="site-header">
    <div>
        <h1>DanHak Grocery</h1>
        <p style="margin:4px 0 0;">Fresh picks, delivered smart.</p>
    </div>
    <nav>
        <a href="/">Home</a>
        <a href="/listprod">Shop</a>
        <a href="/showcart">Cart</a>
        <a href="/listorder">Orders</a>
        <a href="/customer">Customer Info</a>
    </nav>
</header>

<div class="card">
    <h2>Your Customer Information</h2>
`;

router.get('/', function (req, res, next) {

    if (!auth.checkAuthentication(req, res)) {
        return;
    }

    res.setHeader('Content-Type', 'text/html');

    // TODO: Print Customer information

    (async function () {
        try {
            let pool = await sql.connect(sqlConfig);

            const userid = req.session.authenticatedUser.userid;
            // TODO: Print customer info
            const result = await pool.request()
                .input("userid", sql.VarChar, userid)
                .query(`
                    SELECT customerId, firstName, lastName, email,
                    phonenum, address, city, state, postalCode, country, 
                    userid FROM customer
                    WHERE userid = @userid
                `);

            if (result.recordset.length === 0) {
                res.write("<h2>No customer information found.</h2>");
                return res.end();
            }

            const c = result.recordset[0];

            // Display nicely formatted customer info
            res.write(pageTop)
            res.write(`
<table class="info-table">

<tr>
    <td class="label">Customer ID:</td>
    <td class="value">${c.customerId}</td>
</tr>

<tr>
    <td class="label">First Name:</td>
    <td class="value">${c.firstName}</td>
</tr>

<tr>
    <td class="label">Last Name:</td>
    <td class="value">${c.lastName}</td>
</tr>

<tr>
    <td class="label">Email:</td>
    <td class="value">${c.email}</td>
</tr>

<tr>
    <td class="label">Phone:</td>
    <td class="value">${c.phonenum}</td>
</tr>

<tr>
    <td class="label">Address:</td>
    <td class="value">${c.address}</td>
</tr>

<tr>
    <td class="label">City:</td>
    <td class="value">${c.city}</td>
</tr>

<tr>
    <td class="label">State:</td>
    <td class="value">${c.state}</td>
</tr>

<tr>
    <td class="label">Postal Code:</td>
    <td class="value">${c.postalCode}</td>
</tr>

<tr>
    <td class="label">Country:</td>
    <td class="value">${c.country}</td>
</tr>

<tr>
    <td class="label">User ID:</td>
    <td class="value">${c.userid}</td>
</tr>

</table>
</div>
        `);

            res.end();
        } catch (err) {
            console.dir(err);
            res.write(err + "")
            res.end();
        }
    })();
});

module.exports = router;
