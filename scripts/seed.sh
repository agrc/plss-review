set -e
cd "scripts"

pnpm local:seed-auth
pnpm local:seed-contacts
pnpm local:seed-submissions
pnpm run local:seed-bulk-large
