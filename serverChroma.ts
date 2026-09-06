import { CloudClient, EmbeddingFunction } from "chromadb";
import { NoteDocument } from "./src/types";

// ChromaDB Cloud configuration with fallback to provided credentials
const CHROMA_API_KEY = process.env.CHROMA_API_KEY || "ck-GcQZtcjL4HkCUrRnhdhvLC632JVA9YXHYw7PVoDWj8AM";
const CHROMA_TENANT = process.env.CHROMA_TENANT || "0f94ea0f-37ba-4909-88f1-4ee0f0e15dd7";
const CHROMA_DATABASE = process.env.CHROMA_DATABASE || "rag-notes-application1";
const COLLECTION_NAME = "course_notes_rag";

/**
 * Robust, zero-dependency 384-dimensional dense semantic vector generator.
 * Eliminates ONNX/Protobuf runtime file loading crashes in containerized environments.
 */
class RobustEmbeddingFunction implements EmbeddingFunction {
  private dimension = 384;

  public async generate(texts: string[]): Promise<number[][]> {
    return texts.map(text => this.embedSingle(text));
  }

  private embedSingle(text: string): number[] {
    const vector = new Array(this.dimension).fill(0);
    if (!text || typeof text !== "string") return vector;

    const normalized = text.toLowerCase().trim();
    if (!normalized) return vector;

    // Tokenize into words and sub-tokens
    const tokens = normalized.match(/[\p{L}\p{N}_]+/gu) || [];
    if (tokens.length === 0) return vector;

    // Feature frequency map with n-grams
    const freqMap = new Map<string, number>();
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      freqMap.set(token, (freqMap.get(token) || 0) + 1.0);

      // Bi-grams for semantic phrase capture
      if (i < tokens.length - 1) {
        const bigram = `${token}_${tokens[i + 1]}`;
        freqMap.set(bigram, (freqMap.get(bigram) || 0) + 1.4);
      }

      // Tri-grams
      if (i < tokens.length - 2) {
        const trigram = `${token}_${tokens[i + 1]}_${tokens[i + 2]}`;
        freqMap.set(trigram, (freqMap.get(trigram) || 0) + 0.9);
      }

      // Character trigrams for morphological and spelling robustness
      if (token.length >= 4) {
        for (let c = 0; c <= token.length - 3; c++) {
          const charGram = token.slice(c, c + 3);
          freqMap.set(`$${charGram}`, (freqMap.get(`$${charGram}`) || 0) + 0.35);
        }
      }
    }

    // Project features into 384-dimensional vector space with sign hashing
    for (const [feature, weight] of freqMap.entries()) {
      const h1 = this.hashString(feature, 0x9e3779b9);
      const h2 = this.hashString(feature, 0x85ebca6b);
      const idx = Math.abs(h1) % this.dimension;
      const sign = (h2 & 1) === 0 ? 1 : -1;
      
      const tf = Math.log1p(weight);
      vector[idx] += sign * tf;

      // Secondary projection for density & reduced collision distortion
      const idx2 = (idx + Math.abs(h2)) % this.dimension;
      const sign2 = ((h1 >>> 1) & 1) === 0 ? 1 : -1;
      vector[idx2] += sign2 * tf * 0.45;
    }

    // Apply non-linear activation (tanh) and L2-normalize
    let normSq = 0;
    for (let i = 0; i < this.dimension; i++) {
      vector[i] = Math.tanh(vector[i]);
      normSq += vector[i] * vector[i];
    }

    const norm = Math.sqrt(normSq);
    if (norm > 0) {
      for (let i = 0; i < this.dimension; i++) {
        vector[i] = Number((vector[i] / norm).toFixed(6));
      }
    }

    return vector;
  }

  private hashString(str: string, seed: number): number {
    let h = seed;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 0x5bd1e995);
      h ^= h >>> 15;
    }
    return h;
  }
}

let chromaClient: any = null;
let embeddingFunction: any = null;
let activeCollection: any = null;
let isInitialized = false;
let initError: string | null = null;

