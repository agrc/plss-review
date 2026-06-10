set -e
cd "scripts"

pnpm local:seed-auth
pnpm local:seed-contacts
pnpm local:seed-submissions
pnpm local:seed-bulk-small
