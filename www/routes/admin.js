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

router.get('/', function (req, res, next) {


    // TODO: Include files auth.jsp and jdbc.jsp
    if (!auth.checkAuthentication(req, res)) {
        return;
    }


    res.setHeader('Content-Type', 'text/html');

    (async function () {
        try {
            let pool = await sql.connect(dbConfig);

            // TODO: Write SQL query that prints out total order amount by day

            // SQL: total order amount per day
            const sqlQuery = `
            SELECT 
                CAST(orderDate AS DATE) AS orderDay,
                SUM(totalAmount) AS dailySales
            FROM ordersummary
            GROUP BY CAST(orderDate AS DATE)
            ORDER BY orderDay;
        `;

            const result = await pool.request().query(sqlQuery);

            // --- HTML OUTPUT ---
            // ----- Page Layout -----
            res.write(`
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

    .report-container {
        max-width:900px;
        margin:40px auto;
        background:#fff;
        padding:30px;
        border-radius:16px;
        box-shadow:0 2px 12px rgba(0,0,0,0.1);
    }
    .report-container h2 {
        margin-top:0;
        font-size:28px;
        border-bottom:2px solid #e2e8f0;
        padding-bottom:10px;
    }

    .user-banner {
        background:#ebf8ff;
        padding:10px 15px;
        border:1px solid #90cdf4;
        color:#2b6cb0;
        border-radius:8px;
        margin-bottom:20px;
        font-weight:600;
    }

    table {
        width:100%;
        border-collapse:collapse;
        margin-top:15px;
        border-radius:12px;
        overflow:hidden;
        box-shadow:0 1px 6px rgba(0,0,0,0.1);
    }
    th {
        background:#edf2f7;
        text-align:left;
        padding:12px;
        text-transform:uppercase;
        font-size:12px;
        font-weight:700;
    }
    td {
        padding:12px;
        border-bottom:1px solid #e2e8f0;
        font-size:15px;
    }
    tr:last-child td { border-bottom:none; }
    tr:hover { background:#f7fafc; }
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

<div class="report-container">
    <h2>Admin Sales Report</h2>

    <div class="user-banner">
        Logged in as: <strong>${req.session.authenticatedUser.userid}</strong>
    </div>

    <table>
        <tr>
            <th>Date</th>
            <th>Total Sales</th>
        </tr>
`);

            result.recordset.forEach(row => {
                const date = row.orderDay.toISOString().split("T")[0];
                const amount = `$${Number(row.dailySales).toFixed(2)}`;

                res.write(`
        <tr>
            <td>${date}</td>
            <td>${amount}</td>
        </tr>
    `);
            });

            res.write(`
    </table>
</div>
            `);
            res.end();


        } catch (err) {
            console.dir(err);
            res.write(err + "");
            res.end();
        }
    })();
});

module.exports = router;