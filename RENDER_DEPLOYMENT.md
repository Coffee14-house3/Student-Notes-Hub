# 🚀 How to Host Student and Teacher Pages Separately on Render

This repository is built with **multi-portal architecture**, allowing you to deploy:
1. **A dedicated Student Portal** (`PORTAL_MODE=student`)
2. **A dedicated Teacher Upload Studio** (`PORTAL_MODE=teacher`)
3. **Or both together** using 1-Click Render Blueprints (`render.yaml`)

---

## 🌟 Architecture Overview

| Portal | Intended Users | Features Included | Render Variable |
| :--- | :--- | :--- | :--- |
| **Student Hub** | Students, Classmates | Read all published notes, full-text search, take practice quizzes, AI Smart Tutor (RAG), view class announcements. All teacher controls/drafts/delete buttons are hidden. | `PORTAL_MODE=student` |
| **Teacher Studio** | Instructors, TAs | Upload PDF/Doc/Code/Markdown notes, edit titles/subjects, toggle Published/Draft status, merge multiple notes into master study guides, broadcast class notices, delete/duplicate notes. | `PORTAL_MODE=teacher` |

---

## 🔑 Environment Variables Setup on Render

You do **NOT** need a Gemini API key. The server directly supports **OpenRouter AI** and **Groq AI**!

### For the Student Portal:
- `PORTAL_MODE` = `student`
- `NODE_ENV` = `production`
- `OPENROUTER_API_KEY` = `your_openrouter_api_key` *(e.g. sk-or-v1-...)*
- `GROQ_API_KEY` = `your_groq_api_key` *(optional fallback)*

### For the Teacher Portal:
- `PORTAL_MODE` = `teacher`
- `NODE_ENV` = `production`
- `OPENROUTER_API_KEY` = `your_openrouter_api_key`
- `GROQ_API_KEY` = `your_groq_api_key` *(optional fallback)*

---

## ⚡ Method 1: 1-Click Automatic Deployment via Render Blueprint (Recommended)

Because this repository already contains an automated `render.yaml` Blueprint:

1. **Push this repository to GitHub**.
2. Go to your [Render Dashboard](https://dashboard.render.com/blueprints).
3. Click **New +** → **Blueprint**.
4. Connect your GitHub repository.
5. Render will automatically detect `render.yaml` and create **TWO separate web services**:
   - `aws-study-student-portal` (Student Study Hub)
   - `aws-study-teacher-studio` (Teacher Upload & Management Studio)
6. Enter your `OPENROUTER_API_KEY` (or `GROQ_API_KEY`) when prompted.
7. Click **Apply**. Render will build and deploy both services side-by-side!

---

## 🛠️ Method 2: Manual Step-by-Step Deployment (Deploy Independently)

If you prefer to create the services manually in the Render dashboard:

### 🎓 Step A: Deploy the Student Service

1. Go to [Render Dashboard](https://dashboard.render.com) and click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure the fields:
   - **Name**: `student-study-hub` (or `aws-notes-student`)
   - **Runtime**: `Node`
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. In **Environment Variables**, add:
   - `PORTAL_MODE` = `student`
   - `NODE_ENV` = `production`
   - `OPENROUTER_API_KEY` = *your_openrouter_api_key*
5. Click **Create Web Service**. 
   *Your live student site will be: `https://student-study-hub.onrender.com`.*

---

### 📚 Step B: Deploy the Teacher Service

1. Click **New +** → **Web Service** again.
2. Connect the **same GitHub repository**.
3. Configure the fields:
   - **Name**: `teacher-notes-studio` (or `aws-notes-teacher`)
   - **Runtime**: `Node`
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. In **Environment Variables**, add:
   - `PORTAL_MODE` = `teacher`
   - `NODE_ENV` = `production`
   - `OPENROUTER_API_KEY` = *your_openrouter_api_key*
5. Click **Create Web Service**.
   *Your live teacher site will be: `https://teacher-notes-studio.onrender.com`.*

---

## 🔗 Method 3: Direct URL Routing (Single Service Deployment)

If you deploy a single service with `PORTAL_MODE=both` (or leave `PORTAL_MODE` unset), both portals can be accessed directly using clean routes or query parameters:

- **Student Direct Link**: `https://your-app.onrender.com/student` or `?portal=student`
- **Teacher Direct Link**: `https://your-app.onrender.com/teacher` or `?portal=teacher`
- **Interactive Quiz Link**: `https://your-app.onrender.com/quiz`

---

## 🛡️ Key Settings Checklist

- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Port**: Render automatically injects `PORT=10000` (or `3000`), which `server.ts` listens to automatically via `process.env.PORT || 3000`.
- **Node Version**: Node 18 or 20 (standard on Render).
