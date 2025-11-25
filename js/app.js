// Bullshit Bingo - Main Application Logic

class BullshitBingo {
  constructor() {
    this.currentTopic = null;
    this.card = [];
    this.markedSquares = new Set();
    this.hasWon = false;
    this.freeSpaceEnabled = true;
    this.gameStartTime = null;
    
    this.init();
  }
  
  init() {
    this.loadFromStorage();
    this.renderTopicSelector();
    this.bindEvents();
    
    // If we have a saved game, restore it
    if (this.currentTopic && this.card.length > 0) {
      this.renderCard();
      this.updateTimer();
    }
  }
  
  bindEvents() {
    // Topic selection
    document.getElementById('topic-selector').addEventListener('click', (e) => {
      const topicCard = e.target.closest('.topic-card');
      if (topicCard) {
        const topic = topicCard.dataset.topic;
        this.selectTopic(topic);
      }
    });
    
    // New game button
    document.getElementById('new-game-btn').addEventListener('click', () => {
      this.showTopicSelector();
    });
    
    // Free space toggle
    document.getElementById('free-space-toggle').addEventListener('change', (e) => {
      this.freeSpaceEnabled = e.target.checked;
      this.saveToStorage();
    });
    
    // Modal close
    document.getElementById('win-modal').addEventListener('click', (e) => {
      if (e.target.id === 'win-modal' || e.target.classList.contains('close-modal')) {
        this.closeWinModal();
      }
    });
    
    // Play again button
    document.getElementById('play-again-btn').addEventListener('click', () => {
      this.closeWinModal();
      this.showTopicSelector();
    });
    
    // New card same topic
    document.getElementById('new-card-btn').addEventListener('click', () => {
      this.closeWinModal();
      this.generateNewCard();
    });
    
    // Share button
    document.getElementById('share-btn').addEventListener('click', () => {
      this.shareCard();
    });
    
    // Timer update
    setInterval(() => this.updateTimer(), 1000);
  }
  
  renderTopicSelector() {
    const container = document.getElementById('topic-selector');
    container.innerHTML = '';
    
    Object.entries(WORD_LISTS).forEach(([key, topic]) => {
      const card = document.createElement('div');
      card.className = 'topic-card';
      card.dataset.topic = key;
      card.innerHTML = `
        <span class="topic-icon">${topic.icon}</span>
        <span class="topic-name">${topic.name}</span>
        <span class="topic-count">${topic.words.length} buzzwords</span>
      `;
      container.appendChild(card);
    });
  }
  
  selectTopic(topicKey) {
    this.currentTopic = topicKey;
    this.generateNewCard();
    this.showGameBoard();
  }
  
  generateNewCard() {
    const topic = WORD_LISTS[this.currentTopic];
    if (!topic) return;
    
    // Shuffle and pick 24 or 25 words
    const shuffled = [...topic.words].sort(() => Math.random() - 0.5);
    const numWords = this.freeSpaceEnabled ? 24 : 25;
    const selectedWords = shuffled.slice(0, numWords);
    
    // Create card array
    this.card = [];
    let wordIndex = 0;
    
    for (let i = 0; i < 25; i++) {
      if (this.freeSpaceEnabled && i === 12) {
        // Center square is free space
        this.card.push({ word: 'FREE SPACE', isFree: true });
      } else {
        this.card.push({ word: selectedWords[wordIndex], isFree: false });
        wordIndex++;
      }
    }
    
    // Reset game state
    this.markedSquares = new Set();
    if (this.freeSpaceEnabled) {
      this.markedSquares.add(12); // Auto-mark free space
    }
    this.hasWon = false;
    this.gameStartTime = Date.now();
    
    this.saveToStorage();
    this.renderCard();
    this.updateTopicDisplay();
  }
  
  renderCard() {
    const grid = document.getElementById('bingo-grid');
    grid.innerHTML = '';
    
    this.card.forEach((cell, index) => {
      const square = document.createElement('div');
      square.className = 'bingo-square';
      if (cell.isFree) square.classList.add('free-space');
      if (this.markedSquares.has(index)) square.classList.add('marked');
      
      square.dataset.index = index;
      square.innerHTML = `
        <span class="square-text">${cell.word}</span>
        <span class="check-mark">✓</span>
      `;
      
      square.addEventListener('click', () => this.toggleSquare(index));
      grid.appendChild(square);
    });
  }
  
  toggleSquare(index) {
    if (this.hasWon) return;
    if (this.card[index].isFree) return; // Can't unmark free space
    
    const square = document.querySelector(`[data-index="${index}"]`);
    
    if (this.markedSquares.has(index)) {
      this.markedSquares.delete(index);
      square.classList.remove('marked');
    } else {
      this.markedSquares.add(index);
      square.classList.add('marked');
      
      // Add pop animation
      square.classList.add('pop');
      setTimeout(() => square.classList.remove('pop'), 300);
    }
    
    this.saveToStorage();
    this.checkWin();
  }
  
  checkWin() {
    const winPatterns = this.getWinPatterns();
    
    for (const pattern of winPatterns) {
      if (pattern.every(index => this.markedSquares.has(index))) {
        this.triggerWin(pattern);
        return;
      }
    }
    
    // Check for blackout
    if (this.markedSquares.size === 25) {
      this.triggerWin('blackout');
    }
  }
  
