# PLSS Monument Review

[![Release Events](https://github.com/agrc/plss-review/actions/workflows/release.yml/badge.svg?event=release)](https://github.com/agrc/plss-review/actions/workflows/release.yml)

A website to view and approve to monument record sheet submissions

[Prod URL](https://plss-review.ugrc.utah.gov/)

[Dev URL](https://plss-review.dev.utah.gov/)

## Submission flow

The submission app creates the Firestore document and uploads the original PDF. This review app reads the document and PDF, records review decisions, and publishes approved submissions. The diagram shows the changes made to Firestore and Cloud Storage by each step.

```mermaid
flowchart TD
   submitter[Submission app] -->|creates| submission[(Firestore: submissions/ID)]
   submitter -->|uploads| reviewPdf[(Cloud Storage: under-review/BLM_POINT_ID/SUBMITTER_ID/ID.pdf)]

   submission --> review[Reviewer opens submission]
   reviewPdf --> review

   review -->|UGRC approves| ugrcApproved[Firestore update: status.ugrc.approved = true\nstatus.ugrc.reviewedAt / reviewedBy]
   review -->|UGRC rejects| ugrcRejected[Firestore update: status.ugrc.approved = false\nstatus.ugrc.comments / reviewedAt / reviewedBy]
   ugrcApproved --> updated{{onSubmissionUpdated}}
   ugrcRejected --> updated

   updated -->|approved| countyTasks[Queue auto-approval task\nQueue county notification email]
   updated -->|rejected| rejectedEmail[Queue rejection email]
   rejectedEmail --> rejected[Rejected\nPDF remains in under-review]

   countyTasks --> countyNotice[County receives PDF attachment\nand review notification]
   countyTasks --> autoApproval[After configured delay\nauto-approval task runs]
   countyNotice --> countyReview[County reviewer opens submission]
   reviewPdf --> countyReview

   countyReview -->|approves| countyApproved[Firestore update: status.county.approved = true\nstatus.county.reviewedAt / reviewedBy]
   countyReview -->|rejects| countyRejected[Firestore update: status.county.approved = false\nstatus.county.comments / reviewedAt / reviewedBy]
   autoApproval --> countyApproved
   countyApproved --> mrrc{metadata.mrrc?}
   mrrc -->|yes| stats[(Firestore: stats/mrrc-FISCAL_YEAR)]
   mrrc -->|no| ready
   stats --> ready[Both review approvals recorded]
   countyRejected --> countyRejectedEmail[Queue rejection email]
   countyRejectedEmail --> rejected

   ready --> publishCheck{Scheduled publisher\napproval + waiting period\npublished = false}
   publishCheck -->|not ready| wait[Remain in review\nPDF remains in under-review]
   publishCheck -->|ready| agol[Update ArcGIS feature service]
   agol --> movePdf[Move PDF to public path\ntiesheets/BLM_POINT_ID/GENERATED_NAME.pdf]
   movePdf --> published[Firestore update: published = true\nstatus.publishedAt / publishedBy\nmonument = public PDF path]

   classDef firestore fill:#e8f1ff,stroke:#2563eb,color:#172554
   classDef storage fill:#fff4df,stroke:#d97706,color:#431407
   classDef process fill:#eef7ee,stroke:#2f855a,color:#173b20
   class submission,stats,ugrcApproved,ugrcRejected,countyApproved,countyRejected,published firestore
   class reviewPdf,movePdf storage
   class review,updated,countyTasks,rejectedEmail,countyNotice,autoApproval,countyReview,mrrc,ready,publishCheck,wait,agol,rejected,countyRejectedEmail process
```

## Development

1. Install dependencies
   - `pnpm install`
   - `pnpm copy:arcgis`
1. Duplicate `.env` as `.env.local` with local secrets.
1. Install functions dependencies
   - `cd functions`
   - `pnpm install`
1. Duplicate `functions/.secrets` as `.secrets.local` with local secrets.
1. Start the website
   - `pnpm start`
   - Windows: `pnpm start-win`
     - **Note:** If restarting pnpm, be sure to close the `cmd` windows that it opens first.
1. Log in via Firebase in order to access the `Staff Reviewer` user
   - `pnpx firebase-tools login --reauth`
   - Select A and Yes, hit Enter, and click Allow on the browser popup
1. Browse to the [development server](http://localhost:5173/) and login as `Staff Reviewer`

## Deployment

1. Create a site in firebase hosting
1. Enable multi tenancy in the Google Identity platform
1. Add credential created in apadmin to the tenant
1. Update the authentication blocking functions after deployment
1. Allow the storage rules to query the database in the firebase console

GitHub Actions installs dependencies for the standalone `functions/` package before Firebase deploys, and `firebase.json` continues to use `functions` as the deploy source for both local development and CI.

## User Management

To add new users:

1. Ask the user to register on plss.utah.gov (or plss.dev.utah.gov in dev)
1. Find the user's record in the submitters collection in firebase and update the elevated field to be true.

## :robot: Dependabot

### Tailwind

The following dependencies need to stay at the tailwind v3 versions

| Package                           | Tailwind 3 | Tailwind 4 |
| --------------------------------- | ---------- | ---------- |
| tailwind-merge                    | v2         | v3         |
| tailwindcss                       | v3         | v4         |
| tailwindcss-react-aria-components | v1         | v2         |

## Attribution

This project was developed with the assistance of [GitHub Copilot](https://github.com/features/copilot).
