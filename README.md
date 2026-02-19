# ImageKit AI Pin Pro

A modern image generation and management platform that integrates advanced AI tools for creative design. This MVP focuses on a chat-driven workflow for generating and refining visual content.

## 🚀 MVP Features

- **Chat-Driven AI Generation**: Interaction with a reasoning LLM to create, search, and refine image ideas.
- **Image-to-Image Flux**: Advanced image modification using the **Flux-2** model on Cloudflare. Supporting:
  - **Subject Anchoring**: Vision analysis ensures original subjects are preserved during edits.
  - **Strength Control**: Adjustable denoising for subtle edits or radical transformations.
- **Vision Integration**: Automatic description of uploaded images using **Llama-4 Maverick** for contextual reasoning.
- **Inspiration Feed**: Integration with **Pexels API** to search for real-world photo inspiration.
- **Image Management**: 
  - Direct upload and storage via **ImageKit.io**.
  - Programmatic deletion of assets from both Database (MongoDB) and Storage.
- **User Authentication**: Secure access using **NextAuth.js**.

## 🏗️ Architecture & Tech Stack

- **Frontend**: Next.js (App Router), React, Tailwind CSS.
- **Backend**: Next.js API Routes (Edge-ready logic where applicable).
- **Database**: MongoDB with Mongoose ODM.
- **Storage**: ImageKit.io for optimized image serving and transformations.
- **AI Infrastructure**:
  - **OpenRouter**: Access to GPT-OSS-120B (Reasoning) and Llama-4 Maverick (Vision).
  - **Cloudflare AI**: Flux-2-Klein model for image-to-image tasks.
- **Authentication**: NextAuth.js.

## 📂 Folder Structure

```text
├── src/
│   ├── app/                 # Next.js pages and API routes
│   │   ├── api/             # Backend endpoints (Chat, Images, Auth)
│   │   ├── components/      # Shared UI components
│   │   └── create/          # Main AI design interface
│   ├── lib/
│   │   ├── llm/             # LLM logic and tool definitions
│   │   │   └── tools/       # Individual tool implementations (Flux, Pexels)
│   │   └── db.ts            # Database connection utility
│   ├── models/              # Mongoose schemas (Image, ChatHistory, User)
│   ├── types/               # TypeScript definitions
│   └── middleware.ts        # Route protection
├── public/                  # Static assets
└── .env                     # Configuration (API Keys, DB Uri)
```

## 🛠️ Getting Started

1. **Environment Variables**: Clone `.env.example` and provide:
   - `IMAGEKIT_PRIVATE_KEY` / `NEXT_PUBLIC_PUBLIC_KEY`
   - `OPENROUTER_API_KEY`
   - `ACCOUNT_ID` / `CLOUDEFARE_TOKEN` (Cloudflare)
   - `MONGODB_URI`

2. **Installation**:
   npm install
   ```

3. **Development**:

   npm run dev
   ```
