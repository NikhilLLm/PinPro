# ReelsPro: Project Structure & Flow

This document explains how the ReelsPro application is structured and how data flows through the system.

## 📁 Project Structure

```text
src/
├── app/                  # Next.js App Router (Pages & API Routes)
│   ├── api/              # Backend API Endpoints (Next.js Route Handlers)
│   │   ├── auth/         # NextAuth.js configuration for login/signout
│   │   └── videos/       # CRUD operations for video reels
│   ├── components/       # Reusable UI Components
│   │   ├── FileUpload.tsx    # Handles ImageKit video uploads
│   │   ├── Header.tsx        # Navigation and User Menu
│   │   ├── VideoFeed.tsx     # Displaying the grid of videos
│   │   └── VideoComponent.tsx # Individual video card logic
│   ├── login/            # Login page
│   ├── register/         # User registration page
│   ├── upload/           # Video upload dashboard
│   ├── globals.css       # Global styles (Tailwind + Custom CSS)
│   ├── layout.tsx        # Root layout (provides session and notifications)
│   └── page.tsx          # Home page (Conditional Landing/Dashboard)
├── lib/                  # Shared Utilities & Clients
│   ├── auth.ts           # NextAuth.js shared options
│   ├── db.ts             # MongoDB connecting logic
│   └── api-client.ts     # Frontend fetch wrapper for our API
├── models/               # Mongoose Models (Database Schemas)
│   ├── User.ts           # User profile and credentials
│   └── Videos.ts         # Video metadata (URLs, titles, etc.)
└── types/                # TypeScript type definitions
```

---

## 🔄 Core Project Flow

### 1. Authentication Flow
- **Registration**: `app/register/page.tsx` collects user details and calls `api/auth/register`. The password is hashed, and the user is saved to MongoDB.
- **Login**: `app/login/page.tsx` uses `next-auth` to verify credentials. Upon success, a session cookie is created.
- **Header States**: `Header.tsx` uses `useSession` to decide whether to show "SignIn" or "DashBoard/Upload" links.

### 2. Video Upload Flow
- **Upload Page**: User goes to `app/upload/page.tsx`.
- **ImageKit Transfer**: The `FileUpload.tsx` component sends the raw file directly to **ImageKit.io** for storage and optimization.
- **Database Entry**: Once ImageKit returns a `videoUrl`, the `VideoUploadForm.tsx` sends that URL + metadata (title, description) to our internal `api/videos` endpoint.
- **Persistence**: The backend saves the video details into the **MongoDB** database.

### 3. Display Flow (The Feed)
- **Fetching**: The Home Page (`page.tsx`) calls `apiClient.getVideos()`.
- **Database Fetch**: The backend queryies the MongoDB `Videos` collection.
- **Rendering**: The `VideoFeed.tsx` loops through the videos, and `VideoComponent.tsx` uses the ImageKit SDK to render optimized videos.

---

## 🛠️ Key File Responsibilities

| File | Purpose |
| :--- | :--- |
| `globals.css` | Defines the "Simple Dark" theme and glassmorphism utilities. |
| `api-client.ts` | The single source of truth for making frontend API requests. |
| `Header.tsx` | Manages the layout proportions and user navigation links. |
| `db.ts` | Ensures a single, stable connection to the MongoDB database. |
| `page.tsx` | The logic hub that switches between the Landing Page and the Dashboard. |
```
