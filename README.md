SkillSouq 🛒🇧🇭
SkillSouq is a full-stack online service marketplace platform designed to connect local service providers, freelancers, and clients in Bahrain. Users can discover, list, and manage freelance gigs and professional services through an intuitive, interactive web interface.

✨ Key Features
Gig & Service Directory: Browse, filter, and search local skills, gigs, and freelance services.

User Authentication: Secure user registration, login, and profile management workflows.

Service Management: Service providers can create, edit, and publish customized service offerings.

Interactive Dashboard: Seamless client-to-provider interactions and listing controls.

Environment Security: Integrated .env configuration protecting database credentials and secrets.

🛠 Tech Stack
Framework: Next.js (React)

Language: TypeScript

Styling: Tailwind CSS

Backend / Database: Supabase

Environment Management: dotenv

📂 Project Structure
skill-souq/
├── public/           # Static assets, icons, and images
├── src/              # Application source code (components, pages, styles)
├── .env.example      # Template for environment variables
├── .gitignore        # Rules to exclude sensitive files and node_modules
├── components.json   # UI component configuration
├── package.json      # Frontend package dependencies & scripts
└── tsconfig.json     # TypeScript configuration settings

🚀 Local Setup & Installation
1. Clone the Repository
git clone https://github.com/Ashad-001/BahrainMarketplace-SkillSouq.git
cd BahrainMarketplace-SkillSouq

2. Install Dependencies
npm install

3. Environment Variables Configuration
Copy .env.example to create your local .env configuration file:
cp .env.example .env

Fill in your local Supabase credentials and API keys inside .env.

4. Run Development Server
npm run dev

Navigate to http://localhost:3000 in your browser to view the application live.
