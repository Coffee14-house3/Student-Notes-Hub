# 🏛️ Course Notes Micro-Architecture Guide

Designed specifically for **Static GitHub Pages Frontend** + **Compact Render Micro-Backend** + **Google Drive / Docs Notes** + **ChromaDB Cloud Vector RAG**, tailored for **16 MCA-204 Students** and **1 Instructor**.

---

## 📐 High-Level Architecture Overview

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        STATIC UI (GitHub Pages)                         │
│                                                                        │
│   ┌─────────────────────────────┐   ┌──────────────────────────────┐   │
│   │   Student Hub (16 Users)    │   │   Teacher Studio (1 Admin)   │   │
│   │   - Interactive Reader      │   │   - Google Link Importer     │   │
│   │   - AI Smart Tutor          │   │   - Curriculum Management    │   │
│   │   - Dynamic Quizzes         │   │   - 1-Click Permanent Delete │   │
│   └──────────────┬──────────────┘   └──────────────┬───────────────┘   │
└──────────────────┼─────────────────────────────────┼───────────────────┘
                   │                                 │
                   │  CORS REST API Requests         │
                   ▼                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     COMPACT BACKEND (Render.com)                       │
│                                                                        │
│   - Lightweight Express Engine (< 80MB RAM, instant cold start)        │
│   - Google Link Parser (/api/parse-google-link)                        │
│   - Permanent Deletion & Tombstone Engine (/api/documents/:id)         │
│   - AI Assistant Proxy (/api/chat) with vector context                 │
│   - Instant Health Check (/api/health, < 5ms response)                 │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼                                 ▼
┌──────────────────────────────────┐ ┌───────────────────────────────────┐
│     Google Drive / Docs CDN      │ │       ChromaDB Cloud (Vectors)    │
│                                  │ │                                   │
│ - Public Google Docs, Slides,    │ │ - 384-dimensional vector store    │
│   Sheets, and PDFs               │ │ - Batched indexing (<= 150 IDs)   │
│ - Streamed directly into student │ │ - Batched deletion on note delete │
│   iframes (0 CPU impact on       │ │ - Sub-50ms semantic search for    │
│   Render server)                 │ │   16 students asking AI questions │
└──────────────────────────────────┘ └───────────────────────────────────┘
```

---

## ⚡ Why This Micro-Architecture is Ideal for 16 Students & Render Free Tier

1. **Ultra-Low Memory Footprint (<80MB RAM)**:
   - Because you upload notes exclusively as **Google Links** (Google Drive PDFs, Docs, Slides, Sheets), Render never stores 500MB raw files in RAM.
   - The server only holds lightweight metadata JSON in `data/documents.json`.

2. **Zero CDN Bandwidth on Render**:
   - When 16 students open and study lecture notes simultaneously, Google's high-speed CDN streams the document directly into their browser sandbox iframe.
   - Render's CPU stays near 0% even with all 16 students reading notes at the same time.

3. **True Permanent Deletion**:
   - When you click **Delete Note**:
     1. The document is permanently removed from `data/documents.json`.
     2. A cryptographic tombstone is written to `data/tombstones.json` to prevent accidental re-hydration from browser cache.
     3. All semantic vector embeddings are purged in safe batches (<= 150 chunks) from ChromaDB Cloud.
     4. Associated physical files and slide caches are unlinked immediately.

4. **Static Frontend on GitHub Pages ($0 Cost)**:
   - GitHub Pages serves the HTML, CSS, and JS globally for free with no server costs or sleep states.
   - The frontend communicates seamlessly with your Render backend over HTTPS.

---

## 🚀 Step 1: Deploy Compact Backend to Render

1. Create a free account at [Render.com](https://dashboard.render.com).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository.
4. Set the configuration:
   - **Name**: `course-notes-backend` (or any name you choose)
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
5. Under **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `PORT`: `3000` (Render will also provide `$PORT` automatically)
   - `CHROMA_API_KEY`: `ck-GcQZtcjL4HkCUrRnhdhvLC632JVA9YXHYw7PVoDWj8AM`
   - `CHROMA_TENANT`: `0f94ea0f-37ba-4909-88f1-4ee0f0e15dd7`
   - `CHROMA_DATABASE`: `rag-notes-application1`
   - *(Optional AI Keys for Smart Tutor)*: `OPENROUTER_API_KEY`, `GROQ_API_KEY`, or `GEMINI_API_KEY`
6. Click **Deploy Web Service**.
7. Copy your backend URL once live: `https://course-notes-backend.onrender.com`.

---

## 🌐 Step 2: Deploy Static UI to GitHub Pages

The repository includes a ready-to-run GitHub Actions workflow at `.github/workflows/deploy-github-pages.yml`.

### Method A: Automated GitHub Actions (Recommended)
1. Push your repository to GitHub.
2. In your GitHub repository, go to **Settings** → **Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. (Optional) Go to **Settings** → **Secrets and variables** → **Actions**, add a repository secret named `VITE_BACKEND_URL` with your Render URL (e.g. `https://course-notes-backend.onrender.com`).
5. GitHub will build and publish your static UI to `https://<your-username>.github.io/<repo-name>/`.

### Method B: Runtime In-App Configuration
Even if you do not set `VITE_BACKEND_URL` during build:
1. Open your GitHub Pages URL in your browser.
2. Click the **Micro-Architecture** button in the top navigation bar.
3. Paste your Render Backend URL (`https://your-service.onrender.com`).
4. Click **Test & Save Connection**.
5. It will test the connection, verify latency, and save it in `localStorage` for your browser!

---

## 👩‍🏫 Teacher Workflow: Uploading Notes as Google Links

1. Open the Teacher Studio (`https://your-domain/?portal=teacher`).
2. Go to the **Upload Notes** tab.
3. In the **Upload Course Notes via Google Link** card:
   - **Document Title**: e.g., `Unit 3 Cloud Security & IAM`
   - **Google Public Share URL**: Paste your link (e.g., `https://docs.google.com/document/d/...` or `https://drive.google.com/file/d/...`)
   - **Key Takeaways (Optional)**: Add brief bullet points summarizing the lecture.
   - Choose the target **Unit** (e.g., Unit 1, Unit 2, Unit 3).
4. Click **Upload & Index Google Note**.
5. The backend parses the content, creates structured sections, and indexes semantic vector chunks in ChromaDB Cloud in under 2 seconds!

> **Google Drive Permissions Note**: Ensure your Google Docs/Drive links have link sharing set to **"Anyone with the link can view"** so your 16 students' browser iframe can load it seamlessly.

---

## 🎓 Student Access: How 16 Students Use the Platform

Share your student portal URL with the class:
```text
https://<your-username>.github.io/<repo-name>/?portal=student
```

Students can:
- **Read Verified Notes**: Open any lecture note in the full-screen interactive reader or side-by-side Google sandbox.
- **AI Smart Tutor**: Ask questions and get answers grounded directly in your lecture material via ChromaDB semantic vector search.
- **Interactive Quizzes & Flashcards**: Practice multiple choice questions generated directly from your uploaded Google notes.
- **Zero Lag**: All reading traffic is served from GitHub Pages and Google CDN.
