# CollabDocs

A production-ready, premium SaaS application built for high-performance teams to collaborate in real-time with absolute precision. Developed by **Veltora IT Solution**.

## Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Zustand, React Router, Framer Motion, Lucide Icons
- **Backend:** Node.js, Express.js
- **Artificial Intelligence:** Google Gen AI SDK (`@google/genai` with server-side proxy)
- **Authentication:** Firebase Authentication with soft graceful fallback capability

## High-Fidelity Features

1. **Award-Winning Landing Page:** Beautiful obsidian grid, live cursor moving simulations, responsive sticky navigation, testimonials, pricing cards, and glassmorphism FAQ.
2. **Animated Splash Screen:** Soft pulsating logo, custom progress updates, and session routing check.
3. **Workspace Dashboard:** Bento grid statistics, document nodes manager, multi-view markdown editor, active collaborator head avatars, and revision history.
4. **Google Gemini Copilot:** Secure server-side proxy model query with pre-seeded architectural outlines and custom formatting commands.

## Installation & Launch

1. Clone or extract the CollabDocs files.
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Set your environment variables in `.env` (or copy from `.env.example`):
   ```env
   GEMINI_API_KEY="YOUR_KEY_HERE"
   ```
4. Boot the server and client dev modules on unified port `3000`:
   ```bash
   npm run dev
   ```
