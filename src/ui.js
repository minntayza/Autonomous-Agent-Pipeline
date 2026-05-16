import { marked } from 'marked';
import DOMPurify from 'dompurify';

export class UIController {
  constructor() {
    this.nodes = {
      planner: document.getElementById('node-planner'),
      researcher: document.getElementById('node-researcher'),
      synthesizer: document.getElementById('node-synthesizer'),
      critic: document.getElementById('node-critic'),
      formatter: document.getElementById('node-formatter')
    };
    this.statusDot = document.getElementById('pipeline-status-dot');
    this.statusText = document.getElementById('pipeline-status-text');
    this.logContainer = document.getElementById('log-container');
    this.retryBadge = document.getElementById('retry-badge');
    this.criticScore = document.getElementById('critic-score');
    this.chatHistory = document.getElementById('chat-history');
    
    // Checkpoint
    this.checkpointPanel = document.getElementById('human-checkpoint');
    this.checkpointEditor = document.getElementById('checkpoint-editor');
    this.btnApprove = document.getElementById('btn-approve');
    this.btnReject = document.getElementById('btn-reject');

    this.currentStreamDiv = null;
  }

  setStatus(state, text) {
    this.statusDot.className = `dot ${state}`;
    this.statusText.textContent = text;
  }

  resetPipeline() {
    Object.values(this.nodes).forEach(node => {
      node.classList.remove('active', 'completed');
      node.querySelector('.node-status').textContent = 'Pending';
    });
    this.retryBadge.classList.add('hidden');
    this.criticScore.classList.add('hidden');
    this.checkpointPanel.classList.add('hidden');
    this.log('system', '--- New Request ---');
  }

  setActiveNode(agentName) {
    Object.values(this.nodes).forEach(node => {
      if (node.classList.contains('active')) {
        node.classList.remove('active');
        node.classList.add('completed');
        node.querySelector('.node-status').textContent = 'Completed';
      }
    });

    const node = this.nodes[agentName];
    if (node) {
      node.classList.remove('completed');
      node.classList.add('active');
      node.querySelector('.node-status').textContent = 'Working...';
    }
  }

  setNodeComplete(agentName) {
    const node = this.nodes[agentName];
    if (node) {
      node.classList.remove('active');
      node.classList.add('completed');
      node.querySelector('.node-status').textContent = 'Completed';
    }
  }

  resetNode(agentName) {
    const node = this.nodes[agentName];
    if (node) {
      node.classList.remove('active', 'completed');
      node.querySelector('.node-status').textContent = 'Pending';
    }
  }

  log(source, message) {
    const entry = document.createElement('div');
    entry.className = `log-entry ${source}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    this.logContainer.appendChild(entry);
    this.logContainer.scrollTop = this.logContainer.scrollHeight;
  }

  updateRetryBadge(count, max) {
    if (count > 0) {
      this.retryBadge.classList.remove('hidden');
      this.retryBadge.textContent = `Retry ${count}/${max}`;
    } else {
      this.retryBadge.classList.add('hidden');
    }
  }

  updateCriticScore(score) {
    this.criticScore.classList.remove('hidden');
    this.criticScore.className = `score-display ${score >= 75 ? 'pass' : 'fail'}`;
    this.criticScore.querySelector('.score-val').textContent = score;
  }

  removeWelcome() {
    const welcome = this.chatHistory.querySelector('.welcome-message');
    if (welcome) welcome.remove();
  }

  appendMessage(role, content, isMarkdown = false) {
    this.removeWelcome();
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    
    if (isMarkdown) {
      msgDiv.classList.add('markdown-body');
      msgDiv.innerHTML = DOMPurify.sanitize(marked.parse(content));
    } else {
      msgDiv.textContent = content;
    }
    
    this.chatHistory.appendChild(msgDiv);
    this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
  }

  startStreamMessage(role) {
    this.removeWelcome();
    this.currentStreamDiv = document.createElement('div');
    this.currentStreamDiv.className = `message ${role} markdown-body`;
    this.chatHistory.appendChild(this.currentStreamDiv);
    this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
  }

  appendStreamChunk(fullText) {
    if (this.currentStreamDiv) {
      this.currentStreamDiv.innerHTML = DOMPurify.sanitize(marked.parse(fullText));
      this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    }
  }

  endStreamMessage() {
    this.currentStreamDiv = null;
  }

  awaitHumanCheckpoint(draftText) {
    return new Promise((resolve, reject) => {
      this.checkpointPanel.classList.remove('hidden');
      this.checkpointEditor.value = draftText;
      
      const onApprove = () => {
        cleanup();
        resolve(this.checkpointEditor.value);
      };
      
      const onReject = () => {
        cleanup();
        reject(new Error("Human rejected the draft."));
      };

      const cleanup = () => {
        this.btnApprove.removeEventListener('click', onApprove);
        this.btnReject.removeEventListener('click', onReject);
        this.checkpointPanel.classList.add('hidden');
      };

      this.btnApprove.addEventListener('click', onApprove);
      this.btnReject.addEventListener('click', onReject);
    });
  }
}
