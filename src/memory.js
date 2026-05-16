export class MemoryDB {
  constructor() {
    this.dbName = 'QuantumOracleMemory';
    this.storeName = 'vectors';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        this.db = event.target.result;
        if (!this.db.objectStoreNames.contains(this.storeName)) {
          this.db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };

      request.onerror = (event) => {
        console.error("IndexedDB Error:", event.target.error);
        reject(event.target.error);
      };
    });
  }

  async saveMemory(query, answer, embedding) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const record = {
        id: Date.now().toString(),
        query,
        answer,
        embedding,
        timestamp: Date.now()
      };

      const request = store.add(record);
      
      request.onsuccess = () => resolve(record.id);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getAllMemories() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async searchMemory(queryEmbedding, topK = 3, threshold = 0.75) {
    const allMemories = await this.getAllMemories();
    if (allMemories.length === 0) return [];

    // Calculate similarities
    const scoredMemories = allMemories.map(mem => ({
      ...mem,
      score: this.cosineSimilarity(queryEmbedding, mem.embedding)
    }));

    // Sort by score descending and filter by threshold
    return scoredMemories
      .filter(m => m.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}
