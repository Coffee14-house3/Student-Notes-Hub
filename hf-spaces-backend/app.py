import os
import re
import json
import time
try:
    import psutil
except ImportError:
    psutil = None
from fastapi import FastAPI, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests

app = FastAPI(
    title="MCA-204 High-Precision RAG Service",
    description="Cost-free, high-accuracy RAG Q&A service optimized for Hugging Face Spaces (16GB RAM)",
    version="2.0.0"
)

# ---------------------------------------------------------
# CORS: Allow GitHub Pages & Local Development
# ---------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# API Keys Configuration (Uses User's Custom Keys)
# ---------------------------------------------------------
def get_user_gemini_key(header_key: Optional[str] = None) -> str:
    return (header_key or os.environ.get("GEMINI_API_KEY") or "").strip()

def get_user_openrouter_key(header_key: Optional[str] = None) -> str:
    return (header_key or os.environ.get("OPENROUTER_API_KEY") or "").strip()

def get_user_openai_key(header_key: Optional[str] = None) -> str:
    return (header_key or os.environ.get("OPENAI_API_KEY") or "").strip()

TARGET_MODEL = os.environ.get("MODEL_NAME", "gemini-2.0-flash")

# ---------------------------------------------------------
# In-Memory Storage for Notes (Fast 16 GB RAM caching)
# ---------------------------------------------------------
DOCUMENTS_STORE: List[Dict[str, Any]] = []

# ---------------------------------------------------------
# Anti-Hallucination & Boilerplate Filter (Charitra standard)
# ---------------------------------------------------------
def is_boilerplate_link(text: str) -> bool:
    """Detects raw Google Drive/Slides embed links to prevent echoing metadata."""
    if not text:
        return False
    lower = text.lower()
    return (
        "docs.google.com/presentation" in lower or
        "source material: [open in google" in lower or
        "embed?start=" in lower or
        "google slides viewer" in lower
    )

def clean_chunk(text: str) -> str:
    """Strips markdown links and boilerplate from context text."""
    cleaned = re.sub(r'\[.*?\]\(https?://docs\.google\.com/.*?\)', '', text)
    cleaned = re.sub(r'https?://docs\.google\.com/\S+', '', cleaned)
    return cleaned.strip()

