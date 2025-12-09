# DanHak Grocery - Executive Summary

## Purpose and Vision
- Full-stack reference for COSC 304 that demonstrates a modern grocery storefront powered by Microsoft SQL Server.
- Highlights how Node.js, Express, Handlebars, and Docker compose into a responsive browse-cart-checkout experience plus administrative tooling.
- Keeps the codebase close to production realities (auth, reporting, deployments) so students can extend the patterns in later coursework or internships.

## Feature Highlights
- **Storefront and navigation**: Hero landing page with CTAs, `/listprod` search and category filters, and inline product detail views.
- **Shopping cart**: Session-backed cart supports add/update/remove operations with validation and consistent totals across pages.
- **Checkout pipeline**: `/checkout` requires credential re-entry; `/order` validates, stores summaries and line items, refreshes totals, and clears the cart.
- **Operations dashboards**: `/listorder`, `/admin`, and `/ship` provide fulfillment history, daily sales analytics, and shipping simulation logic.
- **Deployment tooling**: `docker-compose.yml`, `Dockerfile`, and `setup/README.md` walk contributors through local and hosted (DigitalOcean) environments.

## Architecture Snapshot
- **Client**: Server-rendered Handlebars views with scoped CSS per route and minimal client-side scripting.
- **API layer**: Express router modules in `www/routes/*.js` isolate catalog, cart, order, authentication, admin, and shipping logic.
- **Data**: Microsoft SQL Server `orders` database seeded via `/ddl/SQLServer_orderdb.ddl`, plus optional MySQL schemas for labs.
- **Hosting**: Docker Compose orchestrates `node`, `cosc304-sqlserver`, and helper images; bind-mounting `www` accelerates iteration.
- **Security**: Session middleware, `auth.js` guard, credential validation on sensitive flows, and environment overrides for DB credentials.

## Operational Status
- Local development: `docker compose up -d` launches the stack; reseed quickly with `docker compose exec cosc304-sqlserver ... sqlcmd`.
- Hosted demo: DigitalOcean droplet mirrors the Compose workflow, fronted by PM2 at http://159.203.4.6 for stakeholder testing.
- Testing cadence: `TEST_GUIDE.md` outlines home, auth, catalog, cart, checkout, admin, and resilience scenarios for regression passes.

## Next Focus Areas
1. Add CI pipelines that lint and run smoke tests against a containerized SQL Server.
2. Replace the default session store with Redis to support multiple Node instances.
3. Harden shipping and inventory workflows with role-based access and audit logging.
4. Expand API documentation (eg. `FEATURES.md`, Swagger) to streamline onboarding.
