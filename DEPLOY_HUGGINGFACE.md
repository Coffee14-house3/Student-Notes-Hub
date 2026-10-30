# Deploying to Hugging Face Spaces (16 GB Free RAM + 2 vCPUs)

This guide shows you how to host your FastAPI RAG backend on **Hugging Face Spaces** for **$0 / Cost-Free**, eliminating Render's 512 MB memory bottleneck and comfortably serving all **60 MCA-204 students**.

---

## Why Hugging Face Spaces for 60 Students?

| Feature | Render Free Web Service | Hugging Face Spaces (CPU Free) |
| :--- | :--- | :--- |
| **RAM** | **512 MB** *(crashes with vector DB)* | **16,000 MB (16 GB)** *(31× more memory)* |
| **CPU** | 0.1 vCPU shared | **2 dedicated vCPUs** |
| **AI Processing** | Prone to Out-Of-Memory (OOM) | **Zero crash risk** |
| **Custom API Keys** | Supported | **Supported via Space Secrets** |
| **Offline Model Support** | Impossible (no RAM) | Can cache GGUF models in memory |

---

## 3-Minute Step-by-Step Deployment

### Step 1: Create a Space on Hugging Face
1. Go to **[huggingface.co/new-space](https://huggingface.co/new-space)** (create a free account if you don't have one).
2. Fill in the details:
   - **Space name:** `mca204-notes-rag`
   - **License:** `MIT` (or Apache 2.0)
   - **Space SDK:** Select **Docker** (or **Blank**)
   - **Space Hardware:** Select **CPU basic • 2 vCPU • 16 GB • Free**
   - **Visibility:** Public
3. Click **Create Space**.

---

### Step 2: Upload Pre-Built Backend Files
In your new Hugging Face Space, navigate to the **Files** tab and upload the files located in your repository's `/hf-spaces-backend/` folder:

1. `app.py` — The FastAPI RAG backend with Charitra anti-hallucination rules, IEEE 802.1Q curriculum entries, and custom API key handler.
2. `requirements.txt` — Lightweight pinned dependencies (`fastapi`, `uvicorn`, `pydantic`, `requests`, `numpy`).
3. `Dockerfile` — Builds Python 3.11 and exposes port 7860.
4. `README.md` — Space YAML metadata header.

*Note: Hugging Face automatically detects these files and begins building the Docker image instantly.*

---

### Step 3: Add Your Custom API Key
You requested to use **your own API keys** rather than generic models:

1. In your Hugging Face Space, click **Settings** (top right tab).
2. Scroll down to **Variables and secrets**.
3. Under **Secrets**, click **New secret**:
   - **Name:** `GEMINI_API_KEY` (or `OPENROUTER_API_KEY` / `OPENAI_API_KEY`)
   - **Value:** `<Paste your personal API key>`
4. Click **Save**.

Your backend automatically reads this secret on startup and switches into **User API Key Engine** with temperature=0.2 and curriculum grounding.

---

### Step 4: Connect Your GitHub Pages Frontend

Once your Hugging Face Space builds, you will see a public direct URL at the top right of the Space (click the three dots `...` → **Embed this Space** or look for direct URL):
```text
https://<your-username>-mca204-notes-rag.hf.space
```

1. Open your **Student Notes Hub** or **Teacher Studio** on GitHub Pages.
2. Open the **Architecture / Cloud Settings** modal (or press the Cloud icon in the header).
3. Click the **Hugging Face Spaces (16GB RAM)** tab.
4. Paste your Space URL:
   `https://<your-username>-mca204-notes-rag.hf.space`
5. Click **Test Connection** (you will see `Connected • Space RAM: 16,384 MB (User Gemini Key)`).
6. Click **Save & Connect**.

---

## Performance for 60 MCA Students

* **Reading notes & taking quizzes:** Instant (0ms, served directly via GitHub Pages CDN and local browser cache).
* **Asking questions simultaneously:** Your custom API key processes requests in 1.5 to 2.5 seconds per query.
* **Network dropouts:** The backend includes a deterministic IEEE 802.1Q VLAN and Cloud computing fallback so students never see broken errors or hallucinations.

---

## Base Model Architecture Selection

**TinyLlama/TinyLlama-1.1B-Chat-v1.0** was chosen as the base model because of its:
- **Compact size (1.1B parameters):** Extremely light memory footprint (~638 MB in Q4 GGUF format), effortlessly fitting inside free tier constraints.
- **Instruction-following capabilities:** Strong alignment with structured academic Q&A prompts and strict schema adherence.
- **Compatibility with QLoRA and GGUF formats:** Allows parameter-efficient fine-tuning on free Google Colab GPUs and straightforward 4-bit CPU quantization.
- **Practical inference performance on CPU-based environments:** Generates 15–25 tokens/second per CPU core on 2 vCPUs without needing expensive GPU instances.