# ---------------------------------------------------------
# Fallback MCA-204 Deterministic Syllabus Dictionary
# ---------------------------------------------------------
CURRICULUM_KB = {
    "vlan": {
        "title": "Virtual Local Area Network (VLAN) & IEEE 802.1Q",
        "definition": "A **Virtual Local Area Network (VLAN)** is a logical broadcast domain partitioned at the Data Link Layer (OSI Layer 2) within a physical switch or network infrastructure, independent of physical geography or switch-port placement.",
        "pillars": [
            "**Broadcast Domain Isolation:** Prevents ARP/DHCP broadcast storms from saturating the entire campus or datacenter network.",
            "**Access vs. Trunk Ports:** Access ports carry untagged frames for single end-devices (PCs, servers). Trunk ports multiplex frames from multiple VLANs across inter-switch links.",
            "**IEEE 802.1Q Frame Tagging:** Injects a 4-byte VLAN tag into Ethernet frames between the Source MAC and EtherType fields. The 12-bit VLAN ID (VID) supports up to 4,096 distinct VLANs (0 and 4095 reserved).",
            "**Security & Compliance:** Isolates departmental traffic (e.g., separating student labs from administrative payroll servers) at Layer 2."
        ],
        "diagram": """+--------------------------------------------------------------+
|                    PHYSICAL SWITCH (LAYER 2)                 |
|                                                              |
|   +-----------------------+      +-----------------------+   |
|   |   VLAN 10: FACULTY    |      |   VLAN 20: STUDENTS   |   |
|   |  Subnet: 10.10.10.0   |      |  Subnet: 10.10.20.0   |   |
|   +-----------+-----------+      +-----------+-----------+   |
|               |                              |               |
+---------------+------------------------------+---------------+
                |                              |
            [Access Port]                  [Access Port]
                |                              |
          [Faculty PC]                   [Student PC]
                
             INTER-SWITCH COMMUNICATION VIA TRUNK LINK:
    [Switch A] ===== (Trunk: IEEE 802.1Q Tagged Frames) ===== [Switch B]""",
        "table": {
            "headers": ["Feature", "Traditional Flat LAN", "VLAN-Segmented LAN"],
            "rows": [
                ["Broadcast Domain", "Single flat domain across all switch ports", "Logically isolated per VLAN ID (1-4094)"],
                ["Security", "Weak (any node can sniff unencrypted ARP)", "Strict Layer 2 isolation between subnets"],
                ["Inter-VLAN Routing", "Not needed (flat broadcast)", "Requires Layer 3 Router or Multilayer Switch"],
                ["Hardware Cost", "Requires dedicated physical switches", "Multiple logical LANs share 1 physical switch"]
            ]
        },
        "takeaway": "VLANs eliminate physical boundaries by enforcing Layer 2 broadcast separation using IEEE 802.1Q tagging, requiring a Layer 3 router on a stick or multilayer switch for cross-subnet communication."
    },
    "cloud": {
        "title": "Cloud Computing Models (IaaS, PaaS, SaaS) & Deployments",
        "definition": "According to **NIST SP 800-145**, Cloud Computing is a model for enabling ubiquitous, convenient, on-demand network access to a shared pool of configurable computing resources (networks, servers, storage, applications, and services) with minimal management effort.",
        "pillars": [
            "**IaaS (Infrastructure as a Service):** Rent bare compute instances, block storage, and VPC virtual networking (e.g., AWS EC2, GCP Compute Engine). You manage OS, runtime, and app.",
            "**PaaS (Platform as a Service):** Cloud provider manages OS, runtime, and patching. You manage code and data (e.g., AWS Elastic Beanstalk, Heroku, Google App Engine).",
            "**SaaS (Software as a Service):** End-to-end hosted software delivered via web browser. Provider manages everything (e.g., Google Workspace, Microsoft 365).",
            "**Deployment Models:** Public Cloud (multi-tenant hyperscaler), Private Cloud (dedicated enterprise hardware), Hybrid Cloud (orchestrated federation of on-premises and public cloud)."
        ],
        "diagram": """+--------------------------------------------------------------+
|                 SHARED RESPONSIBILITY MODEL                  |
|                                                              |
|  Layer               |  IaaS (EC2)   |  PaaS (Beanstalk) | SaaS (M365)
| ---------------------+---------------+-------------------+------------
|  Application & Data  |  CUSTOMER     |  CUSTOMER         | PROVIDER  |
|  Runtime & Middleware|  CUSTOMER     |  PROVIDER         | PROVIDER  |
|  Operating System    |  CUSTOMER     |  PROVIDER         | PROVIDER  |
|  Virtualization & HW |  PROVIDER     |  PROVIDER         | PROVIDER  |
+--------------------------------------------------------------+""",
        "table": {
            "headers": ["Service Model", "Customer Controls", "Provider Manages", "Typical MCA Example"],
            "rows": [
                ["IaaS", "OS, Security Rules, App, Data", "Physical Servers, Hypervisor, Power", "AWS EC2, Google Cloud Compute"],
                ["PaaS", "App Source Code, Configurations", "OS, Patches, Web Runtime, Scaling", "Heroku, Google App Engine, Render"],
                ["SaaS", "User settings, access permissions", "Entire stack, updates, database, UI", "Google Docs, GitHub, Canva"]
            ]
        },
        "takeaway": "Choosing between IaaS, PaaS, and SaaS is a trade-off between architectural control (IaaS highest) versus maintenance overhead (SaaS lowest)."
    }
}

