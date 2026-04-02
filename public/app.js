/* global chat state */
(function () {
  'use strict';

  const chatMessages = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const messageInput = document.getElementById('messageInput');
  const quickActions = document.getElementById('quickActions');

  /* ── Helpers ──────────────────────────────── */

  function formatTime(date) {
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  /**
   * Convert basic markdown-like *text* to <em> and newlines to <br>.
   * Also converts clue blocks (lines after the header) into styled divs.
   */
  function renderBunnyText(text) {
    // Split header from clue body (header ends with "!\n\n")
    const clueMatch = text.match(/^([\s\S]*?)\n\n([\s\S]+)$/);
    if (clueMatch) {
      const headerRaw = clueMatch[1];
      const bodyRaw = clueMatch[2];
      const headerHtml = escapeAndFormat(headerRaw);
      const bodyHtml = escapeAndFormat(bodyRaw);
      return `<span>${headerHtml}</span><div class="clue-block">${bodyHtml}</div>`;
    }
    return escapeAndFormat(text);
  }

  function escapeAndFormat(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  /* ── Append message bubble ────────────────── */

  function appendMessage(text, sender, { team } = {}) {
    const row = document.createElement('div');
    row.className = `message-row ${sender}`;

    if (sender === 'bunny') {
      const avatar = document.createElement('div');
      avatar.className = 'bubble-avatar';
      avatar.textContent = '🐰';
      row.appendChild(avatar);
    }

    const col = document.createElement('div');
    col.style.display = 'flex';
    col.style.flexDirection = 'column';
    col.style.alignItems = sender === 'user' ? 'flex-end' : 'flex-start';

    // Team badge (user messages only)
    if (sender === 'user' && team) {
      const badge = document.createElement('span');
      badge.className = `team-badge ${team}`;
      badge.textContent = team === 'red' ? '🔴 Squadra Rossa' : '🟡 Squadra Gialla';
      col.appendChild(badge);
    }

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    if (sender === 'bunny') {
      bubble.innerHTML = renderBunnyText(text);
    } else {
      bubble.textContent = text;
    }
    col.appendChild(bubble);

    const time = document.createElement('div');
    time.className = 'msg-time';
    time.textContent = formatTime(new Date());
    col.appendChild(time);

    row.appendChild(col);
    chatMessages.appendChild(row);
    scrollToBottom();
  }

  /* ── Typing indicator ─────────────────────── */

  let typingRow = null;

  function showTyping() {
    typingRow = document.createElement('div');
    typingRow.className = 'typing-row';

    const avatar = document.createElement('div');
    avatar.className = 'bubble-avatar';
    avatar.textContent = '🐰';

    const dots = document.createElement('div');
    dots.className = 'typing-dots';
    dots.innerHTML = '<span></span><span></span><span></span>';

    typingRow.appendChild(avatar);
    typingRow.appendChild(dots);
    chatMessages.appendChild(typingRow);
    scrollToBottom();
  }

  function hideTyping() {
    if (typingRow) {
      typingRow.remove();
      typingRow = null;
    }
  }

  /* ── API call ─────────────────────────────── */

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    appendMessage(trimmed, 'user');
    messageInput.value = '';
    messageInput.disabled = true;

    showTyping();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!res.ok) throw new Error('Errore del server');

      const data = await res.json();

      // Small delay for realism
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 400));
      hideTyping();
      appendMessage(data.reply, 'bunny', { team: data.team });
    } catch {
      hideTyping();
      appendMessage('🐰 Ops! Qualcosa è andato storto. Riprova! 🥚', 'bunny');
    } finally {
      messageInput.disabled = false;
      messageInput.focus();
    }
  }

  /* ── Event listeners ──────────────────────── */

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    sendMessage(messageInput.value);
  });

  quickActions.addEventListener('click', (e) => {
    const btn = e.target.closest('.quick-btn');
    if (btn) sendMessage(btn.dataset.msg);
  });

  /* ── Initial greeting from bunny ─────────── */

  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      appendMessage(
        '🐰 Ciao ciao! Sono il Coniglio Pasquale!\n\nSono qui per guidarvi nella caccia al tesoro di Pasqua! 🥚🌸\n\nDitemi in quale squadra siete (🔴 Rossa o 🟡 Gialla) e dove vi trovate, e vi darò il prossimo indizio! 🗺️',
        'bunny'
      );
    }, 400);
  });
})();
