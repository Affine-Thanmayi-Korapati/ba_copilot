\# BA Copilot Deployment Guide



\## Overview



BA Copilot consists of:

\- React + TypeScript frontend

\- Node.js + Express backend

\- PostgreSQL database using Prisma

\- Gemini AI integration



\## Environment Variables



The application requires:



Frontend:

\- VITE\_API\_URL



Backend:

\- DATABASE\_URL

\- JWT\_SECRET

\- GEMINI\_API\_KEY



Never commit real environment values.



\## Database Setup



Install Prisma dependencies:



npm install



Generate Prisma client:



npx prisma generate



Apply database schema:



npx prisma db push



\## Production Build



Frontend:



npm run build



Backend:



npm run build



\## Deployment Flow



Frontend:

\- Deploy using Vercel



Backend:

\- Deploy using Railway or similar Node hosting



Database:

\- Use managed PostgreSQL provider such as Neon.



\## Verification Checklist



Before deployment verify:



\- Authentication works

\- Database connection succeeds

\- AI generation works

\- API endpoints respond correctly

\- Tests pass

