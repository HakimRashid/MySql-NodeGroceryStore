const express = require('express');
const router = express.Router();
const sql = require('mssql');
const moment = require('moment');

router.get('/', function(req, res, next) {
    res.setHeader('Content-Type', 'text/html');

    const orderId = parseInt(req.query.orderId);
        if (isNaN(orderId)) {
            res.write("<h2>Error: Missing or invalid order id.</h2>");
            return res.end();
        }

    (async function() {
        let transaction;

        try {
            let pool = await sql.connect(dbConfig);

            const orderCheck = await pool.request()
                .input("id", sql.Int, orderId)
                .query("SELECT orderId FROM ordersummary WHERE orderId = @id");

            if (orderCheck.recordset.length === 0) {
                res.write("<h2>Error: Order does not exist.</h2>");
                return res.end();
            }

            let transaction = new sql.Transaction(pool);
            await transaction.begin();

            const request = new sql.Request(transaction);

            const items = await request
                .input("id", sql.Int, orderId)
                .query(`
                    SELECT productId, quantity, price 
                    FROM orderproduct 
                    WHERE orderId = @id
                `);

            if (items.recordset.length === 0) {
                await transaction.rollback();
                res.write("<h2>No items found in order.</h2>");
                return res.end();
            }

            for (const item of items.recordset) {
                const invReq = new sql.Request(transaction);

                const inv = await invReq
                    .input("pid", sql.Int, item.productId)
                    .query(`
                        SELECT quantity 
                        FROM productinventory 
                        WHERE productId = @pid AND warehouseId = 1
                    `);

                if (inv.recordset.length === 0) {
                    await transaction.rollback();
                    res.write(`<p>Error: No inventory for product ${item.productId}.</p>`);
                    return res.end();
                }

                const available = inv.recordset[0].quantity;

                if (available < item.quantity) {
                    await transaction.rollback();
                    res.write(`
                        <h2>Shipment failed.</h2>
                        <p>Product id: ${item.productId}: required ${item.quantity}, available ${available}</p>
                    `);
                    return res.end();
                }

                res.write(`
                    <p>Ordered Product: ${item.productId}
                    Qty: ${item.quantity}
                    Previous inventory: ${available}
                    New inventory: ${available - item.quantity}</p>
                `);
            }

            await transaction.commit();

            res.write(`<h1>Shipment Processed Successfully!</h1>`);
            res.write(`<p>Order #${orderId} has been shipped.</p>`);
            res.write(`<p>Shipped ${items.recordset.length} item(s).</p>`);
            res.end();

        } catch (err) {
            if (transaction) await transaction.rollback();
            res.write("<h2>Error processing shipment.</h2>");
            res.write(err + "");
            res.end();
        }
    })();
});

module.exports = router;
