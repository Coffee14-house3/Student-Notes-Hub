# Deploying Separate Student & Teacher Websites on Render

This project supports **two separate, dedicated websites** from the same GitHub repository:
1. **Teacher Upload Studio** (`PORTAL_MODE=teacher`) — Allows instructors to upload PDF/DOCX/PPT notes, manage course units, create announcements, and index into ChromaDB vector database.
2. **Student Notes Hub** (`PORTAL_MODE=student`) — Clean, distraction-free student portal with interactive note reading, AI Smart Tutor (RAG), dynamic quizzes, and flashcards. When connected to the Teacher service, it automatically receives all published notes in real-time.

---

## Method 1: Render Blueprints (Recommended - 1-Click)

The repository includes a ready-to-deploy `render.yaml` blueprint.

1. Push your repository to **GitHub**.
2. Go to your [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Blueprint**.
4. Connect your GitHub repository.
5. Render will automatically detect `render.yaml` and configure:
   - `course-teacher-portal`
   - `course-student-portal` (automatically linked to the Teacher service URL)
6. Add your API keys (`OPENROUTER_API_KEY` and/or `GROQ_API_KEY`) in the environment variables prompt.
7. Click **Apply**. Both websites will be built and deployed!

---

## Method 2: Manual Setup (Two Web Services)

If you prefer to configure each service manually in the Render UI:

### Service 1: Teacher Website

1. In Render Dashboard, click **New +** → **Web Service**.
2. Select your repository.
3. Configure the service:
   - **Name**: `my-course-teacher` (or any name you want)
   - **Runtime**: `Node`
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. In the **Environment Variables** section, add:
   - `PORTAL_MODE`: `teacher`
   - `VITE_PORTAL_MODE`: `teacher`
   - `NODE_ENV`: `production`
   - *(AI Keys)*: `OPENROUTER_API_KEY` and/or `GROQ_API_KEY`
5. Click **Create Web Service**.
6. Note the published URL (e.g., `https://my-course-teacher.onrender.com`).

---

### Service 2: Student Website

1. In Render Dashboard, click **New +** → **Web Service**.
2. Select the **same** repository.
3. Configure the service:
   - **Name**: `my-course-student` (or any name you want)
   - **Runtime**: `Node`
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. In the **Environment Variables** section, add:
   - `PORTAL_MODE`: `student`
   - `VITE_PORTAL_MODE`: `student`
   - `NODE_ENV`: `production`
   - `TEACHER_API_URL`: `https://my-course-teacher.onrender.com` *(use your Teacher service URL from Step 1)*
   - *(Optional AI Keys)*: If left blank, the student portal automatically routes AI questions to your Teacher service.
5. Click **Create Web Service**.

---

## How Automatic Portal Detection Works

The app automatically detects the mode through any of these methods:
- **Environment Variable**: `PORTAL_MODE=student` or `PORTAL_MODE=teacher`
- **Hostname**: If your domain or Render URL contains `teacher` (e.g. `teacher-notes.onrender.com`), it loads the Teacher Portal. If it contains `student` (e.g. `student-notes.onrender.com`), it loads the Student Portal.
- **Path Routing**: Visiting `/teacher` or `/student`
- **Query Parameter**: Visiting `?portal=teacher` or `?portal=student`

---

## Environment Variables Reference

| Variable | Required In | Purpose |
|---|---|---|
| `PORTAL_MODE` | Both | Set to `student` on student site, `teacher` on teacher site |
| `VITE_PORTAL_MODE` | Both | Injected during build time (`student` or `teacher`) |
| `TEACHER_API_URL` | Student Site | URL of the teacher service (enables instant note sync) |
| `OPENROUTER_API_KEY` | Optional | AI Smart Tutor & Flashcards quiz generation |
| `GROQ_API_KEY` | Optional | Fast Llama 3.3 70B & Mixtral inference for instant chat |
| `CHROMA_API_KEY` | Optional | ChromaDB Cloud vector storage |
| `DATA_DIR` | Optional | Directory for persistent JSON document storage (defaults to `./data`) |

---

## File Persistence & Reload Reliability

Your uploaded notes and materials will **never disappear upon page refresh or reload**:

1. **Browser Dual-Layer Persistence (IndexedDB + localStorage)**:
   - When you upload files in the Teacher studio, they are stored directly in your browser's persistent **IndexedDB** engine (which supports high-capacity storage for full PDFs, slides, and notes).
   - When you or your students reload the page, all documents and announcements load instantaneously (0ms) from local cache with zero flicker.

2. **Server Disk Persistence**:
   - The backend stores documents in `./data/documents.json`, announcements in `./data/announcements.json`, and raw PDF files in `./data/pdfs/`.

3. **Smart Re-hydration & Auto-Sync**:
   - If Render restarts a container or wakes up from sleep on the free tier, the client application automatically detects any missing documents on the server and re-hydrates the server storage (`/api/documents/sync`) in the background.

4. **Permanent Cloud Storage (Render Disks - Optional)**:
   - On Render Starter plan ($7/mo), you can attach a persistent Render Disk to `course-teacher-portal` (e.g. Mount Path: `/opt/render/project/src/data`, Size: 1 GB) so server files persist permanently even across code redeployments.

