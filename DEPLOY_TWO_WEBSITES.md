# 🌐 Guide: Deploying Two Separate Websites (Student & Teacher)

This guide provides step-by-step instructions to deploy **two independent websites** powered by the same lightweight micro-backend:
1. 🎓 **Website 1 (Student Web App)**: Exclusively for your **16 MCA-204 students** to read Google Docs/Drive lecture notes, ask the AI Smart Tutor questions via ChromaDB RAG, and take practice quizzes. It has **all teacher controls completely stripped and locked out**.
2. 👩‍🏫 **Website 2 (Teacher Web App)**: Exclusively for the **Instructor / Teacher** to upload Google Drive/Docs links, trigger ChromaDB Cloud semantic indexing, manage unit categories, post announcements, and permanently delete notes.

Both websites talk securely to your **single compact micro-backend** running on Render, Docker, or Octopus Cloud (< 80MB RAM).

---

## 🏛️ Dual-Website Micro-Architecture Diagram

```text
       ┌──────────────────────────────────────────────────────────────┐
       │                OCTOPUS CLOUD / GITHUB ACTIONS                │
       │                   CI/CD Deployment Engine                    │
       └──────────────┬───────────────────────────────┬───────────────┘
                      │                               │
        Deploy Site 1 │                 Deploy Site 2 │
                      ▼                               ▼
       ┌──────────────────────────────┐┌──────────────────────────────┐
       │      WEBSITE 1: STUDENT      ││      WEBSITE 2: TEACHER      │
       │  (e.g., student-notes.app)   ││  (e.g., teacher-notes.app)   │
       │                              ││                              │
       │  - 16 Students Simultaneous  ││  - Instructor Studio Only    │
       │  - Zero Teacher Controls     ││  - Google Drive/Docs Importer│
       │  - Google Docs Viewer Iframe ││  - ChromaDB Semantic Indexer │
       │  - ChromaDB AI Smart Tutor   ││  - Permanent Deletion Engine │
       │  - Quizzes & Flashcards      ││  - Preview Student View      │
       └──────────────┬───────────────┘└──────────────┬───────────────┘
                      │                               │
                      │ CORS REST API                 │ CORS REST API
                      ▼                               ▼
       ┌──────────────────────────────────────────────────────────────┐
       │                  SHARED MICRO-BACKEND API                    │
       │               (Render.com / Docker Cloud)                    │
       │                                                              │
       │   - Memory: < 80MB RAM                                       │
       │   - Persistent Notes Store (data/documents.json)             │
       │   - Tombstone Eradication Engine (data/tombstones.json)      │
       │   - ChromaDB Cloud RAG Query Proxy (/api/chat)               │
       │   - Public Health Ping (/api/health, < 5ms)                  │
       └──────────────┬───────────────────────────────┬───────────────┘
                      │                               │
                      ▼                               ▼
       ┌──────────────────────────────┐┌──────────────────────────────┐
       │   GOOGLE DRIVE / DOCS CDN    ││    CHROMADB CLOUD VECTORS    │
       │   Direct Student Iframe CDN  ││    384-d Embeddings Store    │
       └──────────────────────────────┘└──────────────────────────────┘
```

---

## 📦 How to Build the Two Separate Websites

The repository includes pre-configured commands in `package.json`:

```bash
# Build Website 1 (Student Website only) -> outputs to ./dist-student
npm run build:student

# Build Website 2 (Teacher Website only) -> outputs to ./dist-teacher
npm run build:teacher

# Build both websites sequentially
npm run build:dual
```

### Environment Variables for Each Website:

| Variable | Website 1 (Student) | Website 2 (Teacher) |
| :--- | :--- | :--- |
| `VITE_PORTAL_MODE` | `student` | `teacher` |
| `VITE_STANDALONE` | `true` | `true` |
| `VITE_BACKEND_URL` | `https://your-backend.onrender.com` | `https://your-backend.onrender.com` |

When `VITE_PORTAL_MODE=student` and `VITE_STANDALONE=true` are set, the build engine automatically **removes the "Teacher Studio" switch button** and locks the application into student-only mode.

---

## 🐙 Option A: Deploying with Octopus Cloud Free Trial (`octopus.app`)

Octopus Cloud makes managing two distinct websites and a backend straightforward.

### 1. In Octopus Cloud (`https://<your-org>.octopus.app`):
1. Navigate to **Projects** → Create 3 Projects:
   - `Student-Web-App` (Frontend for your 16 students)
   - `Teacher-Web-App` (Frontend for instructor)
   - `Course-Micro-Backend` (Shared Node.js microservice)

