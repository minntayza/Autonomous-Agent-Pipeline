export const tools = {
  async executeCode(code) {
    try {
      // Very basic sandbox using new Function
      // In production, use Web Workers or a real sandbox
      const fn = new Function(`
        let log = [];
        const originalConsoleLog = console.log;
        console.log = (...args) => {
          log.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
        };
        try {
          ${code}
        } finally {
          console.log = originalConsoleLog;
        }
        return log.join('\\n');
      `);
      return fn() || "Code executed successfully with no output.";
    } catch (e) {
      return `Execution Error: ${e.message}`;
    }
  },

  async webSearch(query) {
    // Wikipedia API as a proxy for web search
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.query && data.query.search && data.query.search.length > 0) {
        // Return top 3 results
        return data.query.search.slice(0, 3).map(res => {
          // Strip HTML tags from snippet
          const snippet = res.snippet.replace(/<[^>]*>?/gm, '');
          return `Title: ${res.title}\nSnippet: ${snippet}`;
        }).join('\n\n');
      }
      return "No results found.";
    } catch (error) {
      return `Search failed: ${error.message}. Simulated Search Result: The query '${query}' relates to advanced concepts in the domain.`;
    }
  }
};
