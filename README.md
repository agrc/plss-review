# PLSS Monument Review

A website to view and approve to monument record sheet submissions

## Development

1. Start the website
   - `pnpm start`
1. Browse to the [development server](http://localhost:5173/) and login as `Staff Reviewer`

## Deployment

1. Create a site in firebase hosting
1. Enable multi tenancy in the Google Identity platform
1. Add credential created in apadmin to the tenant
1. Update the authentication blocking functions after deployment

## :robot: Dependabot

### Tailwind

The following dependencies need to stay at the tailwind v3 versions

| Package                           | Tailwind 3 | Tailwind 4 |
| --------------------------------- | ---------- | ---------- |
| tailwind-merge                    | v2         | v3         |
| tailwindcss                       | v3         | v4         |
| tailwindcss-react-aria-components | v1         | v2         |