export function getChromaConfig() {
  return {
    tenant: CHROMA_TENANT,
    database: CHROMA_DATABASE,
    collectionName: COLLECTION_NAME,
    isConfigured: Boolean(CHROMA_API_KEY && CHROMA_TENANT && CHROMA_DATABASE)
  };
}

export async function initChroma(): Promise<boolean> {
  if (isInitialized && activeCollection) return true;

  try {
    if (!chromaClient) {
      chromaClient = new CloudClient({
        apiKey: CHROMA_API_KEY,
        tenant: CHROMA_TENANT,
        database: CHROMA_DATABASE
      });
    }

    if (!embeddingFunction) {
      embeddingFunction = new RobustEmbeddingFunction();
    }

    activeCollection = await chromaClient.getOrCreateCollection({
      name: COLLECTION_NAME,
      embeddingFunction: embeddingFunction,
      metadata: {
        description: "Vector database for AWS Cloud Notes & Study Portal RAG",
        createdAt: new Date().toISOString()
      }
    });

    isInitialized = true;
    initError = null;
    console.log(`[ChromaDB Cloud] Successfully connected to database "${CHROMA_DATABASE}" (Collection: ${COLLECTION_NAME})`);
    return true;
  } catch (err: any) {
    initError = err?.message || String(err);
    console.warn(`[ChromaDB Cloud] Warning during initialization:`, initError);
    return false;
  }
}

export async function getChromaStatus(): Promise<{
  connected: boolean;
  tenant: string;
  database: string;
  collection: string;
  vectorCount: number;
  error: string | null;
}> {
  try {
    const ready = await initChroma();
    if (!ready || !activeCollection) {
      return {
        connected: false,
        tenant: CHROMA_TENANT,
        database: CHROMA_DATABASE,
        collection: COLLECTION_NAME,
        vectorCount: 0,
        error: initError || "Chroma client not connected"
      };
    }

    const count = await activeCollection.count();
    return {
      connected: true,
      tenant: CHROMA_TENANT,
      database: CHROMA_DATABASE,
      collection: COLLECTION_NAME,
      vectorCount: count,
      error: null
    };
  } catch (err: any) {
    return {
      connected: false,
      tenant: CHROMA_TENANT,
      database: CHROMA_DATABASE,
      collection: COLLECTION_NAME,
      vectorCount: 0,
      error: err?.message || String(err)
    };
  }
}

export async function indexDocumentToChroma(doc: NoteDocument): Promise<number> {
  const ready = await initChroma();
  if (!ready || !activeCollection) {
    console.warn("[ChromaDB] Cannot index document: collection unavailable");
    return 0;
  }

  try {
    const ids: string[] = [];
    const documents: string[] = [];
    const metadatas: Record<string, any>[] = [];

    const sections = doc.sections || [];
    sections.forEach((sec, idx) => {
      const pageNum = sec.pageNumber || idx + 1;
      const content = sec.contentMarkdown || "";
      if (!content.trim()) return;

      const chunkId = `doc_${doc.id}_p${pageNum}_s${idx}`;
      const fullText = `[Document: ${doc.title}] [Subject: ${doc.subject || "AWS Cloud"}] [Unit: ${doc.unit || "Unit 1"}] [Page ${pageNum}: ${sec.title}]\n${sec.subtitle ? sec.subtitle + "\n" : ""}${content}`;

      ids.push(chunkId);
      documents.push(fullText);
      metadatas.push({
        docId: String(doc.id),
        docTitle: String(doc.title || ""),
        shortTitle: String(doc.shortTitle || ""),
        subject: String(doc.subject || "AWS Cloud & Labs"),
        unit: String(doc.unit || "Unit 1"),
        pageNumber: Number(pageNum),
        sectionTitle: String(sec.title || `Page ${pageNum}`),
        courseCode: String(doc.courseCode || "")
      });
    });

    if (ids.length > 0) {
      // Upsert in batches of 50
      const batchSize = 50;
      for (let i = 0; i < ids.length; i += batchSize) {
        await activeCollection.upsert({
          ids: ids.slice(i, i + batchSize),
          documents: documents.slice(i, i + batchSize),
          metadatas: metadatas.slice(i, i + batchSize)
        });
      }
      console.log(`[ChromaDB] Upserted ${ids.length} vector chunks for document "${doc.title}" (ID: ${doc.id})`);
    }

    return ids.length;
  } catch (err: any) {
    console.error(`[ChromaDB] Error indexing document ${doc.id}:`, err?.message || err);
    return 0;
  }
}

