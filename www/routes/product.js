const express = require('express');
const router = express.Router();
const sql = require('mssql');

const dbConfig = {
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
        font-family: 'Segoe UI', Arial, sans-serif;
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
    .site-header h1 {
        margin:0; 
        font-size:26px;
    }
    .site-header nav a {
        color:#f6e05e; 
        text-decoration:none; 
        font-weight:600; 
        margin-left:15px;
    }
    .site-header nav a:hover { text-decoration:underline; }

    .product-container {
        max-width:900px;
        margin:40px auto;
        background:#fff;
        padding:30px;
        border-radius:16px;
        box-shadow:0 2px 12px rgba(0,0,0,0.08);
        display:flex;
        flex-wrap:wrap;
        gap:30px;
    }

    .product-img-box {
        flex:1 1 300px;
        text-align:center;
    }
    .product-img-box img {
        width:100%;
        max-width:320px;
        border-radius:12px;
        box-shadow:0 2px 8px rgba(0,0,0,0.1);
    }

    .product-info {
        flex:2 1 400px;
    }
    .product-info h1 {
        margin-top:0;
        font-size:32px;
    }
    .product-desc {
        font-size:17px;
        margin:15px 0;
        color:#4a5568;
    }
    .product-price {
        font-size:22px;
        font-weight:700;
        margin:10px 0 20px;
    }

    .actions {
        margin-top:20px;
        display:flex;
        gap:15px;
        flex-wrap:wrap;
    }

    .btn {
        padding:12px 20px;
        border-radius:8px;
        text-decoration:none;
        font-weight:600;
    }
    .btn-cart { background:#2f855a; color:#fff; }
    .btn-cart:hover { background:#276749; }
    .btn-back { background:#2b6cb0; color:#fff; }
    .btn-back:hover { background:#245b99; }
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
`;


router.get('/', function (req, res, next) {
    res.setHeader('Content-Type', 'text/html');
    (async function () {
        try {
            let pool = await sql.connect(dbConfig);

            let id = parseInt(req.query.id);
            if (isNaN(id)) {
                return res.status(400).send("Invalid product id");
            }

            const ps = new sql.PreparedStatement(pool);

            ps.input('id', sql.Int);

            await ps.prepare('SELECT productId, productName, productPrice, productDesc, productImageURL, productImage FROM product WHERE productId = @id');

            const result = await ps.execute({ id });
            await ps.unprepare();

            if (!result.recordset || result.recordset.length === 0) {
                return res.status(404).render('product', { title: 'Product Not Found', product: null });
            }

            const p = result.recordset[0];

            res.write(pageTop);

            res.write(`
    <div class="product-container">

    <div class="product-img-box">
            `);
            let unavail = true;

            if (p.productImageURL) {
                res.write(`<img src="/${p.productImageURL}" alt="${p.productName}">`);
                unavail = false;
            }

            if (p.productImage) {
                res.write(`<img src="/displayImage?id=${p.productId}" alt="${p.productName}">`);
                unavail = false;
            } 
            
            if(unavail) {
                res.write(`<p>No image available.</p>`);
            }

            res.write(`
    </div>

        <div class="product-info">
            <h1>${p.productName}</h1>
            <div class="product-price">$${Number(p.productPrice).toFixed(2)}</div>
            <div class="product-desc">${p.productDesc || "No description provided."}</div>

            <div class="actions">
                <a class="btn btn-cart" 
                href="/addcart?id=${p.productId}&name=${encodeURIComponent(p.productName)}&price=${p.productPrice}">
                Add to Cart
                </a>
                <a class="btn btn-back" href="/listprod">Continue Shopping</a>
            </div>
        </div>

    </div>
        `   );

            res.end()
        } catch (err) {
            console.dir(err);
            res.write(err + "")
            res.end();
        }
    })();
});

module.exports = router;
