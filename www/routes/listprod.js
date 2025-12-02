const express = require('express');
const router = express.Router();
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

const pageShell = {
    start: `
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background:#f5f5f5; margin:0; color:#1a202c; }
            .site-header { background:#1f2933; color:#fff; padding:18px 24px; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:10px; }
            .site-header h1 { margin:0; font-size:26px; }
            .site-header nav a { color:#f6e05e; text-decoration:none; font-weight:600; margin-left:15px; }
            .site-header nav a:hover { text-decoration:underline; }
            .content-wrapper { max-width:1100px; margin:0 auto; padding:28px 18px 60px; }
            .filter-card { background:#fff; border-radius:12px; padding:20px; box-shadow:0 2px 10px rgba(0,0,0,0.08); margin-bottom:24px; }
            .filter-form { display:flex; flex-wrap:wrap; gap:18px; align-items:flex-end; }
            .filter-form label { display:flex; flex-direction:column; font-weight:600; font-size:14px; }
            .filter-form input, .filter-form select { padding:10px 12px; border-radius:8px; border:1px solid #cbd5f5; min-width:220px; font-size:15px; }
            .filter-form button, .filter-form .clear-link { padding:10px 18px; border:none; border-radius:8px; font-weight:600; cursor:pointer; }
            .filter-form button { background:#2f855a; color:#fff; }
            .filter-form .clear-link { background:#4a5568; color:#fff; text-decoration:none; }
            .status-text { margin-bottom:14px; color:#4a5568; font-size:15px; }
            .product-table { width:100%; border-collapse:collapse; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.08); }
            .product-table th { background:#edf2f7; text-align:left; padding:14px; font-size:13px; text-transform:uppercase; letter-spacing:0.6px; }
            .product-table td { padding:14px; border-bottom:1px solid #e2e8f0; vertical-align:top; }
            .product-table tr:last-child td { border-bottom:none; }
            .product-table tr:hover { background:#f7fafc; }
            .product-table .price { font-weight:600; font-size:15px; }
            .product-table a { color:#2b6cb0; font-weight:600; }
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
        <div class="content-wrapper">
    `,
    end: `</div>`
};

const escapeHtml = (value = '') =>
    String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const formatCurrency = value => `$${Number(value).toFixed(2)}`;

router.get('/', async function(req, res, next) {
    res.setHeader('Content-Type', 'text/html');
    res.write('<title>DanHak Grocery</title>');
    res.write(pageShell.start);

    const name = typeof req.query.productName === 'string' ? req.query.productName.trim() : '';
    const categoryParam = req.query.categoryId;

    try {
        const pool = await sql.connect(sqlConfig);

        const categoryResult = await pool.request().query(`
            SELECT categoryId, categoryName
            FROM category
            ORDER BY categoryName
        `);

        let selectedCategoryId = '';
        if (categoryParam && !Number.isNaN(parseInt(categoryParam, 10))) {
            selectedCategoryId = parseInt(categoryParam, 10);
        }

        res.write(`
            <section class="filter-card">
                <form method="get" class="filter-form">
                    <label>Product Name
                        <input type="text" name="productName" placeholder="e.g. chai" value="${escapeHtml(name)}">
                    </label>
                    <label>Category
                        <select name="categoryId">
                            <option value="">All Categories</option>
                            ${categoryResult.recordset.map(cat => `
                                <option value="${cat.categoryId}" ${selectedCategoryId === cat.categoryId ? 'selected' : ''}>
                                    ${escapeHtml(cat.categoryName)}
                                </option>
                            `).join('')}
                        </select>
                    </label>
                    <button type="submit">Search</button>
                    <a class="clear-link" href="/listprod">Reset</a>
                </form>
            </section>
        `);

        let productQuery = `
            SELECT p.productId, p.productName, p.productDesc, p.productPrice, c.categoryName
            FROM product p
            LEFT JOIN category c ON p.categoryId = c.categoryId
        `;
        const request = pool.request();
        const filters = [];

        if (name) {
            filters.push('p.productName LIKE @productName');
            request.input('productName', sql.VarChar, `%${name}%`);
            res.write(`<h2>Search results for "${escapeHtml(name)}"</h2>`);
        } else {
            res.write('<h2>All Products</h2>');
        }

        if (selectedCategoryId !== '') {
            filters.push('p.categoryId = @categoryId');
            request.input('categoryId', sql.Int, selectedCategoryId);
        }

        if (filters.length > 0) {
            productQuery += ' WHERE ' + filters.join(' AND ');
        }
        productQuery += ' ORDER BY p.productName';

        const result = await request.query(productQuery);
        res.write(`<p class="status-text">${result.recordset.length} item(s) found.</p>`);

        if (result.recordset.length === 0) {
            res.write('<p>No products match your search.</p>');
        } else {
            res.write("<table class='product-table'><tr><th>Name</th><th>Description</th><th>Category</th><th>Price</th><th>Add</th></tr>");

            result.recordset.forEach(product => {
                const formattedPrice = formatCurrency(product.productPrice);
                const addLink = `addcart?id=${product.productId}&name=${encodeURIComponent(product.productName)}&price=${Number(product.productPrice).toFixed(2)}`;
                res.write(`
                    <tr>
                        <td><a href="/product?id=${product.productId}">${escapeHtml(product.productName)}</a></td>
                        <td>${escapeHtml(product.productDesc || 'No description available.')}</td>
                        <td>${escapeHtml(product.categoryName || 'Uncategorized')}</td>
                        <td class="price">${formattedPrice}</td>
                        <td><a href="${addLink}">Add to cart</a></td>
                    </tr>
                `);
            });

            res.write('</table>');
        }
    } catch (err) {
        console.error(err);
        res.write(`<p>Error retrieving products: ${escapeHtml(err.message)}</p>`);
    }

    res.write(pageShell.end);
    res.end();
});

module.exports = router;
