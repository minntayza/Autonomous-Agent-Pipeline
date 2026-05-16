import { AgentPrompts, AgentSchemas } from './agents.js';
import { tools } from './tools.js';
import { MemoryDB } from './memory.js';

export class AgentPipeline {
  constructor(llm, ui) {
    this.llm = llm;
    this.ui = ui;
    this.memoryDB = new MemoryDB();
    this.memory = {
      query: '',
      plan: null,
      research: '',
      draft: '',
      criticLoops: 0,
      feedbacks: []
    };
  }

  async run(query) {
    this.ui.resetPipeline();
    this.ui.setStatus('active', 'Pipeline Running');
    this.memory.query = query;
    this.memory.criticLoops = 0;
    this.memory.feedbacks = [];

    let queryEmbedding = null;
    let pastContext = '';

    try {
      // Initialize Memory DB
      await this.memoryDB.init();

      // 0. Semantic Search for Past Context
      this.ui.log('system', 'Searching semantic memory for past context...');
      try {
        queryEmbedding = await this.llm.embedContent(query);
        const similarMemories = await this.memoryDB.searchMemory(queryEmbedding, 3, 0.75);
        if (similarMemories.length > 0) {
          pastContext = similarMemories.map((m, i) => `[Past Memory ${i+1}] Query: ${m.query}\nAnswer: ${m.answer}`).join('\n\n');
          this.ui.log('system', `Found ${similarMemories.length} relevant past memories.`);
        } else {
          this.ui.log('system', 'No relevant past memory found.');
        }
      } catch (e) {
        this.ui.log('system', `Memory search failed (continuing without it): ${e.message}`);
      }

      // 1. Planner
      this.ui.setActiveNode('planner');
      this.ui.log('planner', 'Decomposing query...');
      // Pass the strict JSON Schema
      const plan = await this.llm.generate(AgentPrompts.Planner, query, AgentSchemas.Planner);
      this.memory.plan = plan;
      this.ui.log('planner', `Plan created (${plan.complexity} complexity): ${plan.tasks.length} tasks.`);
      this.ui.setNodeComplete('planner');

      // 2. Researcher (Parallel execution)
      this.ui.setActiveNode('researcher');
      this.ui.log('researcher', 'Executing parallel retrieval...');
      
      const searchPromises = plan.concepts.map(concept => tools.webSearch(concept));
      const searchResults = await Promise.all(searchPromises);
      
      const researcherPrompt = `Sub-tasks: ${JSON.stringify(plan.tasks)}\nSearch Results: ${searchResults.join('\n\n')}\nOriginal Query: ${query}`;
      const research = await this.llm.generate(AgentPrompts.Researcher, researcherPrompt);
      this.memory.research = research;
      this.ui.log('researcher', 'Research complete. Extracted key factual points.');
      this.ui.setNodeComplete('researcher');

      // Synthesis & Critic Loop
      let passed = false;
      const MAX_RETRIES = 3;

      while (!passed && this.memory.criticLoops < MAX_RETRIES) {
        this.ui.updateRetryBadge(this.memory.criticLoops, MAX_RETRIES);
        
        // 3. Synthesizer
        this.ui.setActiveNode('synthesizer');
        const retryContext = this.memory.criticLoops > 0 
          ? `\n\nPREVIOUS CRITIC FEEDBACK MUST BE ADDRESSED:\n${this.memory.feedbacks[this.memory.feedbacks.length - 1]}` 
          : '';
        const memoryContext = pastContext ? `\n\nPast Relevant Memories:\n${pastContext}` : '';
        const synthesizerPrompt = `Research Notes:\n${this.memory.research}${memoryContext}\n\nUser Query: ${query}${retryContext}`;
        
        this.ui.log('synthesizer', this.memory.criticLoops > 0 ? 'Re-drafting to address feedback...' : 'Drafting initial synthesis (streaming)...');
        
        // Stream the Synthesizer output
        this.ui.startStreamMessage('agent');
        const draft = await this.llm.generateStream(AgentPrompts.Synthesizer, synthesizerPrompt, (chunk, full) => {
          this.ui.appendStreamChunk(full);
        });
        this.ui.endStreamMessage();

        this.memory.draft = draft;
        this.ui.setNodeComplete('synthesizer');

        // 4. Critic
        this.ui.setActiveNode('critic');
        this.ui.log('critic', 'Evaluating draft against criteria...');
        const criticPrompt = `User Query: ${query}\n\nSynthesizer Draft:\n${draft}`;
        
        // Pass strict JSON schema
        const critique = await this.llm.generate(AgentPrompts.Critic, criticPrompt, AgentSchemas.Critic);
        
        this.ui.updateCriticScore(critique.total);
        
        if (critique.passed || critique.total >= 75) {
          passed = true;
          this.ui.log('critic', `Draft approved! Score: ${critique.total}/100`);
          this.ui.setNodeComplete('critic');
        } else {
          this.memory.criticLoops++;
          this.memory.feedbacks.push(critique.feedback);
          this.ui.log('critic', `Draft rejected. Score: ${critique.total}/100. Feedback: ${critique.feedback}`);
          
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, this.memory.criticLoops - 1)));
          this.ui.resetNode('synthesizer');
          this.ui.resetNode('critic');
        }
      }

      if (!passed) {
        this.ui.log('system', 'Max retries exhausted. Proceeding with best effort draft.');
      }

      // Human in the loop
      this.ui.setStatus('idle', 'Waiting for human approval');
      const approvedDraft = await this.ui.awaitHumanCheckpoint(this.memory.draft);
      this.ui.setStatus('active', 'Formatting');

      // Remove the synthesizer draft from UI before formatting stream starts
      this.ui.chatHistory.lastElementChild.remove();

      // 5. Formatter
      this.ui.setActiveNode('formatter');
      this.ui.log('formatter', 'Applying final polish (streaming)...');
      
      this.ui.startStreamMessage('agent');
      const finalResult = await this.llm.generateStream(AgentPrompts.Formatter, `Draft:\n${approvedDraft}`, (chunk, full) => {
        this.ui.appendStreamChunk(full);
      });
      this.ui.endStreamMessage();
      this.ui.setNodeComplete('formatter');

      // Save to Semantic Memory
      if (queryEmbedding) {
        this.ui.log('system', 'Saving session to long-term semantic memory...');
        await this.memoryDB.saveMemory(query, finalResult, queryEmbedding);
      }

      this.ui.setStatus('idle', 'Pipeline Complete');
      return finalResult;

    } catch (err) {
      this.ui.log('system', `Pipeline Error: ${err.message}`);
      this.ui.setStatus('error', 'Failed');
      throw err;
    }
  }
}
