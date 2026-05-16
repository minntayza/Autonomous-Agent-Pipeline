export class LLMClient {
  constructor() {
    this.apiKey = localStorage.getItem('gemini_api_key') || '';
    this.model = localStorage.getItem('gemini_model') || 'gemini-2.5-flash';
  }

  setCredentials(key, model) {
    this.apiKey = key;
    this.model = model;
    localStorage.setItem('gemini_api_key', key);
    localStorage.setItem('gemini_model', model);
  }

  hasValidKey() {
    return this.apiKey && this.apiKey.trim().length > 10;
  }

  async embedContent(text) {
    if (!this.hasValidKey()) throw new Error("API Key is missing or invalid.");
    
    // text-embedding-004 is recommended for general text embeddings
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${this.apiKey}`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: { parts: [{ text }] }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Embedding API Error ${response.status}: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.embedding.values;
  }

  async generate(systemPrompt, userPrompt, responseSchema = null) {
    if (!this.hasValidKey()) throw new Error("API Key is missing or invalid.");

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    
    const requestBody = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.2 }
    };

    if (responseSchema) {
      requestBody.generationConfig.responseMimeType = "application/json";
      requestBody.generationConfig.responseSchema = responseSchema;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API Error ${response.status}: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    if (responseSchema && text) {
      return JSON.parse(text);
    }
    return text;
  }

  async generateStream(systemPrompt, userPrompt, onChunk) {
    if (!this.hasValidKey()) throw new Error("API Key is missing or invalid.");

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;
    
    const requestBody = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.7 }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API Error ${response.status}: ${errorData.error?.message || response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          if (dataStr === '[DONE]') continue;
          
          try {
            const data = JSON.parse(dataStr);
            const chunkText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (chunkText) {
              fullText += chunkText;
              if (onChunk) onChunk(chunkText, fullText);
            }
          } catch (e) {
            console.warn("Failed to parse SSE JSON chunk", e);
          }
        }
      }
    }
    
    return fullText;
  }
}
