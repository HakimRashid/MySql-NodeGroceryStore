# DanHak Grocery – Test & Setup Guide

## 1. Prerequisites / Installing Docker
1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop) for your OS. During installation, enable the default virtualization features (Hyper-V on Windows, virtualization in BIOS/Apple Silicon on macOS).
2. After installation, launch Docker Desktop once so it initializes its background services. Confirm `docker --version` works in your terminal.
3. (Optional) Install [Visual Studio Code](https://code.visualstudio.com/Download) + the Docker extension; the `setup/README.md` file in this repo has annotated screenshots showing how to open the project folder.

## 2. Project Setup & Environment Boot
1. Clone or pull the repo, then open a terminal at the project root (`MySql-NodeGroceryStore`).
2. Start the containers:
   ```bash
   docker compose up -d
   ```
   This builds the Node image from `Dockerfile` and launches SQL Server + MySQL. The `www` folder is bind-mounted, so any code edits immediately reflect in the running container.
3. Seed the SQL Server database whenever you need a clean slate:
   ```bash
   docker compose exec cosc304-sqlserver /opt/mssql-tools18/bin/sqlcmd \
     -C -S localhost -U sa -P '304#sa#pw' \
     -i /scripts/SQLServer_orderdb.ddl
   ```
   (SQL Server listens on `localhost:1433`; the command above trusts the self-signed certificate with `-C`.)
4. Verify services:
   ```bash
   docker compose ps
   docker compose logs -f node   # optional tail
   ```
5. Visit [http://127.0.0.1](http://127.0.0.1) in your browser to load the home page. Stop everything later with `docker compose down` (add `-v` to wipe volumes).

## 3. Hosted Demo (DigitalOcean)
- Public URL: [http://159.203.4.6](http://159.203.4.6)
- Docker + PM2 run on a DigitalOcean droplet; deployments simply pull the latest repo, run `docker compose up -d --build`, and expose port 80. Use this URL for stakeholder reviews when local Docker is unavailable.

## 4. Simple Site Walkthrough
1. Visit [http://159.203.4.6](http://159.203.4.6) (or `http://127.0.0.1` locally) to load the home hero card with CTA buttons.
2. Click **Begin Shopping** to open `/listprod`, search for “chai,” and add an item to the cart via the “Add to cart” link.
3. Open the **Cart** link (or `/showcart`) to verify the item, tweak the quantity, and proceed to checkout.
4. At `/checkout`, enter customer ID `1` and password `test`, then place the order to see the confirmation card.
5. Use the **List All Orders** button to confirm the new order appears with product line items.
6. (Optional) Go to **Administrators**, log in as `arnold/test`, and review the sales report.

## 5. Test Accounts / Credentials
Use the seed users from `ddl/SQLServer_orderdb.ddl` or query them directly:
```bash
docker compose exec cosc304-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -C -S localhost -U sa -P '304#sa#pw' -d orders \
  -Q "SELECT customerId, userid, password FROM customer ORDER BY customerId;"
```
Common test users:

| customerId | userid  | password  |
| ---------- | ------- | --------- |
| 1          | arnold  | test      |
| 2          | bobby   | bobby     |
| 3          | candace | password  |
| 4          | darren  | pw        |
| 5          | beth    | test      |

Administrators use the same `userid/password` pair when logging in at `/login`.

## 6. Functional Test Checklist
Follow these passes after each change set. Clear the cart via the UI or restart the session between scenarios.

1. **Home Page**
   - Load `/` and confirm navigation links plus the “Welcome, {user}!” message once logged in (`views/index.handlebars`).
2. **Authentication Flow**
   - Visit `/customer` unauthenticated → expect redirect to `/login` with the warning banner.
   - Log in as `arnold/test` via `/login`.
   - Confirm `/customer` now shows the stored profile data.
   - Hit `/logout` and ensure the greeting on `/` reverts to the anonymous state.
3. **Product Search & Detail**
   - Navigate to `/listprod`.
   - Search for “chai” and filter by category to validate the query builder (`routes/listprod.js`).
   - Open the product link (e.g., `Alice Mutton`) to confirm `/product?id=16` displays description + image (or the fallback message).
4. **Cart Operations**
   - From `/listprod`, add two different products.
   - Open `/showcart` and update quantity for one product; ensure subtotal/total recalc.
   - Remove a product and verify the flash message + table update.
   - Attempt to set a negative quantity to confirm validation messaging.
5. **Checkout Validation**
   - With at least one item in the cart, go to `/checkout`.
   - Submit without a password → expect the “Please provide your account password” alert.
   - Submit with a valid customer ID but wrong password → expect “Invalid customer ID or password.”
   - Submit with valid credentials to place an order.
   - Verify the confirmation screen lists each item, quantity, and total, and that the cart is cleared (refresh `/showcart`).
6. **Order History**
   - Browse `/listorder` to ensure the most recent order appears.
   - Apply filters: set the customer ID you just used, a minimum total <$orderTotal, and a date range including today; confirm the results shrink accordingly.
7. **Admin Dashboard**
   - While logged in, open `/admin` and confirm the aggregated sales table renders.
   - View `/ship?orderId=<recentOrder>` to exercise the inventory/transaction logic (should show success + inventory deltas if sufficient stock).
8. **Error Handling Regression**
   - Stop SQL Server (`docker compose stop cosc304-sqlserver`) temporarily and hit `/listprod`; ensure the UI surfaces the connection error (then restart the container).

Track any deviations or regressions in your testing log.

## 7. Troubleshooting Tips
- **“service … is not running”** – bring the stack up with `docker compose up -d` or restart individual services.
- **Certificate errors from `sqlcmd`** – always pass `-C` when connecting to the container’s SQL Server.
- **Port conflicts** – stop old containers (`docker ps`, `docker rm -f <name>`).
- **Database drift** – rerun the seed script (step 2.3) for a clean state.

This guide, together with `FEATURES.md`, satisfies the documentation deliverables outlined in the assignment rubric. Keep both files updated as you add new features or testing scenarios.
