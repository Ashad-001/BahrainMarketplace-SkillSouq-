# SkillSouq

SkillSouq is a full-stack online service marketplace platform designed to connect local service providers, freelancers, and clients in Bahrain.

Users can discover, list, and manage freelance gigs and professional services through an interactive web platform.

![SkillSouq Preview](./public/preview.png)

## Features

* **Gig & Service Directory** — Browse, search, and filter local skills, gigs, and freelance services.
* **User Authentication** — User registration, login, and profile management.
* **Service Management** — Create, edit, and publish service listings.
* **Interactive Dashboard** — Manage listings and interactions between clients and service providers.
* **Secure Configuration** — Environment variables are used to protect database credentials and application secrets.

## Tech Stack

* **Framework:** Next.js (React)
* **Language:** TypeScript
* **Styling:** Tailwind CSS
* **Backend & Database:** Supabase
* **Environment Management:** dotenv

## Project Structure

```text
skill-souq/
├── public/           # Static assets, icons, and images
├── src/              # Application source code
├── .env.example      # Environment variable template
├── .gitignore        # Ignored files and directories
├── components.json   # UI component configuration
├── package.json      # Dependencies and project scripts
└── tsconfig.json     # TypeScript configuration
```

## Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Ashad-001/BahrainMarketplace-SkillSouq.git
cd BahrainMarketplace-SkillSouq
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a local `.env` file from the provided template:

```bash
cp .env.example .env
```

Add the required Supabase credentials and API keys to `.env`.

> Do not commit your `.env` file or expose private credentials in the repository.

### 4. Run the Development Server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser to access the application.

## Project Status

This project is currently under development. Features and functionality may continue to change as the platform evolves.

## Author

**Ashad**

GitHub: https://github.com/Ashad-001

