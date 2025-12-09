# DanHak Grocery - System Features

## 1. Commerce Experience
* Landing hero and CTA rail  
  *Status*: Complete  
  *Notes*: Handlebars home page surfaces Begin Shopping, View Cart, and Admin shortcuts.  
  *Files*: `www/views/index.handlebars`, `www/routes/index.js`
* Catalog search and category filter  
  *Status*: Complete  
  *Notes*: `/listprod` uses parameterized LIKE filters, displays counts, links to `/product`.  
  *Files*: `www/routes/listprod.js`, `product` table
* Product detail fallback  
  *Status*: Complete  
  *Notes*: `/product?id=##` renders descriptions/images or a friendly fallback message.  
  *Files*: `www/routes/product.js`, `www/routes/displayImage.js`
* Media handling  
  *Status*: Complete  
  *Notes*: `/displayImage` streams blobs or falls back to `/public/img/*.jpg`.  
  *Files*: `www/routes/displayImage.js`
* Accessibility and styling  
  *Status*: Complete  
  *Notes*: Scoped CSS on each route uses contrast-safe palettes and semantic markup.  
  *Files*: Inline `<style>` blocks inside route modules

## 2. Cart & Checkout
* Session cart store  
  *Status*: Complete  
  *Notes*: `req.session.productList` persists items keyed by productId until checkout.  
  *Files*: `www/routes/addcart.js`, `www/routes/showcart.js`
* Quantity management  
  *Status*: Complete  
  *Notes*: `/showcart` offers inline update/remove with validation (no negatives, zero deletes).  
  *Files*: `www/routes/showcart.js`
* Credential-gated checkout  
  *Status*: Complete  
  *Notes*: `/checkout` collects customerId/password before redirecting to `/order`.  
  *Files*: `www/routes/checkout.js`
* Order persistence  
  *Status*: Complete  
  *Notes*: `/order` validates, inserts `ordersummary` + `orderproduct`, recalculates totals, prints confirmation.  
  *Files*: `www/routes/order.js`, `ordersummary`, `orderproduct`
* Cart lifecycle  
  *Status*: Complete  
  *Notes*: Successful checkout clears cart/password; empty carts surface gentle alerts.  
  *Files*: `www/routes/order.js`, `www/routes/showcart.js`

## 3. Account & Authentication
* Login and logout  
  *Status*: Complete  
  *Notes*: `/login` posts to `/validateLogin`, storing `{userid, customerId}`; `/logout` clears session state.  
  *Files*: `www/routes/login.js`, `www/routes/validateLogin.js`, `www/routes/logout.js`
* Customer dashboard  
  *Status*: Complete  
  *Notes*: `/customer` renders profile details for authenticated users and redirects others to `/login`.  
  *Files*: `www/routes/customer.js`, `www/auth.js`
* Auth guard utility  
  *Status*: Complete  
  *Notes*: `auth.checkAuthentication` centralizes route protection and friendly redirect messaging.  
  *Files*: `www/auth.js`, consumer routes

## 4. Order Management & Admin
* Order history filters  
  *Status*: Complete  
  *Notes*: `/listorder` filters by customer, date range, and minimum total while inlining line items.  
  *Files*: `www/routes/listorder.js`
* Admin daily sales  
  *Status*: Complete  
  *Notes*: `/admin` aggregates sales totals per day for authenticated staff.  
  *Files*: `www/routes/admin.js`
* Shipping console  
  *Status*: Complete  
  *Notes*: `/ship` toggles ship state, decrements inventory, and reports success/failures.  
  *Files*: `www/routes/ship.js`
* Data loading  
  *Status*: Complete  
  *Notes*: `/loaddata` hydrates SQL Server using the canonical lab dataset for quick resets.  
  *Files*: `www/routes/loaddata.js`, `/ddl/SQLServer_orderdb.ddl`

## 5. Hosting & Containerization
* Dockerized dev stack  
  *Status*: Complete  
  *Notes*: Compose orchestrates Node + SQL Server with bind mounts for live reloads.  
  *Files*: `docker-compose.yml`, `Dockerfile`
* Seed scripts and fixtures  
  *Status*: Complete  
  *Notes*: `ddl/` stores SQL scripts for SQL Server/MySQL labs; README explains execution.  
  *Files*: `/ddl/*.sql`, `README.md`, `setup/README.md`
* Hosted demo droplet  
  *Status*: Complete  
  *Notes*: DigitalOcean droplet mirrors Compose workflow (PM2 + http://159.203.4.6).  
  *Files*: `TEST_GUIDE.md`, deployment notes
* Documentation set  
  *Status*: Ongoing  
  *Notes*: `README.md`, `TEST_GUIDE.md`, walkthrough, and this feature list provide onboarding context.  
  *Files*: repo docs

## 6. Known Gaps / Backlog Candidates
* Replace MemoryStore sessions with Redis for high availability.
* Add automated unit and integration tests plus CI hooks.
* Harden credential storage (salted hashes) and enforce HTTPS-only cookies in production.
* Add role-based access for `/ship` and upcoming analytics endpoints.
