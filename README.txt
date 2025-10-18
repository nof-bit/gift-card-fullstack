Run:
1) Server
   cd server && cp .env.example .env && npm i && npm run prisma:generate && npm run prisma:migrate && npm run dev
2) Client (new terminal)
   cd client && npm i && npm run dev

Import CSV:
   Put CSVs in server/import (e.g. GiftCard.csv) then: cd server && npm run import:csv
