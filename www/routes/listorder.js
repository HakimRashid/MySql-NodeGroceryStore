const express = require("express");
const router = express.Router();
const sql = require("mssql");
const moment = require("moment");

const sqlConfig = {
  user: process.env.SQL_SERVER_USER || "sa",
  password: process.env.SQL_SERVER_PASSWORD || "304#sa#pw",
  database: process.env.SQL_SERVER_DATABASE || "orders",
  server: process.env.SQL_SERVER_HOST || "cosc304-sqlserver",
  port: parseInt(process.env.SQL_SERVER_PORT || "1433", 10),
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

const pageShell = {
  start: `
        <style>
            body { font-family:'Segoe UI', Arial, sans-serif; background:#f5f5f5; margin:0; color:#1a202c; }
            .site-header { background:#1f2933; color:#fff; padding:18px 24px; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:10px; }
            .site-header h1 { margin:0; font-size:26px; }
            .site-header nav a { color:#f6e05e; text-decoration:none; font-weight:600; margin-left:15px; }
            .site-header nav a:hover { text-decoration:underline; }
            .content-wrapper { max-width:1100px; margin:0 auto; padding:30px 18px 60px; }
            .order-card { background:#fff; border-radius:12px; padding:20px; margin-bottom:22px; box-shadow:0 2px 10px rgba(0,0,0,0.08); }
            .order-meta { display:flex; flex-wrap:wrap; gap:20px; font-size:14px; color:#4a5568; }
            .filter-card { background:#fff; border-radius:12px; padding:20px; margin:20px 0; box-shadow:0 2px 10px rgba(0,0,0,0.08); }
            .filter-form { display:flex; flex-wrap:wrap; gap:16px; align-items:flex-end; }
            .filter-form label { display:flex; flex-direction:column; font-weight:600; font-size:14px; color:#2d3748; }
            .filter-form input { padding:10px 12px; border-radius:8px; border:1px solid #cbd5f5; min-width:160px; font-size:15px; }
            .filter-form button { padding:10px 18px; border:none; border-radius:8px; font-weight:600; cursor:pointer; background:#2b6cb0; color:#fff; }
            .status-text { color:#4a5568; margin-bottom:18px; }
            .product-table { width:100%; border-collapse:collapse; margin-top:15px; }
            .product-table th { background:#edf2f7; text-align:left; padding:10px; text-transform:uppercase; font-size:12px; letter-spacing:0.5px; }
            .product-table td { padding:10px; border-bottom:1px solid #e2e8f0; }
            .product-table tr:last-child td { border-bottom:none; }
            .product-table .price { text-align:right; }
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
  end: `</div>`,
};

const formatCurrency = (value) => `$${Number(value).toFixed(2)}`;
const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

router.get("/", async function (req, res, next) {
  res.setHeader("Content-Type", "text/html");
  res.write("<title>DanHak Grocery Order List</title>");
  res.write(pageShell.start);

  /** Create connection, and validate that it connected successfully **/
  try {
    const pool = await sql.connect(sqlConfig);

    /**
        Useful code for formatting currency:
            let num = 2.87879778;
            num = num.toFixed(2);
        **/

    res.write("<h1>Recent Orders</h1>");

    const rawCustomerId =
      typeof req.query.customerId === "string"
        ? parseInt(req.query.customerId, 10)
        : "";
    const customerIdParam = Number.isNaN(rawCustomerId) ? "" : rawCustomerId;
    const rawMinTotal =
      typeof req.query.minTotal === "string"
        ? parseFloat(req.query.minTotal)
        : "";
    const minTotalParam = Number.isNaN(rawMinTotal) ? "" : rawMinTotal;

    const parseDate = (value) => {
      if (typeof value !== "string") return "";
      const trimmed = value.trim();
      return moment(trimmed, "YYYY-MM-DD", true).isValid() ? trimmed : "";
    };
    const startDateParam = parseDate(req.query.startDate);
    const endDateParam = parseDate(req.query.endDate);

    res.write(`
            <section class="filter-card">
                <form method="get" class="filter-form">
                    <label>Customer ID
                        <input type="number" name="customerId" placeholder="e.g. 1002" value="${
                          customerIdParam !== "" ? customerIdParam : ""
                        }">
                    </label>
                    <label>Minimum Total
                        <input type="number" step="0.01" name="minTotal" placeholder="e.g. 50.00" value="${
                          minTotalParam !== "" ? minTotalParam : ""
                        }">
                    </label>
                    <label>Start Date
                        <input type="date" name="startDate" value="${escapeHtml(
                          startDateParam
                        )}">
                    </label>
                    <label>End Date
                        <input type="date" name="endDate" value="${escapeHtml(
                          endDateParam
                        )}">
                    </label>
                    <button type="submit">Apply Filters</button>
                </form>
            </section>
        `);

    /** Write query to retrieve all order headers **/
    let orderQuery = `
            SELECT 
                o.orderId,
                o.customerId,
                o.orderDate,
                o.totalAmount,
                CONCAT(c.firstName, ' ', c.lastName) AS customerName
            FROM ordersummary o
            JOIN customer c ON o.customerId = c.customerId
            WHERE 1=1
        `;
    const request = pool.request();

    const activeFilters = [];
    if (customerIdParam !== "" && !Number.isNaN(customerIdParam)) {
      orderQuery += " AND o.customerId = @customerId";
      request.input("customerId", sql.Int, customerIdParam);
      activeFilters.push(`customer ${customerIdParam}`);
    }
    if (minTotalParam !== "" && !Number.isNaN(minTotalParam)) {
      const minTotalValue = Number(
        minTotalParam.toFixed ? minTotalParam.toFixed(2) : minTotalParam
      );
      orderQuery += " AND o.totalAmount >= @minTotal";
      request.input("minTotal", sql.Decimal(10, 2), minTotalValue);
      activeFilters.push(`minimum total ${formatCurrency(minTotalValue)}`);
    }
    if (startDateParam) {
      orderQuery += " AND o.orderDate >= @startDate";
      request.input(
        "startDate",
        sql.DateTime,
        moment(startDateParam).startOf("day").toDate()
      );
      activeFilters.push(`from ${startDateParam}`);
    }
    if (endDateParam) {
      orderQuery += " AND o.orderDate <= @endDate";
      request.input(
        "endDate",
        sql.DateTime,
        moment(endDateParam).endOf("day").toDate()
      );
      activeFilters.push(`until ${endDateParam}`);
    }

    orderQuery += " ORDER BY o.orderDate DESC";
    const orders = await request.query(orderQuery);

    const statusLabel =
      activeFilters.length > 0
        ? `Showing ${
            orders.recordset.length
          } order(s) filtered by ${activeFilters.join(", ")}.`
        : `Showing ${orders.recordset.length} most recent order(s).`;
    res.write(`<p class="status-text">${statusLabel}</p>`);

    // If no orders found
    if (orders.recordset.length === 0) {
      res.write("<p>No orders found.</p>");
      res.write(pageShell.end);
      res.end();
      return;
    }

    /** For each order in the results
                Print out the order header information
                Write a query to retrieve the products in the order

                For each product in the order
                    Write out product information 
        **/
    for (let order of orders.recordset) {
      let orderDate = moment(order.orderDate).format("YYYY-MM-DD HH:mm:ss");
      let total = parseFloat(order.totalAmount).toFixed(2);

      res.write(`<section class="order-card">
                <h2>Order #${order.orderId}</h2>
                <div class="order-meta">
                    <span><strong>Customer:</strong> ${
                      order.customerName
                    } (ID: ${order.customerId})</span>
                    <span><strong>Date:</strong> ${orderDate}</span>
                    <span><strong>Total:</strong> ${formatCurrency(
                      total
                    )}</span>
                </div>
            `);

      // Retrieve products in this order
      const prodQuery = `
                SELECT p.productName, op.quantity, op.price
                FROM orderproduct op
                JOIN product p ON op.productId = p.productId
                WHERE op.orderId = @orderId
            `;
      const products = await pool
        .request()
        .input("orderId", sql.Int, order.orderId)
        .query(prodQuery);

      if (products.recordset.length > 0) {
        res.write(
          "<table class='product-table'><tr><th>Product</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr>"
        );
        for (let product of products.recordset) {
          let subtotal = (product.quantity * product.price).toFixed(2);
          res.write(`<tr>
                        <td>${product.productName}</td>
                        <td>${product.quantity}</td>
                        <td class="price">${formatCurrency(product.price)}</td>
                        <td class="price">${formatCurrency(subtotal)}</td>
                    </tr>`);
        }
        res.write("</table>");
      } else {
        res.write("<p>No products found for this order.</p>");
      }

      res.write("</section>");
    }
  } catch (err) {
    console.error(err);
    res.write(`<p>Error retrieving orders: ${err.message}</p>`);
  }

  res.write(pageShell.end);
  res.end();
});

module.exports = router;
