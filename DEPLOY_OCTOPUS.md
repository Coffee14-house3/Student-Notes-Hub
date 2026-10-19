# 🐙 Deploying with Octopus Cloud Free Trial (`octopus.app`)

This guide explains how to use your **Octopus Cloud 30-Day Free Trial** (`https://<your-org>.octopus.app`) to orchestrate and deploy your course platform's **micro-architecture** for your **16 MCA-204 students**.

---

## 🏛️ Micro-Architecture with Octopus Cloud

In this architecture, **Octopus Cloud** acts as your central deployment and release management hub:

```text
                               ┌──────────────────────────────────────────────┐
                               │     OCTOPUS CLOUD FREE TRIAL                 │
                               │     (https://<your-instance>.octopus.app)    │
                               │                                              │
                               │     - Centralized Environment Variables      │
                               │     - Automatic Release Versioning           │
                               │     - Multi-target CD Orchestration          │
                               └──────────────┬───────────────────────────────┘
                                              │
                    ┌─────────────────────────┴────────────────────────┐
                    ▼                                                  ▼
      ┌───────────────────────────┐                      ┌───────────────────────────┐
      │     OCTOPUS PROJECT 1     │                      │     OCTOPUS PROJECT 2     │
      │   Static Student/Teacher  │                      │   Compact Micro-Backend   │
      │        Frontend           │                      │      (Express / Node)     │
      └─────────────┬─────────────┘                      └─────────────┬─────────────┘
                    │                                                  │
                    ▼                                                  ▼
      ┌───────────────────────────┐                      ┌───────────────────────────┐
      │       GitHub Pages        │                      │    Render / Docker Cloud  │
      │   (Free Static CDN)       │                      │  (<80MB RAM Microservice) │
      │   - 16 Students Reader    │                      │  - Google Link Parser     │
      │   - AI Smart Tutor UI     │                      │  - ChromaDB Cloud Sync    │
      │   - Flashcards & Quizzes  │                      │  - Permanent Delete API   │
      └───────────────────────────┘                      └───────────────────────────┘
```

---

## 🚀 Step 1: Sign Up for Octopus Cloud Free Trial

1. Go to [https://octopus.com/start](https://octopus.com/start) and start a **30-day Free Trial**.
2. Enter your organization name to create your dedicated Octopus Cloud instance:
   `https://<your-org>.octopus.app`
3. Generate an API Key:
   - In Octopus Cloud, click your profile avatar (top right) → **Profile** → **API Keys** → **New API Key**.
   - Name it `GitHub-CI-CD` and save the token securely.

---

## 📦 Step 2: Configure Environments in Octopus Cloud

1. In Octopus Cloud, go to **Infrastructure** → **Environments**.
2. Create two environments:
   - **Production** (for live 16 students)
   - **Staging / Test** (optional, for instructor testing)

---

## 🛠️ Step 3: Project 1 — Static Frontend (`Course-Notes-Frontend`)

Because your 16 students access the site simultaneously, the frontend is compiled into pure static HTML/CSS/JS (`dist/`):

1. In Octopus Cloud, click **Projects** → **Add Project** → Name: `Course-Notes-Frontend`.
2. Under **Variables**, add:
   - `VITE_BACKEND_URL`: `https://<your-backend>.onrender.com`
   - `PORTAL_MODE`: `student` (or default to switchable)
3. In **Deployment Process** → **Add Step**:
   - Choose **Run a Script** (Bash / PowerShell) or **Deploy to GitHub Pages / AWS S3**.
   - Script example to push `./dist` to GitHub Pages:
     ```bash
     npm ci
     npm run build
     # Deploy dist/ to GitHub Pages or your static host
     ```

---

## ⚙️ Step 4: Project 2 — Compact Micro-Backend (`Course-Notes-Backend`)

The backend is ultra-compact (< 80MB RAM) and manages notes metadata, Google Link parsing, and ChromaDB:

1. In Octopus Cloud, click **Projects** → **Add Project** → Name: `Course-Notes-Backend`.
2. Under **Variables**, add your sensitive keys securely:
   - `CHROMA_API_KEY`: `ck-GcQZtcjL4HkCUrRnhdhvLC632JVA9YXHYw7PVoDWj8AM`
   - `CHROMA_TENANT`: `0f94ea0f-37ba-4909-88f1-4ee0f0e15dd7`
   - `CHROMA_DATABASE`: `rag-notes-application1`
   - `PORT`: `3000` (or `8080`)
   - `NODE_ENV`: `production`
   - `OPENROUTER_API_KEY` or `GEMINI_API_KEY`: (optional for AI tutor)
3. In **Deployment Process**, choose one of two options:
   - **Option A (Render Deploy Hook)**: Add a **HTTP - Send a Web Request** step that POSTs to Render's Deploy Hook URL.
   - **Option B (Docker / Cloud Run / VPS)**: Use the repository's `Dockerfile` to deploy a lightweight container to your target cloud.

---

## 🤖 Step 5: Automated GitHub Actions CI/CD to Octopus

The repository includes a ready-to-run GitHub Actions workflow at `.github/workflows/octopus-deploy.yml`:

```yaml
name: Trigger Octopus Deploy Release

on:
  push:
    branches: [ main ]

jobs:
  octopus_deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install Octopus CLI
        uses: OctopusDeploy/install-octopus-cli-action@v1
        with:
          version: latest

      - name: Create & Deploy Release in Octopus
        run: |
          octo create-release \
            --server="${{ secrets.OCTOPUS_SERVER_URL }}" \
            --apiKey="${{ secrets.OCTOPUS_API_KEY }}" \
            --project="Course-Notes-Backend" \
            --deployto="Production"
```

In your GitHub repository secrets:
- `OCTOPUS_SERVER_URL`: `https://<your-org>.octopus.app`
- `OCTOPUS_API_KEY`: Your Octopus API key generated in Step 1

---

## 👥 How Your 16 Students Access It

1. Provide your students the frontend URL:
   `https://<your-org>.github.io/<repo-name>/?portal=student`
2. All 16 students get:
   - Instant loading (<1s) from static CDN.
   - Live Google Drive / Docs notes displayed in an interactive sandbox without placing any streaming load on the backend.
   - Instant ChromaDB Cloud RAG query answers with sub-50ms vector retrieval.
3. When you delete a note as the teacher, Octopus-deployed backend tombstones and ChromaDB deletions ensure it is erased permanently across all storage layers.
