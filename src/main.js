import './style.css';
import { LLMClient } from './llm.js';
import { UIController } from './ui.js';
import { AgentPipeline } from './pipeline.js';

document.addEventListener('DOMContentLoaded', () => {
  const llm = new LLMClient();
  const ui = new UIController();
  const pipeline = new AgentPipeline(llm, ui);

  // Elements
  const form = document.getElementById('query-form');
  const input = document.getElementById('query-input');
  const sendBtn = document.getElementById('send-btn');
  const apiKeyInput = document.getElementById('api-key');
  const modelSelect = document.getElementById('model-select');
  const clearBtn = document.getElementById('clear-btn');

  // Load saved settings
  apiKeyInput.value = llm.apiKey;
  modelSelect.value = llm.model;

  // Input handling
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = (input.scrollHeight) + 'px';
    sendBtn.disabled = input.value.trim() === '';
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) {
        form.dispatchEvent(new Event('submit'));
      }
    }
  });

  // Settings
  apiKeyInput.addEventListener('change', (e) => {
    llm.setCredentials(e.target.value, modelSelect.value);
  });
  
  modelSelect.addEventListener('change', (e) => {
    llm.setCredentials(apiKeyInput.value, e.target.value);
  });

  clearBtn.addEventListener('click', () => {
    localStorage.removeItem('gemini_api_key');
    apiKeyInput.value = '';
    llm.setCredentials('', modelSelect.value);
    document.getElementById('chat-history').innerHTML = `<div class="welcome-message">
      <div class="pulse-ring"></div>
      <h3>System Reset</h3>
      <p>Waiting for query to initialize autonomous reasoning pipeline...</p>
    </div>`;
    ui.resetPipeline();
    ui.logContainer.innerHTML = '<div class="log-entry system">System initialized. Awaiting API Key.</div>';
  });

  // Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;

    if (!llm.hasValidKey()) {
      alert('Please enter a valid Gemini API Key in the settings sidebar.');
      apiKeyInput.focus();
      return;
    }

    // Update UI
    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;
    ui.appendMessage('user', query);

    try {
      await pipeline.run(query);
    } catch (error) {
      ui.appendMessage('agent', `**Pipeline Failed:** ${error.message}`, true);
    } finally {
      sendBtn.disabled = false;
    }
  });
});
