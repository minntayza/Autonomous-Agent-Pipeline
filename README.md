#  The Quantum Oracle (Autonomous Agent Pipeline)

A highly polished, client-side, 5-agent autonomous reasoning system built with **Vanilla JavaScript** and powered by the **Gemini API**. It implements a self-correction loop, local semantic memory, strict structured outputs, and real-time streaming—all natively in the browser.

## 🌟 Key Features

- **The 5-Agent Pipeline:**
  1. **Planner:** Decomposes complex queries into sub-tasks and concepts (Strict JSON Output).
  2. **Researcher:** Fetches external knowledge (currently mapped to Wikipedia API).
  3. **Synthesizer:** Drafts comprehensive answers based on research and past memory.
  4. **Critic:** Evaluates the draft on Accuracy, Completeness, Clarity, and Relevance. Automatically rejects and re-routes drafts that score `< 75/100`.
  5. **Formatter:** Applies final polish and markdown structure.
- **Local Semantic Memory:** Uses `text-embedding-004` to generate vectors and stores them in your browser's IndexedDB. The system searches past memories using Cosine Similarity to maintain long-term context across different chat sessions.
- **Adaptive Self-Correction:** The Synthesizer is fed the Critic's feedback on each retry to ensure it doesn't repeat mistakes (capped at 3 retries with exponential backoff).
- **Human-in-the-Loop:** Once the Critic approves, the pipeline pauses for a human checkpoint, allowing you to manually edit the draft before the Formatter runs.
- **Real-Time Streaming:** The Synthesizer and Formatter outputs stream directly to the UI word-by-word using Server-Sent Events (SSE).
- **Premium Observability UI:** Real-time trace panel showing agent status, logs, scores, and retry counts, complete with glassmorphism and micro-animations.

## 🛠 Tech Stack

- **Core:** HTML, Vanilla CSS, Vanilla JavaScript (ES Modules)
- **Bundler:** Vite
- **AI / LLM:** Google Gemini REST API (`gemini-2.5-flash`, `gemini-2.5-pro`, `text-embedding-004`)
- **Database:** IndexedDB (Local Vector Store)
- **Dependencies:** `marked` (Markdown parsing), `dompurify` (Sanitization)

##  Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/minntayza/Autonomous-Agent-Pipeline.git
   cd Autonomous-Agent-Pipeline
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173/` in your browser.
5. Enter your **Gemini API Key** in the left sidebar to activate the system.

##  Future Upgrades

To take this from a prototype to production:
- Replace the Wikipedia mock with a real search API (Tavily, Google Custom Search).
- Add an isolated code execution environment (E2B / WebContainers) to the tools.
- Implement server-side telemetry using LangSmith or Braintrust for true observability.
