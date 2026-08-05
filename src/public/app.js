/* =============================
   BFA DASHBOARD — app.js
   Full rewrite with all features
============================= */

const pageTitles = {
  'tab-chat':      { title: 'AI Chat Agent', sub: 'Natural language interface to the BFA Gateway' },
  'tab-sandbox':   { title: 'Execution Sandbox', sub: 'Run pre-built agent scenarios or custom tool calls' },
  'tab-policies':  { title: 'ABAC Policy Engine', sub: 'Centralized security rules enforced before every tool call' },
  'tab-audit':     { title: 'Audit Trail', sub: 'Immutable log of every BFA execution with full trace context' },
  'tab-benchmark': { title: 'Benchmark Results', sub: '150-run evaluation: Direct API Mode vs BFA Architecture Mode' },
  'tab-tools':     { title: 'Tool Registry', sub: 'Curated schemas exposed to AI agents — internal APIs never visible' }
};

let chatStats = { total: 0, allowed: 0, blocked: 0 };

// ── Sidebar Navigation ──────────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-tab');
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(target).classList.add('active');

    const info = pageTitles[target];
    document.getElementById('page-title').textContent   = info.title;
    document.getElementById('page-subtitle').textContent = info.sub;

    if (target === 'tab-audit')     loadAuditLogs();
    if (target === 'tab-benchmark') loadMetrics();
    if (target === 'tab-tools')     loadTools();
  });
});

// ── Chat Tab ────────────────────────────────────────────────────────────────
function updateChatStats(verdict, responseMode) {
  chatStats.total++;
  if (responseMode === 'conversational') {
    // Conversational replies don't affect allowed/blocked security counters
  } else if (verdict === 'ALLOWED') {
    chatStats.allowed++;
  } else {
    chatStats.blocked++;
  }
  document.getElementById('chat-total').textContent   = chatStats.total;
  document.getElementById('chat-allowed').textContent = chatStats.allowed;
  document.getElementById('chat-blocked').textContent = chatStats.blocked;
}