  getWinPatterns() {
    const patterns = [];
    
    // Rows
    for (let row = 0; row < 5; row++) {
      patterns.push([0, 1, 2, 3, 4].map(col => row * 5 + col));
    }
    
    // Columns
    for (let col = 0; col < 5; col++) {
      patterns.push([0, 1, 2, 3, 4].map(row => row * 5 + col));
    }
    
    // Diagonals
    patterns.push([0, 6, 12, 18, 24]); // Top-left to bottom-right
    patterns.push([4, 8, 12, 16, 20]); // Top-right to bottom-left
    
    return patterns;
  }
  
  triggerWin(pattern) {
    this.hasWon = true;
    this.saveToStorage();
    
    // Highlight winning squares
    if (pattern !== 'blackout') {
      pattern.forEach(index => {
        const square = document.querySelector(`[data-index="${index}"]`);
        square.classList.add('winning');
      });
    } else {
      document.querySelectorAll('.bingo-square').forEach(square => {
        square.classList.add('winning');
      });
    }
    
    // Calculate time
    const elapsed = Date.now() - this.gameStartTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    
    // Show win modal after animation
    setTimeout(() => {
      document.getElementById('win-time').textContent = timeString;
      document.getElementById('win-type').textContent = 
        pattern === 'blackout' ? 'BLACKOUT!' : 'BINGO!';
      this.showWinModal();
    }, 500);
  }
  
  showWinModal() {
    const modal = document.getElementById('win-modal');
    modal.classList.add('show');
    
    // Trigger confetti
    this.createConfetti();
  }
  
  closeWinModal() {
    document.getElementById('win-modal').classList.remove('show');
  }
  
  createConfetti() {
    const container = document.getElementById('confetti-container');
    container.innerHTML = '';
    
    const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da'];
    
    for (let i = 0; i < 100; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = Math.random() * 2 + 's';
      confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
      container.appendChild(confetti);
    }
    
    // Clean up confetti after animation
    setTimeout(() => {
      container.innerHTML = '';
    }, 5000);
  }
  
  showTopicSelector() {
    document.getElementById('topic-screen').classList.remove('hidden');
    document.getElementById('game-screen').classList.add('hidden');
    this.currentTopic = null;
    this.card = [];
    this.markedSquares = new Set();
    this.hasWon = false;
    this.clearStorage();
  }
  
  showGameBoard() {
    document.getElementById('topic-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
  }
  
  updateTopicDisplay() {
    const topic = WORD_LISTS[this.currentTopic];
    if (topic) {
      document.getElementById('current-topic').textContent = `${topic.icon} ${topic.name}`;
    }
  }
  
  updateTimer() {
    if (!this.gameStartTime || this.hasWon) return;
    
    const elapsed = Date.now() - this.gameStartTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    document.getElementById('timer').textContent = 
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  shareCard() {
    // Create shareable state
    const state = {
      t: this.currentTopic,
      c: this.card.map(cell => cell.word),
      m: Array.from(this.markedSquares),
      f: this.freeSpaceEnabled
    };
    
    const encoded = btoa(JSON.stringify(state));
    const url = `${window.location.origin}${window.location.pathname}?game=${encoded}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Bullshit Bingo',
        text: `Check out my ${WORD_LISTS[this.currentTopic].name} Bingo card!`,
        url: url
      }).catch(() => this.copyToClipboard(url));
    } else {
      this.copyToClipboard(url);
    }
  }
  
  copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      this.showToast('Link copied to clipboard!');
    }).catch(() => {
      this.showToast('Could not copy link');
    });
  }
  
  showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
  
  loadFromStorage() {
    try {
      const saved = localStorage.getItem('bullshitBingo');
      if (saved) {
        const data = JSON.parse(saved);
        this.currentTopic = data.currentTopic;
        this.card = data.card || [];
        this.markedSquares = new Set(data.markedSquares || []);
        this.hasWon = data.hasWon || false;
        this.freeSpaceEnabled = data.freeSpaceEnabled !== false;
        this.gameStartTime = data.gameStartTime;
        
        // Update free space toggle
        document.getElementById('free-space-toggle').checked = this.freeSpaceEnabled;
        
        if (this.currentTopic && this.card.length > 0) {
          this.showGameBoard();
          this.updateTopicDisplay();
        }
      }
      
      // Check for shared game in URL
      const urlParams = new URLSearchParams(window.location.search);
      const gameParam = urlParams.get('game');
      if (gameParam) {
        this.loadSharedGame(gameParam);
        // Clear URL parameter
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (e) {
      console.error('Error loading from storage:', e);
    }
  }
  
  loadSharedGame(encoded) {
    try {
      const state = JSON.parse(atob(encoded));
      this.currentTopic = state.t;
      this.card = state.c.map((word, i) => ({
        word: word,
        isFree: state.f && i === 12 && word === 'FREE SPACE'
      }));
      this.markedSquares = new Set(state.m);
      this.freeSpaceEnabled = state.f;
      this.hasWon = false;
      this.gameStartTime = Date.now();
      
      this.showGameBoard();
      this.renderCard();
      this.updateTopicDisplay();
      this.saveToStorage();
    } catch (e) {
      console.error('Error loading shared game:', e);
    }
  }
  
  saveToStorage() {
    try {
      const data = {
        currentTopic: this.currentTopic,
        card: this.card,
        markedSquares: Array.from(this.markedSquares),
        hasWon: this.hasWon,
        freeSpaceEnabled: this.freeSpaceEnabled,
        gameStartTime: this.gameStartTime
      };
      localStorage.setItem('bullshitBingo', JSON.stringify(data));
    } catch (e) {
      console.error('Error saving to storage:', e);
    }
  }
  
  clearStorage() {
    localStorage.removeItem('bullshitBingo');
  }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.game = new BullshitBingo();
});