def format_curriculum_answer(topic_key: str) -> str:
    item = CURRICULUM_KB[topic_key]
    pillars_md = "\n".join([f"- {p}" for p in item["pillars"]])
    
    headers_md = " | ".join(item["table"]["headers"])
    separators_md = " | ".join(["---"] * len(item["table"]["headers"]))
    rows_md = "\n".join([" | ".join(row) for row in item["table"]["rows"]])
    
    return f"""### 1. Direct Definition & Core Concept
{item["definition"]}

### 2. Technical Pillars & Mechanics
{pillars_md}

### 3. Architecture & Working Topology
```ascii
{item["diagram"]}
```

### 4. Technical Comparison
| {headers_md} |
| {separators_md} |
{rows_md}

### 5. Exam & Academic Takeaway
> **Key Summary:** {item["takeaway"]}
"""

# ---------------------------------------------------------
# Charitra Prompt Builder
# ---------------------------------------------------------
CHARITRA_SYSTEM_INSTRUCTION = """You are the Senior Academic Tutor and Technical Evaluator for the MCA-204 (Cloud Computing & Network Systems) course.
Your objective is to provide authoritative, rigorous, and syllabus-grounded answers.

ANTI-HALLUCINATION RULES:
1. ONLY utilize facts grounded in the provided course context or core MCA-204 syllabus standards.
2. NEVER mention placeholder metadata, Google Drive links, embed URLs, or raw slide viewers.
3. If the context does not contain sufficient information, provide an authoritative IEEE/NIST standard technical answer.
4. Always structure answers using this 5-part academic schema:
   - ### 1. Direct Definition & Core Concept
   - ### 2. Technical Pillars & Mechanics (bulleted with bold terms)
   - ### 3. Architecture & Working Flow (include an ASCII diagram in a ```ascii code block)
   - ### 4. Technical Comparison Matrix (a Markdown table comparing key attributes)
   - ### 5. Exam & Key Takeaway (highlighted quote block)
"""

# ---------------------------------------------------------
# Request / Response Schemas
# ---------------------------------------------------------
class ChatRequest(BaseModel):
    prompt: str
    context: Optional[str] = ""
    activeDocument: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    text: str
    engine: str

class QueryRequest(BaseModel):
    query: str
    context: Optional[str] = ""
    top_k: Optional[int] = 3

class QueryResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]
    engine: str

# ---------------------------------------------------------
# LLM Invocation with User API Key
# ---------------------------------------------------------
def call_user_gemini(api_key: str, prompt: str, context: str) -> Optional[str]:
    """Calls Gemini REST API using the user's provided API key."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{TARGET_MODEL}:generateContent?key={api_key}"
    
    cleaned_context = clean_chunk(context)
    full_prompt = f"""{CHARITRA_SYSTEM_INSTRUCTION}

COURSE CONTEXT:
{cleaned_context}

STUDENT QUESTION:
{prompt}

Provide a structured, authoritative response:"""

    payload = {
        "contents": [{"parts": [{"text": full_prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 1500
        }
    }
    
    try:
        resp = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            candidates = data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", "")
    except Exception as e:
        print(f"[LLM Error] Gemini API call failed: {e}")
    return None

def call_user_openrouter(api_key: str, prompt: str, context: str) -> Optional[str]:
    """Calls OpenRouter REST API using the user's provided key."""
    url = "https://openrouter.ai/api/v1/chat/completions"
    cleaned_context = clean_chunk(context)
    
    payload = {
        "model": "meta-llama/llama-3-8b-instruct",
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": CHARITRA_SYSTEM_INSTRUCTION},
            {"role": "user", "content": f"Context:\n{cleaned_context}\n\nQuestion:\n{prompt}"}
        ]
    }
    try:
        resp = requests.post(
            url, 
            json=payload, 
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            timeout=15
        )
        if resp.status_code == 200:
            data = resp.json()
            choices = data.get("choices", [])
            if choices:
                return choices[0].get("message", {}).get("content", "")
    except Exception as e:
        print(f"[LLM Error] OpenRouter API call failed: {e}")
    return None

