# Troubleshooting Scenarios

This project includes realistic scenarios designed to practice debugging end‑to‑end issues across the frontend and backend. The scenarios are subtle and intended to be discovered via normal exploration (network tab, logs, Sentry, etc.).

Scenarios included:

1) Advanced Filtering Autocomplete
- When the feature flag `ADVANCED_FILTERING` is enabled on the frontend, a debounced autocomplete search bar appears above the product list. The search calls a backend endpoint that, under certain conditions, generates a server‑side error. Investigate the request pattern, server logs, and database interactions to identify the source.

2) One‑Click Checkout with BorkedPay
- When the `EXPERIMENTAL_CHECKOUT` feature flag is enabled, a “one‑click” checkout option appears. The request simulates interaction with a payment provider and fails in a realistic way. Use the API response, logging, and error details to triage.

3) V2 UI Theming
- The V2 theme (controlled by `UNBORKED_V2`) introduces styling changes. Validate readability and theming for authentication and checkout screens.

Notes
- These are intentional training exercises; focus on reproducing, isolating, and confirming hypotheses with instrumentation and minimal surface changes.

