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
            .content-wrapper { max-width:700px; margin:0 auto; padding:40px 18px 60px; }
            .checkout-card { background:#fff; padding:32px; border-radius:14px; box-shadow:0 2px 10px rgba(0,0,0,0.08); }
            .checkout-card h1 { margin-top:0; }
            .checkout-card label { display:block; font-weight:600; margin-top:18px; }
            .checkout-card input { width:100%; padding:12px; border:1px solid #cbd5f5; border-radius:8px; margin-top:6px; font-size:16px; }
            .checkout-card button { margin-top:24px; width:100%; padding:12px; border:none; border-radius:8px; background:#2b6cb0; color:#fff; font-weight:600; font-size:16px; cursor:pointer; }
            .checkout-card p.note { color:#4a5568; margin-top:6px; font-size:14px; }
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

router.get('/', function(req, res, next) {
    res.setHeader('Content-Type', 'text/html');
    res.write("<title>DanHak Grocery Checkout</title>");
    res.write(pageShell.start);

    res.write(`
        <div class="checkout-card">
            <h1>Secure Checkout</h1>
            <p class="note">Enter your customer information to place the order. We validate your password before charging the cart.</p>
            <form method="get" action="order">
                <label for="customerId">Customer ID</label>
                <input type="number" min="1" id="customerId" name="customerId" required>

                <label for="password">Password</label>
                <input type="password" id="password" name="password" required>

                <button type="submit">Place Order</button>
            </form>
        </div>
    `);

    res.write(pageShell.end);
    res.end();
});

module.exports = router;