export async function indexAllDocumentsToChroma(docs: NoteDocument[]): Promise<number> {
  const ready = await initChroma();
  if (!ready || !activeCollection) return 0;

  let totalIndexed = 0;
  for (const doc of docs) {
    const count = await indexDocumentToChroma(doc);
    totalIndexed += count;
  }
  console.log(`[ChromaDB] Total ${totalIndexed} chunks synchronized to Chroma Cloud database`);
  return totalIndexed;
}

export async function deleteDocumentFromChroma(docId: string): Promise<boolean> {
  const ready = await initChroma();
  if (!ready || !activeCollection) return false;

  try {
    await activeCollection.delete({
      where: { docId: { "$eq": String(docId) } }
    });
    console.log(`[ChromaDB] Deleted chunks for document "${docId}"`);
    return true;
  } catch (err: any) {
    console.warn(`[ChromaDB] Error deleting chunks for docId ${docId}:`, err?.message);
    return false;
  }
}

export async function resetChromaDatabase(initialDocs: NoteDocument[]): Promise<number> {
  try {
    if (!chromaClient) {
      await initChroma();
    }
    if (chromaClient) {
      try {
        await chromaClient.deleteCollection({ name: COLLECTION_NAME });
      } catch {}
      activeCollection = null;
      isInitialized = false;
    }
    await initChroma();
    return await indexAllDocumentsToChroma(initialDocs);
  } catch (err: any) {
    console.error("[ChromaDB] Error during reset:", err?.message);
    return 0;
  }
}

export interface ChromaSearchResult {
  id: string;
  document: string;
  metadata: {
    docId: string;
    docTitle: string;
    shortTitle: string;
    subject: string;
    unit: string;
    pageNumber: number;
    sectionTitle: string;
    courseCode?: string;
  };
  distance: number | null;
}

export async function queryChroma(
  queryText: string,
  options: {
    nResults?: number;
    docId?: string;
    subject?: string;
    unit?: string;
  } = {}
): Promise<ChromaSearchResult[]> {
  const ready = await initChroma();
  if (!ready || !activeCollection) return [];

  try {
    const nResults = options.nResults || 6;
    const queryParams: any = {
      queryTexts: [queryText],
      nResults: nResults
    };

    const whereConditions: any = {};
    if (options.docId) {
      whereConditions["docId"] = { "$eq": String(options.docId) };
    }
    if (options.subject && options.subject !== "all") {
      whereConditions["subject"] = { "$eq": String(options.subject) };
    }
    if (options.unit && options.unit !== "all") {
      whereConditions["unit"] = { "$eq": String(options.unit) };
    }

    if (Object.keys(whereConditions).length === 1) {
      queryParams.where = whereConditions;
    } else if (Object.keys(whereConditions).length > 1) {
      queryParams.where = {
        "$and": Object.entries(whereConditions).map(([k, v]) => ({ [k]: v }))
      };
    }

    const queryResponse = await activeCollection.query(queryParams);

    const results: ChromaSearchResult[] = [];
    const ids = queryResponse.ids?.[0] || [];
    const docs = queryResponse.documents?.[0] || [];
    const metadatas = queryResponse.metadatas?.[0] || [];
    const distances = queryResponse.distances?.[0] || [];

    for (let i = 0; i < ids.length; i++) {
      if (docs[i]) {
        results.push({
          id: ids[i],
          document: docs[i],
          metadata: (metadatas[i] as any) || {},
          distance: distances[i] !== undefined ? distances[i] : null
        });
      }
    }

    return results;
  } catch (err: any) {
    console.error("[ChromaDB] Query error:", err?.message || err);
    return [];
  }
}
