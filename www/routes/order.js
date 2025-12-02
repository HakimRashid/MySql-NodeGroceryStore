const express = require('express');
const router = express.Router();
const sql = require('mssql');
const moment = require('moment');

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

const pageShell = {
    start: `
        <style>
            body { font-family:'Segoe UI', Arial, sans-serif; background:#f5f5f5; margin:0; color:#1a202c; }
            .site-header { background:#1f2933; color:#fff; padding:18px 24px; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:10px; }
            .site-header h1 { margin:0; font-size:26px; }
            .site-header nav a { color:#f6e05e; text-decoration:none; font-weight:600; margin-left:15px; }
            .site-header nav a:hover { text-decoration:underline; }
            .content-wrapper { max-width:900px; margin:0 auto; padding:30px 18px 60px; }
            .order-summary { background:#fff; border-radius:12px; padding:24px; box-shadow:0 2px 10px rgba(0,0,0,0.08); }
            .order-summary table { width:100%; border-collapse:collapse; margin-top:15px; }
            .order-summary th { background:#edf2f7; text-align:left; padding:10px; text-transform:uppercase; font-size:12px; letter-spacing:0.5px; }
            .order-summary td { padding:10px; border-bottom:1px solid #e2e8f0; }
            .order-summary tr:last-child td { border-bottom:none; }
            .order-summary .total { text-align:right; font-weight:700; font-size:16px; }
            .alert { padding:12px 16px; border-radius:8px; margin-bottom:18px; font-weight:600; }
            .alert.error { background:#fed7d7; color:#742a2a; }
            .alert.success { background:#c6f6d5; color:#22543d; }
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
            </nav>
        </header>
        <div class="content-wrapper">
    `,
    end: `</div>`
};

const hasItems = list => Array.isArray(list) && list.some(item => !!item);
const formatCurrency = value => `$${Number(value).toFixed(2)}`;

router.get('/', async function(req, res, next) {
    res.setHeader('Content-Type', 'text/html');
    res.write("<title>DanHak Grocery Order Processing</title>");

    res.write(pageShell.start);



    let productList = Array.isArray(req.session.productList) ? req.session.productList : [];

    // Persist entered customer credentials in the session so that validation survives redirects.
    if (req.query.customerId) {
        const parsedCustomerId = parseInt(req.query.customerId, 10);
        if (!Number.isNaN(parsedCustomerId)) {
            req.session.customerId = parsedCustomerId;
        }
    }
    if (req.query.password) {
        req.session.customerPassword = req.query.password;
    }

    /**
    Determine if valid customer id was entered
    Determine if there are products in the shopping cart
    If either are not true, display an error message
    **/
    let customerId = req.session.customerId;
    let customerPassword = req.session.customerPassword;

    if (!hasItems(productList)) {
        res.write('<div class="alert error">Your shopping cart is empty. Add items before checking out.</div>');
        res.write(pageShell.end);
        return res.end();
    }

    if (!customerId || Number.isNaN(parseInt(customerId, 10))) {
        res.write('<div class="alert error">Please provide a valid numeric customer ID.</div>');
        res.write(pageShell.end);
        return res.end();
    }

    if (!customerPassword) {
        res.write('<div class="alert error">Please provide your account password.</div>');
        res.write(pageShell.end);
        return res.end();
    }

    /** Make connection and validate **/
    try {
        const pool = await sql.connect(sqlConfig);

        // Ensure the customer exists and the password is correct.
        const customerLookup = await pool.request()
            .input('customerId', sql.Int, customerId)
            .input('password', sql.VarChar, customerPassword)
            .query(`
                SELECT customerId, firstName, lastName
                FROM customer
                WHERE customerId = @customerId AND password = @password
            `);

        if (customerLookup.recordset.length === 0) {
            res.write('<div class="alert error">Invalid customer ID or password. Please try again.</div>');
            res.write(pageShell.end);
            return res.end();
        }

        const customerName = `${customerLookup.recordset[0].firstName} ${customerLookup.recordset[0].lastName}`;

        /** Save order information to database **/
        let orderDate = moment().format('YYYY-MM-DD HH:mm:ss');
        let totalAmount = 0;

        // Use retrieval of auto-generated keys.
        let sqlQuery = `
            INSERT INTO ordersummary (customerId, orderDate, totalAmount)
            OUTPUT INSERTED.orderId
            VALUES (@customerId, @orderDate, @totalAmount)
        `;
        let result = await pool.request()
            .input('customerId', sql.Int, customerId)
            .input('orderDate', sql.DateTime, orderDate)
            .input('totalAmount', sql.Decimal(10,2), totalAmount)
            .query(sqlQuery);

        // Catch errors generated by the query
        let orderId = result.recordset[0].orderId;

        /** Insert each item into orderproduct table using OrderId from previous INSERT **/
        for (let i = 0; i < productList.length; i++) {
            let product = productList[i];
            if (!product) continue;

            const productId = parseInt(product.id, 10);
            const quantity = parseInt(product.quantity, 10);
            const price = parseFloat(product.price);
            if (Number.isNaN(productId) || Number.isNaN(quantity) || Number.isNaN(price)) {
                continue;
            }

            let itemTotal = quantity * price;
            totalAmount += itemTotal;

            await pool.request()
                .input('orderId', sql.Int, orderId)
                .input('productId', sql.Int, productId)
                .input('quantity', sql.Int, quantity)
                .input('price', sql.Decimal(10,2), price)
                .query(`
                    INSERT INTO orderproduct (orderId, productId, quantity, price)
                    VALUES (@orderId, @productId, @quantity, @price)
                `);
        }

        totalAmount = Number(totalAmount.toFixed(2));

        /** Update total amount for order record **/
        await pool.request()
            .input('orderId', sql.Int, orderId)
            .input('totalAmount', sql.Decimal(10,2), totalAmount)
            .query(`UPDATE ordersummary SET totalAmount = @totalAmount WHERE orderId = @orderId`);

        /** Print out order summary **/
        res.write(`<div class="alert success">Order placed successfully!</div>`);
        res.write(`<div class="order-summary">`);
        res.write(`<h2>Order Summary</h2>`);
        res.write(`<p><strong>Order ID:</strong> ${orderId}</p>`);
        res.write(`<p><strong>Customer:</strong> ${customerName} (#${customerId})</p>`);
        res.write(`<p><strong>Placed:</strong> ${orderDate}</p>`);
        res.write(`<table><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr>`);

        for (let i = 0; i < productList.length; i++) {
            let product = productList[i];
            if (!product) continue;

            const quantity = parseInt(product.quantity, 10);
            const price = parseFloat(product.price);
            if (Number.isNaN(quantity) || Number.isNaN(price)) {
                continue;
            }

            let itemTotal = quantity * price;
            res.write(`<tr>
                <td>${product.name}</td>
                <td>${quantity}</td>
                <td>${formatCurrency(price)}</td>
                <td>${formatCurrency(itemTotal)}</td>
            </tr>`);
        }

        res.write(`</table><p class="total">Order Total: ${formatCurrency(totalAmount)}</p>`);
        res.write(`<p><a href="/listorder">View All Orders</a> | <a href="/listprod">Continue Shopping</a></p>`);
        res.write(`</div>`);

        /** Clear session/cart **/
        req.session.productList = [];
        req.session.customerPassword = null;

    } catch (err) {
        console.error(err);
        res.write(`<div class="alert error">Error processing order: ${err.message}</div>`);
    }

    res.write(pageShell.end);
    res.end();
});

module.exports = router;
