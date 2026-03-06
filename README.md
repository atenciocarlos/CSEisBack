🏧 ATM Service Calls Manager
📖 Overview
ATM Service Calls Manager is a real-time, web app built for ATM field technicians. 

✨ Key Features
🤖 OCR: Google Cloud to auto-extract Task #, Status, Customer, Type, and ETA from images.
⚡ Real-Time Global Sync: Live /team-calls board. When a tech marks a job "Completed," it instantly disappears for everyone.
🛡️ Duplicate Prevention: Automatically checks the database and rejects duplicate Task # uploads with a toast notification.
📅 Auto-Archiving: A midnight cron job automatically clears the main board and logs tasks to a searchable /history page.
👥 Quick Auth: Frictionless alias/password login tailored for techs in the field.

🛠️ Tech Stack
Frontend: Next.js (App Router), React, Tailwind CSS
Backend: Next.js Server Actions, Node.js
Database: Prisma ORM

🔐 Security (DevSecOps)
Input Validation: Strict type-checking using Zod for all user inputs and AI outputs.
Secure Uploads: Enforced MIME-types (image/jpeg, image/png), 5MB size limits, and secure UUID renaming to prevent path traversal.
Hardened Backend: Protected Server Actions, strict HTTP Security Headers (CSP, X-Frame-Options), and native parameterized queries to prevent SQL injection.

🚀 Quick Start
# 1. Clone the repo
git clone [YOUR_REPO_URL]

# 2. Install dependencies
npm install

# 3. Setup environment variables in a .env file (DB & Auth secrets)

# 4. Sync the database
npx prisma db push

# 5. Configure the Google credential

# 6. Run the development server
npm run dev

Enjoy.