### 2. Configure Project 1 (`Student-Web-App`):
- **Variables**:
  - `VITE_PORTAL_MODE`: `student`
  - `VITE_STANDALONE`: `true`
  - `VITE_BACKEND_URL`: `https://course-micro-backend.onrender.com`
- **Deployment Process**:
  - Step 1: Run build script:
    ```bash
    npm ci
    npm run build:student
    # Deploy dist-student to your student host (GitHub Pages, AWS S3, or Cloudflare)
    ```

### 3. Configure Project 2 (`Teacher-Web-App`):
- **Variables**:
  - `VITE_PORTAL_MODE`: `teacher`
  - `VITE_STANDALONE`: `true`
  - `VITE_BACKEND_URL`: `https://course-micro-backend.onrender.com`
- **Deployment Process**:
  - Step 1: Run build script:
    ```bash
    npm ci
    npm run build:teacher
    # Deploy dist-teacher to your instructor host
    ```

### 4. Configure Project 3 (`Course-Micro-Backend`):
- Deploy container or trigger Render Deploy Hook with ChromaDB Cloud credentials:
  - `PORT`: `3000`
  - `NODE_ENV`: `production`
  - `CHROMA_API_KEY`: `ck-GcQZtcjL4HkCUrRnhdhvLC632JVA9YXHYw7PVoDWj8AM`
  - `CHROMA_TENANT`: `0f94ea0f-37ba-4909-88f1-4ee0f0e15dd7`
  - `CHROMA_DATABASE`: `rag-notes-application1`

---

## 🐙 Option B: Deploying Two Websites with GitHub Pages

You can host both websites on GitHub Pages using either two repositories, two subpaths, or two branches.

### Workflow Example (`.github/workflows/deploy-two-websites.yml`):

```yaml
name: Deploy Two Websites to GitHub Pages

on:
  push:
    branches: [ main ]

permissions:
  contents: write
  pages: write
  id-token: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build Student Website
        env:
          VITE_PORTAL_MODE: student
          VITE_STANDALONE: "true"
          VITE_BACKEND_URL: ${{ secrets.RENDER_BACKEND_URL }}
        run: npm run build:student

      - name: Build Teacher Website
        env:
          VITE_PORTAL_MODE: teacher
          VITE_STANDALONE: "true"
          VITE_BACKEND_URL: ${{ secrets.RENDER_BACKEND_URL }}
        run: npm run build:teacher

      - name: Assemble Dual Site Structure
        run: |
          mkdir -p combined_dist
          # Student site is at root or /student
          cp -r dist-student combined_dist/student
          cp -r dist-teacher combined_dist/teacher
          # Default landing redirects or displays student view
          cp -r dist-student/* combined_dist/

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./combined_dist
```

With this configuration:
- **Student Website**: `https://<your-username>.github.io/<repo-name>/student/` (or root)
- **Teacher Website**: `https://<your-username>.github.io/<repo-name>/teacher/`

---

## 🌐 Option C: Zero-Build Dual URL Access

If you already have your app deployed on Render or GitHub Pages, you do NOT even need to recompile! The app automatically detects the intended portal from the URL:

| Target Audience | URL Pattern | What Happens |
| :--- | :--- | :--- |
| **16 Students** | `https://your-domain.com/?portal=student&standalone=true` | Locks into **Student-Only Hub**. The Teacher Studio button is hidden. |
| **Instructor** | `https://your-domain.com/?portal=teacher&standalone=true` | Loads **Teacher Studio** with full upload and deletion privileges. |

### Subdomain Auto-Detection:
If you map custom domains or subdomains:
- Any domain containing `student` (e.g. `https://students.mca204.com`) automatically loads the **Student Portal**.
- Any domain containing `teacher` (e.g. `https://teacher.mca204.com`) automatically loads the **Teacher Studio**.

---

## 🔒 Security Best Practices

1. **Student Isolation**: By deploying with `VITE_PORTAL_MODE=student` and `VITE_STANDALONE=true`, students cannot access the teacher studio UI.
2. **Permanent Deletions Sync**: When you delete a note in the Teacher Web App, the micro-backend immediately removes the note and purges all ChromaDB vector chunks. The Student Web App polls and updates within 20 seconds (or immediately when the student switches back to the tab).
3. **Google Link Permissions**: Remember to set your Google Drive/Docs link permissions to **"Anyone with the link can view"** so your 16 students' browser iframes load the lecture notes seamlessly without login prompts.