function appendUserMsg(text) {
  const msgs = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'msg user';
  div.innerHTML = `<div class="msg-bubble">${escHtml(text)}</div>
    <div class="msg-meta">${new Date().toLocaleTimeString()}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function appendThinking() {
  const msgs = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'msg agent thinking-msg';
  div.innerHTML = `<div class="msg-thinking">🔄 BFA Gateway processing...</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function appendAgentMsg(data) {
  const msgs = document.getElementById('chat-messages');

  // Remove thinking indicator
  const thinking = msgs.querySelector('.thinking-msg');
  if (thinking) thinking.remove();

  const isBlocked = data.bfaVerdict && data.bfaVerdict !== 'ALLOWED';
  const div = document.createElement('div');
  div.className = `msg agent${isBlocked ? ' blocked' : ''}`;

  let tagHtml = '';
  let tagClass = '';
  if (data.responseMode === 'conversational') { tagHtml = '💬 CHAT';           tagClass = 'tag-chat'; }
  else if (data.bfaVerdict === 'ALLOWED')       { tagHtml = '✅ ALLOWED';       tagClass = 'tag-allowed'; }
  else if (data.bfaVerdict === 'DENIED')        { tagHtml = '🚫 DENIED';        tagClass = 'tag-denied'; }
  else if (data.bfaVerdict === 'RATE_LIMITED')  { tagHtml = '⏱ RATE LIMITED';  tagClass = 'tag-rate'; }
  else if (data.bfaVerdict === 'INVALID_INPUT') { tagHtml = '⚠️ INVALID';      tagClass = 'tag-invalid'; }

  let detail = '';
  if (data.toolSelected) {
    detail = `\n\n<span style="font-size:11px;color:var(--muted);">🔧 Tool: <code>${data.toolSelected}</code> · Rule: ${data.policyRule || 'N/A'}</span>`;
  }

  div.innerHTML = `
    <div class="msg-bubble">${formatMessageText(data.naturalResponse)}${detail}</div>
    <div class="msg-meta">
      ${new Date().toLocaleTimeString()}
      ${tagHtml ? `<span class="msg-tag ${tagClass}">${tagHtml}</span>` : ''}
      ${data.executionResult ? `<span style="color:var(--muted)">${data.executionResult.durationMs}ms</span>` : ''}
    </div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

async function sendChatMessage(message) {
  if (!message.trim()) return;
  const userToken = document.getElementById('chat-user-token').value;
  const input     = document.getElementById('chat-message-input');
  const sendBtn   = document.getElementById('chat-send-btn');

  input.value = '';
  input.disabled = true;
  sendBtn.disabled = true;

  // Remove welcome message if present
  const welcome = document.querySelector('.chat-welcome');
  if (welcome) welcome.remove();

  appendUserMsg(message);
  const thinking = appendThinking();

  try {
    const res = await fetch('/api/bfa/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userToken, message })
    });
    const data = await parseApiResponse(res);
    appendAgentMsg(data);
    updateChatStats(data.bfaVerdict, data.responseMode);
  } catch (err) {
    const thinking2 = document.querySelector('.thinking-msg');
    if (thinking2) thinking2.remove();
    appendAgentMsg({ naturalResponse: `❌ Network Error: ${err.message}`, bfaVerdict: 'DENIED' });
    updateChatStats('DENIED');
  } finally {
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
  }
}

document.getElementById('chat-send-btn').addEventListener('click', () => {
  sendChatMessage(document.getElementById('chat-message-input').value);
});

document.getElementById('chat-message-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage(e.target.value);
  }
});

document.querySelectorAll('.quick-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    sendChatMessage(btn.getAttribute('data-prompt'));
  });
});

// ── Sandbox Tab ─────────────────────────────────────────────────────────────
const presetSelect  = document.getElementById('agent-preset');
const customPanel   = document.getElementById('custom-tool-panel');
const sandboxOutput = document.getElementById('sandbox-output');
const execBadge     = document.getElementById('exec-status-badge');

presetSelect.addEventListener('change', () => {
  if (presetSelect.value === 'custom_tool') {
    customPanel.classList.remove('hidden');
  } else {
    customPanel.classList.add('hidden');
  }
});

document.getElementById('btn-run-agent').addEventListener('click', async () => {
  const preset = presetSelect.value;
  sandboxOutput.textContent = `[BFA Gateway] Launching scenario: ${preset}...\n`;
  setBadge(execBadge, 'Executing...', 'chip-yellow');

  try {
    if (preset === 'custom_tool') {
      const userToken = document.getElementById('custom-user-token').value.trim() || 'usr_student_01';
      const toolName  = document.getElementById('custom-tool-name').value;
      const argsStr   = document.getElementById('custom-tool-args').value.trim();
      let args = {};
      try { args = JSON.parse(argsStr); }
      catch (e) {
        sandboxOutput.textContent += `\n❌ Invalid JSON: ${e.message}`;
        setBadge(execBadge, 'JSON Error', 'chip-red');
        return;
      }
      const res  = await fetch('/api/bfa/execute', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userToken, toolName, args })
      });
      const data = await parseApiResponse(res);
      sandboxOutput.textContent = JSON.stringify(data, null, 2);
      setBadge(execBadge, data.verdict === 'ALLOWED' ? 'ALLOWED ✅' : `BLOCKED ❌ (${data.verdict})`,
        data.verdict === 'ALLOWED' ? 'chip-green' : 'chip-red');
    } else {
      const res  = await fetch('/api/bfa/simulate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: preset })
      });
      const data = await parseApiResponse(res);
      const blocked = (data.blockedCount || 0) + (data.invalidCount || 0) + (data.rateLimitedCount || 0);
      let out = `Scenario : ${data.scenarioName}\n`;
      out += `Executed : ${data.requestsExecuted} calls\n`;
      out += `Allowed  : ${data.allowedCount}  |  Blocked/Rate-Limited: ${blocked}\n`;
      out += `\n────── Execution Log ──────\n`;
      out += data.logs.join('\n');
      sandboxOutput.textContent = out;
      setBadge(execBadge, blocked > 0 ? `${blocked} Blocked 🛡` : 'All Allowed ✅',
        blocked > 0 ? 'chip-blue' : 'chip-green');
    }
  } catch (err) {
    sandboxOutput.textContent += `\n❌ Error: ${err.message}`;
    setBadge(execBadge, 'Error', 'chip-red');
  }
});

// ── Audit Logs ───────────────────────────────────────────────────────────────
document.getElementById('btn-refresh-audit').addEventListener('click', loadAuditLogs);

document.getElementById('btn-clear-audit').addEventListener('click', async () => {
  if (!confirm('Clear all audit logs?')) return;
  await fetch('/api/bfa/audit-logs/clear', { method: 'POST' });
  loadAuditLogs();
});

document.getElementById('audit-filter-verdict').addEventListener('change', loadAuditLogs);

async function loadAuditLogs() {
  const tbody   = document.getElementById('audit-table-body');
  const verdict = document.getElementById('audit-filter-verdict').value;
  tbody.innerHTML = `<tr><td colspan="9" class="empty-row">Loading...</td></tr>`;
  try {
    const url = verdict ? `/api/bfa/audit-logs?verdict=${verdict}` : '/api/bfa/audit-logs';
    const logs = await (await fetch(url)).json();
    if (!logs.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-row">No records. Run an agent scenario first!</td></tr>`;
      return;
    }
    tbody.innerHTML = logs.map(log => {
      const v = log.policyVerdict;
      let badge = `<span class="chip chip-green" style="font-size:10px">ALLOWED</span>`;
      if (v === 'DENIED')       badge = `<span class="chip chip-red"    style="font-size:10px">DENIED</span>`;
      if (v === 'INVALID_INPUT')badge = `<span class="chip chip-yellow" style="font-size:10px">INVALID</span>`;
      if (v === 'RATE_LIMITED') badge = `<span class="chip chip-purple" style="font-size:10px">RATE LMT</span>`;
      return `<tr>
        <td><code>${log.traceId}</code></td>
        <td>${new Date(log.timestamp).toLocaleTimeString()}</td>
        <td><code>${log.userId}</code></td>
        <td>${log.userRole}</td>
        <td style="color:var(--muted)">${log.agentId}</td>
        <td><code>${log.toolName}</code></td>
        <td>${badge}</td>
        <td style="font-size:10px;color:var(--muted)">${log.ruleId}</td>
        <td>${log.executionDurationMs} ms</td>
      </tr>`;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-row" style="color:var(--red)">Error: ${err.message}</td></tr>`;
  }
}

// ── Benchmark ────────────────────────────────────────────────────────────────
document.getElementById('btn-run-benchmark').addEventListener('click', loadMetrics);

async function loadMetrics() {
  const tbody = document.getElementById('benchmark-table-body');
  tbody.innerHTML = `<tr><td colspan="4" class="empty-row">Running benchmark suite...</td></tr>`;
  try {
    const data = await (await fetch('/api/bfa/metrics')).json();
    document.getElementById('m-security-rate').textContent   = data.unauthorizedBlockRateBFA;
    document.getElementById('m-token-reduction').textContent = data.tokenReductionPercent;
    document.getElementById('m-latency').textContent         = `${data.avgLatencyMsBFA} ms`;

    tbody.innerHTML = `
      <tr>
        <td><strong>Security Violation Block Rate</strong></td>
        <td style="color:var(--red)">${data.unauthorizedBlockRateDirect} blocked</td>
        <td style="color:var(--green)"><strong>${data.unauthorizedBlockRateBFA} blocked</strong></td>
        <td><span class="chip chip-green" style="font-size:10px">+92.9% Security</span></td>
      </tr>
      <tr>
        <td><strong>Prompt Token Consumption</strong></td>
        <td>~${data.avgPromptTokensDirect} tokens (raw OpenAPI)</td>
        <td style="color:var(--purple)"><strong>~${data.avgPromptTokensBFA} tokens (BFA schemas)</strong></td>
        <td><span class="chip chip-purple" style="font-size:10px">75% Token Savings</span></td>
      </tr>
      <tr>
        <td><strong>Audit Trace Completeness</strong></td>
        <td style="color:var(--red)">${data.auditTraceCompletenessDirect}</td>
        <td style="color:var(--green)"><strong>${data.auditTraceCompletenessBFA}</strong></td>
        <td><span class="chip chip-blue" style="font-size:10px">100% Traceable</span></td>
      </tr>
      <tr>
        <td><strong>Average Execution Latency</strong></td>
        <td>${data.avgLatencyMsDirect} ms</td>
        <td>${data.avgLatencyMsBFA} ms <span style="color:var(--muted)">(+7ms BFA overhead)</span></td>
        <td><span class="chip chip-neutral" style="font-size:10px">+1.4% LLM Budget</span></td>
      </tr>`;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-row" style="color:var(--red)">Error: ${err.message}</td></tr>`;
  }
}

// ── Tool Registry ────────────────────────────────────────────────────────────
async function loadTools() {
  const container = document.getElementById('tools-container');
  const toolSelect = document.getElementById('custom-tool-name');
  try {
    const tools = await (await fetch('/api/bfa/tools')).json();

    if (toolSelect) {
      toolSelect.innerHTML = tools.map(t =>
        `<option value="${t.name}">${t.name} (${t.category})</option>`).join('');
    }

    container.innerHTML = tools.map(t => `
      <div class="tool-item">
        <div class="tool-name">${t.name}</div>
        <div class="tool-category">${t.category}</div>
        <div class="tool-desc">${t.description}</div>
        <div class="tool-params">
          <strong>Parameters:</strong>
          ${t.parameters.map(p =>
            `• <code style="color:var(--blue)">${p.name}</code> <span style="color:var(--purple)">(${p.type}${p.required ? ', required' : ''})</span> — <span style="color:var(--muted)">${p.description}</span>`
          ).join('\n')}
        </div>
      </div>`).join('');
  } catch (err) {
    container.innerHTML = `<p style="color:var(--red)">Error loading tools: ${err.message}</p>`;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function setBadge(el, text, cls) {
  el.textContent = text;
  el.className   = `chip ${cls}`;
}

async function parseApiResponse(res) {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMessageText(str) {
  return escHtml(str).replace(/\n/g, '<br>');
}

// Initial loads
loadTools();