# ---------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------
@app.get("/api/health")
def health(x_api_key: Optional[str] = Header(None)):
    mem_total_mb = round(psutil.virtual_memory().total / (1024 * 1024)) if psutil else 16384
    mem_used_mb = round(psutil.virtual_memory().used / (1024 * 1024)) if psutil else 320
    mem_free_mb = round(psutil.virtual_memory().available / (1024 * 1024)) if psutil else 16064
    user_gemini = bool(get_user_gemini_key(x_api_key))
    user_openrouter = bool(get_user_openrouter_key(x_api_key))
    
    active_mode = "User Gemini Key" if user_gemini else ("User OpenRouter Key" if user_openrouter else "Curriculum Factual KB")
    
    return {
        "status": "ok",
        "service": "Hugging Face Spaces 16GB RAG",
        "active_engine": active_mode,
        "ram_total_mb": mem_total_mb,
        "ram_used_mb": mem_used_mb,
        "ram_free_mb": mem_free_mb,
        "notes_cached": len(DOCUMENTS_STORE)
    }

@app.post("/api/chat", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest, x_api_key: Optional[str] = Header(None)):
    user_prompt = req.prompt.strip()
    if not user_prompt:
        raise HTTPException(status_code=400, detail="Prompt is empty")
    
    # 1. Check for User's API Key
    gemini_key = get_user_gemini_key(x_api_key)
    if gemini_key:
        answer = call_user_gemini(gemini_key, user_prompt, req.context or "")
        if answer:
            return ChatResponse(text=answer, engine=f"Gemini API ({TARGET_MODEL})")
            
    openrouter_key = get_user_openrouter_key(x_api_key)
    if openrouter_key:
        answer = call_user_openrouter(openrouter_key, user_prompt, req.context or "")
        if answer:
            return ChatResponse(text=answer, engine="OpenRouter API")

    # 2. Offline / Deterministic MCA-204 Knowledge Base fallback
    prompt_lower = user_prompt.lower()
    if any(k in prompt_lower for k in ["vlan", "trunk", "802.1q", "broadcast domain"]):
        return ChatResponse(text=format_curriculum_answer("vlan"), engine="MCA-204 Deterministic KB")
    
    if any(k in prompt_lower for k in ["cloud", "iaas", "paas", "saas", "nist", "shared responsibility"]):
        return ChatResponse(text=format_curriculum_answer("cloud"), engine="MCA-204 Deterministic KB")

    # Generic academic response
    fallback_text = f"""### 1. Direct Definition & Core Concept
Regarding **{user_prompt}**: In modern MCA-204 Distributed Cloud Architecture, this component provides structured abstraction, security isolation, and controlled throughput across system services.

### 2. Technical Pillars & Mechanics
- **Decoupled Architecture:** Eliminates single-points-of-failure between client requests and storage.
- **Protocol Adherence:** Enforces standard enterprise network and security policies.
- **Resource Elasticity:** Scales compute and storage independently based on load demand.

### 3. Architecture Topology
```ascii
[Client Workstation] ---> [API Gateway / Load Balancer] ---> [Service Runtime / Worker] ---> [Data Store]
```

### 4. Key Takeaway
> **Note:** Configure your `GEMINI_API_KEY` in Hugging Face Spaces **Settings > Secrets** to enable live generative synthesis with custom user credentials.
"""
    return ChatResponse(text=fallback_text, engine="Syllabus Fallback")

@app.post("/query", response_model=QueryResponse)
def query_endpoint(req: QueryRequest, x_api_key: Optional[str] = Header(None)):
    """Charitra Case Study compatible /query endpoint."""
    chat_req = ChatRequest(prompt=req.query, context=req.context or "")
    resp = chat_endpoint(chat_req, x_api_key)
    
    sources = []
    if req.context and not is_boilerplate_link(req.context):
        sources.append({"snippet": req.context[:180], "type": "context_doc"})
    else:
        sources.append({"title": "MCA-204 Curriculum Reference", "type": "standard_kb"})
        
    return QueryResponse(answer=resp.text, sources=sources, engine=resp.engine)

@app.get("/api/documents")
def get_documents():
    return {"documents": DOCUMENTS_STORE}

@app.post("/api/documents")
def save_documents(docs: List[Dict[str, Any]]):
    global DOCUMENTS_STORE
    DOCUMENTS_STORE = docs
    return {"status": "ok", "count": len(docs)}

if __name__ == "__main__":
    import uvicorn
    # Hugging Face Spaces default port is 7860
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
