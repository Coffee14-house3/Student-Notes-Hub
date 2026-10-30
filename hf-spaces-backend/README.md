---
title: MCA 204 Notes RAG Backend
emoji: 🎓
colorFrom: amber
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# MCA-204 High-Precision RAG Backend (Hugging Face Spaces)

This is the production-ready FastAPI backend designed for **Hugging Face Spaces** (Free 16 GB RAM + 2 vCPUs).

### Features
1. **User API Key Priority:** Uses your own `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, or `OPENAI_API_KEY` (configured in Space **Settings > Secrets**).
2. **Zero-Cost Local Model Fallback:** Supports offline `TinyLlama-1.1B-Chat-v1.0.Q4_K_M.gguf` on CPU when no API key is supplied.
3. **Charitra Anti-Hallucination Pipeline:** Filters out boilerplate link placeholders, enforces strict 4-part academic formatting, and outputs ASCII architecture diagrams and Markdown tables.
4. **Endpoints:**
   - `POST /api/chat` (Drop-in compatible with the React GitHub Pages student & teacher portals)
   - `POST /query` (Charitra benchmark endpoint)
   - `GET /api/health` (Reports memory usage and active model engine)
   - `GET /api/documents` / `POST /api/documents` (Note synchronization)

### Base Model Architecture Selection
**TinyLlama/TinyLlama-1.1B-Chat-v1.0** was chosen as the base model because of its:
- **Compact size (1.1B parameters):** Extremely low memory footprint (~638 MB in Q4_K_M GGUF format), operating well within the 16 GB RAM envelope with abundant headroom for in-memory vector indices.
- **Instruction-following capabilities:** Strong adherence to structured syllabus prompts, schema boundaries, and factual academic retrieval.
- **Compatibility with QLoRA and GGUF formats:** Enables fine-tuning on cost-free Google Colab T4 GPUs and quantizing down to 4-bit integers for native CPU execution.
- **Practical inference performance on CPU-based environments:** Achieves 15–25 tokens/second per CPU core on 2 vCPUs without needing expensive GPU hardware.
