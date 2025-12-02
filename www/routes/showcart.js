const express = require('express');
const router = express.Router();

const pageShell = {
    start: `
        <style>
            body { font-family:'Segoe UI', Arial, sans-serif; background:#f5f5f5; margin:0; color:#1a202c; }
            .site-header { background:#1f2933; color:#fff; padding:18px 24px; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:10px; }
            .site-header h1 { margin:0; font-size:26px; }
            .site-header nav a { color:#f6e05e; text-decoration:none; font-weight:600; margin-left:15px; }
            .site-header nav a:hover { text-decoration:underline; }
            .content-wrapper { max-width:900px; margin:0 auto; padding:30px 18px 60px; }
            .cart-table { width:100%; border-collapse:collapse; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.08); }
            .cart-table th { background:#edf2f7; padding:14px; text-align:left; font-size:13px; text-transform:uppercase; letter-spacing:0.6px; }
            .cart-table td { padding:14px; border-bottom:1px solid #e2e8f0; vertical-align:middle; }
            .cart-table tr:last-child td { border-bottom:none; }
            .cart-actions { display:flex; gap:6px; }
            .cart-actions input { width:70px; padding:6px; border-radius:6px; border:1px solid #cbd5f5; }
            .cart-actions button { padding:6px 10px; border:none; border-radius:6px; font-weight:600; cursor:pointer; }
            .cart-actions .update { background:#2f855a; color:#fff; }
            .cart-actions .remove { background:#c53030; color:#fff; }
            .summary-row { text-align:right; font-size:18px; font-weight:700; background:#f7fafc; }
            .empty-cart { background:#fff; padding:40px; border-radius:12px; text-align:center; box-shadow:0 2px 10px rgba(0,0,0,0.08); }
            .empty-cart a { display:inline-block; margin-top:16px; padding:12px 20px; border-radius:8px; background:#2f855a; color:#fff; text-decoration:none; font-weight:600; }
            .flash { padding:10px 14px; border-radius:8px; margin-bottom:20px; font-weight:600; }
            .flash.success { background:#c6f6d5; color:#22543d; }
            .flash.error { background:#fed7d7; color:#742a2a; }
            .cta-row { margin-top:24px; display:flex; gap:15px; flex-wrap:wrap; }
            .cta-row a, .cta-row button { padding:12px 20px; border-radius:8px; text-decoration:none; font-weight:600; border:none; cursor:pointer; }
            .cta-row .primary { background:#2b6cb0; color:#fff; }
            .cta-row .secondary { background:#4a5568; color:#fff; }
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

const formatCurrency = value => `$${Number(value).toFixed(2)}`;

router.all('/', function(req, res, next) {
    res.setHeader('Content-Type', 'text/html');
    res.write("<title>Your Shopping Cart</title>");
    res.write(pageShell.start);

    let productList = Array.isArray(req.session.productList) ? req.session.productList : [];
    let feedback = '';

    const action = (req.method === 'POST' ? req.body.action : req.query.action) || '';
    const idParam = req.method === 'POST' ? req.body.id : req.query.id;
    const qtyParam = req.method === 'POST' ? req.body.quantity : req.query.quantity;

    if (action && idParam !== undefined) {
        const productId = parseInt(idParam, 10);
        if (!Number.isNaN(productId) && productList[productId]) {
            if (action === 'update') {
                const newQty = parseInt(qtyParam, 10);
                if (!Number.isNaN(newQty) && newQty >= 0) {
                    if (newQty === 0) {
                        delete productList[productId];
                        feedback = 'Item removed from cart.';
                    } else {
                        productList[productId].quantity = newQty;
                        feedback = 'Quantity updated.';
                    }
                } else {
                    feedback = 'Please enter a valid quantity.';
                }
            } else if (action === 'remove') {
                delete productList[productId];
                feedback = 'Item removed from cart.';
            }
        } else if (action) {
            feedback = 'Unable to locate that product in your cart.';
        }
        req.session.productList = productList;
    }

    if (feedback) {
        const type = feedback.includes('Unable') ? 'error' : 'success';
        res.write(`<div class="flash ${type}">${feedback}</div>`);
    }

    res.write("<h1>Your Shopping Cart</h1>");

    const hasItems = productList.some(item => !!item);
    if (!hasItems) {
        res.write('<div class="empty-cart"><p>Your shopping cart is empty.</p><a class="primary" href="/listprod">Start Shopping</a></div>');
        res.write(pageShell.end);
        res.end();
        return;
    }

    res.write("<table class='cart-table'><tr><th>Product Id</th><th>Product Name</th><th>Quantity</th><th>Price</th><th>Subtotal</th><th>Actions</th></tr>");

    let total = 0;
    for (let i = 0; i < productList.length; i++) {
        const product = productList[i];
        if (!product) continue;

        const price = parseFloat(product.price);
        const quantity = parseInt(product.quantity, 10);
        if (Number.isNaN(price) || Number.isNaN(quantity)) continue;

        const subtotal = price * quantity;
        total += subtotal;

        res.write(`<tr>
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td>${quantity}</td>
            <td>${formatCurrency(price)}</td>
            <td>${formatCurrency(subtotal)}</td>
            <td>
                <div class="cart-actions">
                    <form method="post" action="/showcart">
                        <input type="hidden" name="action" value="update">
                        <input type="hidden" name="id" value="${product.id}">
                        <input type="number" min="0" name="quantity" value="${quantity}">
                        <button class="update" type="submit">Update</button>
                    </form>
                    <form method="post" action="/showcart">
                        <input type="hidden" name="action" value="remove">
                        <input type="hidden" name="id" value="${product.id}">
                        <button class="remove" type="submit">Remove</button>
                    </form>
                </div>
            </td>
        </tr>`);
    }

    res.write(`<tr class="summary-row"><td colspan="6">Order Total: ${formatCurrency(total)}</td></tr>`);
    res.write('</table>');

    res.write(`
        <div class="cta-row">
            <a class="secondary" href="/listprod">Continue Shopping</a>
            <a class="primary" href="/checkout">Proceed to Checkout</a>
        </div>
    `);

    res.write(pageShell.end);
    res.end();
});

module.exports = router;
