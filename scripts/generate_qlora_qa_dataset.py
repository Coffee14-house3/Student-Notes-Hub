"""
Phase 2: QA Generation & QLoRA Fine-tuning Pipeline
Based on the Charitra Case Study (Lijo Raju)

This script implements:
- Step 2.1: Generating high-quality QA pairs from lecture notes/textbook chunks.
- Step 2.2: Cleaning, validation (Context Overlap, Answer Completeness, Question Sanity).
- Step 2.3: Preparing the final JSON dataset formatted for QLoRA fine-tuning on TinyLlama-1.1B.
"""

import os
import re
import json
from typing import List, Dict, Any

# ---------------------------------------------------------------------------
# Step 2.1 — Generating QA Pairs from Text Chunks
# ---------------------------------------------------------------------------

QA_PROMPT_TEMPLATE = """<|system|>
You are a helpful assistant that generates question-answer pairs from educational text. Your output must ONLY be a valid JSON array.
<|user|>
Given the following text, generate exactly {num_pairs} question-answer pairs following Bloom's taxonomy (factual, conceptual, and analytical).

Text: {chunk}

Please return the output as a valid JSON array of objects, where each object has a 'question' key and an 'answer' key.
Example: [{{"question": "What standard defines VLAN frame tagging?", "answer": "IEEE 802.1Q defines VLAN frame tagging by inserting a 4-byte tag into Ethernet frames."}}]
<|assistant|>
"""

def chunk_text(text: str, chunk_size_words: int = 800, overlap_words: int = 100) -> List[str]:
    """Splits document text into overlapping chunks (~750-850 words)."""
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i:i + chunk_size_words])
        if len(chunk.strip()) > 100:
            chunks.append(chunk)
        i += (chunk_size_words - overlap_words)
    return chunks

# ---------------------------------------------------------------------------
# Step 2.2 — Cleaning and Validation (Anti-Hallucination Checks)
# ---------------------------------------------------------------------------

def check_context_overlap(answer: str, context: str) -> bool:
    """Ensures answer keywords appear in context to prevent hallucinations."""
    if not answer or not context:
        return False
    context_lower = context.lower()
    # Extract significant content words (> 3 chars)
    words = re.findall(r'\b[a-z]{4,}\b', answer.lower())
    if not words:
        return True
    matched_words = sum(1 for w in words if w in context_lower)
    overlap_ratio = matched_words / len(words)
    return overlap_ratio >= 0.40  # At least 40% keyword overlap required

def check_answer_completeness(answer: str) -> bool:
    """Filters out answers that are too short or vague ('Yes', 'No', etc.)."""
    cleaned = answer.strip()
    words = cleaned.split()
    if len(words) < 5:  # Reject overly brief answers
        return False
    if cleaned.lower() in ["yes", "no", "true", "false", "it depends", "not mentioned"]:
        return False
    return True

def check_question_sanity(question: str) -> bool:
    """Discards generic, malformed, or context-blind questions."""
    q_lower = question.strip().lower()
    if len(q_lower.split()) < 4:
        return False
    generic_patterns = [
        "what is the meaning of the text",
        "what does the passage say",
        "according to the text above",
        "what is mentioned here"
    ]
    if any(p in q_lower for p in generic_patterns):
        return False
    return True

def validate_and_filter_qa_pairs(raw_pairs: List[Dict[str, str]], context: str) -> List[Dict[str, str]]:
    """Applies all 4 validation checks to guarantee 'Paka' clean data."""
    valid_pairs = []
    for pair in raw_pairs:
        q = pair.get("question", "").strip()
        a = pair.get("answer", "").strip()
        
        if not check_question_sanity(q):
            continue
        if not check_answer_completeness(a):
            continue
        if not check_context_overlap(a, context):
            continue
            
        valid_pairs.append({"question": q, "answer": a, "context": context})
    return valid_pairs

# ---------------------------------------------------------------------------
# Step 2.3 — Dataset Formatting for QLoRA & SFTTrainer
# ---------------------------------------------------------------------------

def format_for_qlora(valid_pairs: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """
    Formats verified pairs into instruction-tuning schema:
    {
      "instruction": "Answer the question based on the context.",
      "input": "Context: ...\\n\\nQuestion: ...",
      "output": "Answer"
    }
    """
    dataset = []
    for item in valid_pairs:
        dataset.append({
            "instruction": "Answer the question based on the context. Focus strictly on relevant facts and avoid hallucinations.",
            "input": f"Context: {item['context']}\n\nQuestion: {item['question']}",
            "output": item["answer"]
        })
    return dataset

# ---------------------------------------------------------------------------
# Sample Demonstration & Self-Test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    sample_context = (
        "In computer networking, IEEE 802.1Q is the networking standard that supports virtual LANs (VLANs) "
        "on an IEEE 802.3 Ethernet network. The standard defines a system of VLAN tagging for Ethernet frames "
        "and the accompanying procedures to be used by bridges and switches in handling such frames. "
        "The standard was developed by IEEE 802.1 and inserts a 4-byte field containing a 12-bit VLAN identifier (VID), "
        "enabling up to 4,096 distinct broadcast domains to coexist on a single physical link."
    )

    sample_generated_pairs = [
        {
            "question": "What is the function of IEEE 802.1Q in Ethernet networking?",
            "answer": "IEEE 802.1Q is the standard that supports virtual LANs (VLANs) by defining a 4-byte frame tagging mechanism with a 12-bit identifier."
        },
        {
            "question": "Yes?",
            "answer": "Yes"  # Should be rejected (too short)
        },
        {
            "question": "What does the text above say?",
            "answer": "It talks about networking."  # Should be rejected (sanity check)
        },
        {
            "question": "How many VLAN identifiers does IEEE 802.1Q support?",
            "answer": "It provides a 12-bit VLAN identifier supporting up to 4,096 distinct broadcast domains."
        }
    ]

    print("Running Charitra Validation Filter...")
    filtered = validate_and_filter_qa_pairs(sample_generated_pairs, sample_context)
    print(f"Retained {len(filtered)} out of {len(sample_generated_pairs)} pairs.")

    final_dataset = format_for_qlora(filtered)
    print("\nSample QLoRA Instruction Entry:")
    print(json.dumps(final_dataset[0], indent=2))
