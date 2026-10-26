import pytest
from fastapi.testclient import TestClient
from app import app, is_boilerplate_link, clean_chunk, CURRICULUM_KB

client = TestClient(app)

def test_is_boilerplate_link():
    """Verify that raw Google Drive and Google Slides embed URLs are detected and rejected."""
    sample_slide_boilerplate = "Source Material: [Open in Google Slides](https://docs.google.com/presentation/d/1vA5W7_XYZ/embed?start=false)"
    assert is_boilerplate_link(sample_slide_boilerplate) is True

    valid_syllabus_text = "VLAN operates at Layer 2 of the OSI model using IEEE 802.1Q encapsulation."
    assert is_boilerplate_link(valid_syllabus_text) is False

def test_clean_chunk():
    """Verify markdown URL scrubbing."""
    dirty_text = "Core concept: [Click Here](https://docs.google.com/presentation/d/abc/embed) VLAN tagging enables traffic segregation."
    cleaned = clean_chunk(dirty_text)
    assert "https://docs.google.com" not in cleaned
    assert "VLAN tagging enables traffic segregation" in cleaned

def test_vlan_curriculum_kb():
    """Verify factual accuracy of VLAN curriculum entry."""
    vlan_data = CURRICULUM_KB["vlan"]
    assert "IEEE 802.1Q" in vlan_data["definition"] or any("IEEE 802.1Q" in p for p in vlan_data["pillars"])
    assert "4,096" in "".join(vlan_data["pillars"]) or "4096" in "".join(vlan_data["pillars"])
    assert "PHYSICAL SWITCH" in vlan_data["diagram"]

def test_health_endpoint():
    """Verify that health check reports memory status and active engine."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "ram_total_mb" in data
    assert "ram_used_mb" in data

def test_chat_vlan_query():
    """Verify that querying about VLAN generates structured 5-part academic answer with ASCII diagram."""
    response = client.post("/api/chat", json={"prompt": "Explain vlan and its concept"})
    assert response.status_code == 200
    data = response.json()
    assert "text" in data
    text = data["text"]
    
    # Verify Charitra 5-part academic structure
    assert "1. Direct Definition & Core Concept" in text
    assert "2. Technical Pillars" in text
    assert "3. Architecture & Working" in text
    assert "```ascii" in text
    assert "4. Technical Comparison" in text
    assert "5. Exam & Academic Takeaway" in text
    assert "802.1Q" in text

def test_charitra_query_endpoint():
    """Verify the production /query endpoint for external integrations."""
    response = client.post("/query", json={"query": "What are the cloud deployment models?"})
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "sources" in data
    assert len(data["sources"]) > 0
