# Frontend API client

- `types.ts`: Types aligned with the verified response fields of the latest available Django code. Committee KPI/dashboard are intentionally `JsonObject` until stable contracts are approved.
- `http.ts`: Fetch wrapper, headers, error handling, cookie/CSRF forwarding, dev-demo user setting, CSV opening.
- `endpoints.ts`: Page-level functions for the existing server routes. Import these rather than issuing fetch calls from every component.

Demo header only works with Django `DEBUG=True`; it does not constitute login. For offline work set `VITE_USE_MOCKS=true` (the sample App supports mock dashboard and notifications). Check `docs/PAGE_MAPPING.md` for missing page-specific data.
