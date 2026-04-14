/**
 * Project PAI: Premium Engine v2
 * Enhanced chat rendering with Insight cards & Action menus
 */

const state = { tasks: [], messages: [], streak: 0 };
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !window.location.hostname;
const API = isLocal ? 'http://localhost:5000/api' : '/api';

window.onerror = (msg, url, line) => {
    alert(`DEBUG ERROR: ${msg} at line ${line}`);
};

async function init() {
    bind();
    const openBtn = document.getElementById('open-chat');
    if (openBtn) openBtn.onclick = () => switchView('explore');
    await load();
    render();
}

async function api(path, opts = {}) {
    try {
        const r = await fetch(`${API}${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts });
        return await r.json();
    } catch (e) { console.error(e); return null; }
}

async function load() {
    const d = await api('/tasks');
    if (d) state.tasks = d;
    const s = await api('/stats/streak');
    if (s) state.streak = s.streak;
}

async function done(id) {
    await api(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'done' }) });
    await load(); render();
}

// ── Navigation ────────────────────────────────────────
function bind() {
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.onclick = () => switchView(b.dataset.view);
    });
    const sendBtn = document.getElementById('chat-send');
    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            sendBtn.style.opacity = '0.5';
            setTimeout(() => sendBtn.style.opacity = '1', 200);
            chat();
        });
    }

    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                chat();
            }
        });
    }

    const heroBtn = document.getElementById('hero-btn');
    if (heroBtn) {
        heroBtn.onclick = () => {
            const f = state.tasks.find(t => t.status !== 'done');
            if (f) done(f.id);
        };
    }
}

function switchView(id) {
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`${id}-view`).classList.add('active');
    document.querySelector(`[data-view="${id}"]`).classList.add('active');

    // Toggle Global FAB visibility
    const fab = document.getElementById('open-chat');
    if (fab) {
        if (id === 'explore') fab.classList.add('hidden');
        else fab.classList.remove('hidden');
    }
}

// ── Rendering ─────────────────────────────────────────
function render() {
    const pending = state.tasks.filter(t => t.status !== 'done');
    const dn = state.tasks.filter(t => t.status === 'done');

    document.getElementById('hero-title').textContent = pending[0] ? pending[0].title : "You're all caught up!";
    document.getElementById('hero-sub').textContent = pending[0] ? (pending[0].description || "Get this done today.") : "Time to explore new goals.";
    document.getElementById('streak-num').textContent = state.streak;
    document.getElementById('streak-ring').textContent = state.streak;

    const homeEl = document.getElementById('home-tasks');
    homeEl.innerHTML = '';
    pending.forEach(t => homeEl.appendChild(pill(t)));

    const tPend = document.getElementById('tasks-pending-count');
    const tDone = document.getElementById('tasks-done-count');
    if (tPend) tPend.textContent = pending.length;
    if (tDone) tDone.textContent = dn.length;

    const allEl = document.getElementById('all-tasks');
    allEl.innerHTML = '';
    state.tasks.forEach(t => allEl.appendChild(pill(t)));
}

function pill(t) {
    const d = document.createElement('div');
    d.className = `task-pill ${t.status === 'done' ? 'done' : ''}`;
    d.innerHTML = `
        <div class="pill-check"></div>
        <div>
            <div class="pill-text">${t.title}</div>
            <div class="pill-meta">${t.status === 'done' ? 'Completed' : '15 mins'}</div>
        </div>
    `;
    if (t.status !== 'done') d.onclick = () => done(t.id);
    return d;
}

// ── Enhanced Chat Engine ──────────────────────────────
async function chat() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    addBubble('user', text);
    typing(true);

    const history = state.messages.map(m => ({ type: m.type, text: m.text }));
    const data = await api('/chat', { method: 'POST', body: JSON.stringify({ message: text, history }) });

    typing(false);

    if (data) {
        // Always render the main AI reply
        addBubble('ai', data.reply);

        // If the AI generated action tasks, render them as interactive command menus
        if (data.actionTasks?.length) {
            renderActionCard(data.actionTasks);
            await load(); render();
        }
    } else {
        addBubble('ai', "Having trouble connecting. Stay focused! 🚀");
    }
}

function addBubble(type, text) {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    state.messages.push({ type, text });
    const log = document.getElementById('chat-log');

    if (type === 'user') {
        const wrap = document.createElement('div');
        wrap.className = 'msg-wrap-user';
        wrap.innerHTML = `
            <div class="msg-user">${text}</div>
            <div class="msg-time">YOU • ${now}</div>
        `;
        log.appendChild(wrap);
    } else {
        const wrap = document.createElement('div');
        wrap.className = 'msg-wrap-ai';
        const bubble = document.createElement('div');
        bubble.className = 'msg-ai';
        typewriter(bubble, text, 10);
        wrap.appendChild(bubble);

        const time = document.createElement('div');
        time.className = 'msg-time';
        time.textContent = `AI MENTOR • ${now}`;
        wrap.appendChild(time);

        log.appendChild(wrap);
    }

    log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
}

function renderInsight(text) {
    const log = document.getElementById('chat-log');
    const card = document.createElement('div');
    card.className = 'insight-card';
    card.innerHTML = `
        <div class="insight-badge">MENTOR INSIGHT</div>
        <div class="insight-text">"${text}"</div>
    `;
    log.appendChild(card);
    log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
}

function renderActionCard(tasks) {
    const log = document.getElementById('chat-log');
    const card = document.createElement('div');
    card.className = 'action-card';
    card.innerHTML = `<div class="action-card-text">Here are your new tasks. Mark them as you go:</div>`;

    tasks.forEach(t => {
        const row = document.createElement('div');
        row.className = 'action-row';
        row.innerHTML = `
            <div><span class="action-cmd">/done</span> <span class="action-label">${t.title}</span></div>
        `;
        row.onclick = async () => {
            await done(t.id);
            row.style.opacity = '0.4'; row.style.pointerEvents = 'none';
        };
        card.appendChild(row);
    });

    log.appendChild(card);
    log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
}

function typewriter(el, text, speed) {
    let i = 0;
    (function type() {
        if (i < text.length) { el.textContent += text[i++]; setTimeout(type, speed); }
    })();
}

function typing(show) {
    const log = document.getElementById('chat-log');
    if (show) {
        const d = document.createElement('div');
        d.id = 'typing-ind';
        d.style = 'display:flex; gap:6px; padding:1rem; background:#16161f; border-radius:20px; width:fit-content; border:1px solid #222;';
        d.innerHTML = '<div class="dot"></div><div class="dot" style="animation-delay:0.2s"></div><div class="dot" style="animation-delay:0.4s"></div>';
        log.appendChild(d);
    } else {
        const e = document.getElementById('typing-ind'); if (e) e.remove();
    }
    log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
}

async function generate() {
    // Obsolete - removed to prevent unintended view switches
}

init();
