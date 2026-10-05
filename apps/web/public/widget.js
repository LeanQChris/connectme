(function () {
  if (window.__ConnectMeWidgetLoaded) return;
  window.__ConnectMeWidgetLoaded = true;

  const scriptTag = document.currentScript || document.querySelector("script[data-tenant-id]");
  const tenantId = scriptTag?.getAttribute("data-tenant-id") || window.ConnectMeTenantId || "default";
  const apiBase = scriptTag?.getAttribute("data-api-base") || window.ConnectMeApiBase || (window.location.origin);

  const STORAGE_KEY = `connectme_widget_${tenantId}`;
  let sessionToken = null;
  let conversationId = null;
  let isOpen = false;
  let pollTimer = null;
  let isSending = false;

  // Load existing session
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (saved.token) {
      sessionToken = saved.token;
      conversationId = saved.conversationId;
    }
  } catch {}

  // Styles
  const style = document.createElement("style");
  style.textContent = `
    #cm-widget-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    #cm-widget-btn {
      width: 58px;
      height: 58px;
      border-radius: 50%;
      background: #0f172a;
      color: #ffffff;
      border: 1px solid rgba(255,255,255,0.15);
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3), 0 8px 10px -6px rgba(0,0,0,0.3);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    #cm-widget-btn:hover {
      transform: scale(1.06);
      background: #1e293b;
    }
    #cm-widget-window {
      position: absolute;
      bottom: 72px;
      right: 0;
      width: 380px;
      height: 560px;
      max-height: calc(100vh - 120px);
      background: #ffffff;
      border-radius: 18px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 20px 40px -10px rgba(0,0,0,0.25);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      transform: translateY(16px) scale(0.96);
      pointer-events: none;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    #cm-widget-window.cm-open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }
    .cm-header {
      background: #0f172a;
      color: #ffffff;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .cm-header-title {
      font-weight: 600;
      font-size: 15px;
    }
    .cm-header-status {
      font-size: 12px;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .cm-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
    }
    .cm-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .cm-msg {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 13.5px;
      line-height: 1.45;
      word-break: break-word;
    }
    .cm-msg-in {
      align-self: flex-end;
      background: #0f172a;
      color: #ffffff;
      border-bottom-right-radius: 3px;
    }
    .cm-msg-out {
      align-self: flex-start;
      background: #ffffff;
      color: #0f172a;
      border: 1px solid #e2e8f0;
      border-bottom-left-radius: 3px;
    }
    .cm-footer {
      padding: 12px 16px;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .cm-input {
      flex: 1;
      border: 1px solid #cbd5e1;
      border-radius: 20px;
      padding: 8px 14px;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }
    .cm-input:focus {
      border-color: #0f172a;
    }
    .cm-send-btn {
      background: #0f172a;
      color: #ffffff;
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    @media (max-width: 480px) {
      #cm-widget-window {
        width: calc(100vw - 32px);
        right: -8px;
        height: calc(100vh - 100px);
      }
    }
  `;
  document.head.appendChild(style);

  // Widget DOM
  const container = document.createElement("div");
  container.id = "cm-widget-container";
  container.innerHTML = `
    <div id="cm-widget-window">
      <div class="cm-header">
        <div>
          <div class="cm-header-title">Chat with us</div>
          <div class="cm-header-status"><span class="cm-status-dot"></span> Online</div>
        </div>
        <button id="cm-close-btn" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:18px;">&times;</button>
      </div>
      <div class="cm-messages" id="cm-messages-list">
        <div class="cm-msg cm-msg-out">Hello! How can we help you today?</div>
      </div>
      <form class="cm-footer" id="cm-form">
        <input type="text" class="cm-input" id="cm-input" placeholder="Type your message..." autocomplete="off" />
        <button type="submit" class="cm-send-btn" id="cm-send">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        </button>
      </form>
    </div>
    <button id="cm-widget-btn" aria-label="Open support chat">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    </button>
  `;
  document.body.appendChild(container);

  const btn = document.getElementById("cm-widget-btn");
  const win = document.getElementById("cm-widget-window");
  const closeBtn = document.getElementById("cm-close-btn");
  const form = document.getElementById("cm-form");
  const input = document.getElementById("cm-input");
  const list = document.getElementById("cm-messages-list");

  async function initSession() {
    if (sessionToken) return;
    try {
      const res = await fetch(`${apiBase}/api/widget/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      if (res.ok) {
        const data = await res.json();
        sessionToken = data.sessionToken;
        conversationId = data.conversationId;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: sessionToken, conversationId }));
      }
    } catch (e) {
      console.error("ConnectMe Widget session error:", e);
    }
  }

  async function fetchMessages() {
    if (!sessionToken) return;
    try {
      const res = await fetch(`${apiBase}/api/widget/messages`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          renderMessages(data.messages);
        }
      }
    } catch {}
  }

  function renderMessages(msgs) {
    list.innerHTML = `<div class="cm-msg cm-msg-out">Hello! How can we help you today?</div>`;
    // messages arrive newest first or oldest first
    const sorted = [...msgs].reverse();
    for (const m of sorted) {
      const el = document.createElement("div");
      el.className = `cm-msg ${m.direction === "INBOUND" ? "cm-msg-in" : "cm-msg-out"}`;
      el.textContent = m.text || (m.mediaUrl ? "Attachment" : "");
      list.appendChild(el);
    }
    list.scrollTop = list.scrollHeight;
  }

  function toggleWidget() {
    isOpen = !isOpen;
    if (isOpen) {
      win.classList.add("cm-open");
      initSession().then(fetchMessages);
      pollTimer = setInterval(fetchMessages, 3000);
      setTimeout(() => input.focus(), 150);
    } else {
      win.classList.remove("cm-open");
      if (pollTimer) clearInterval(pollTimer);
    }
  }

  btn.addEventListener("click", toggleWidget);
  closeBtn.addEventListener("click", toggleWidget);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || isSending) return;

    await initSession();
    if (!sessionToken) return;

    input.value = "";
    isSending = true;

    // Optimistic message
    const temp = document.createElement("div");
    temp.className = "cm-msg cm-msg-in";
    temp.textContent = text;
    list.appendChild(temp);
    list.scrollTop = list.scrollHeight;

    try {
      await fetch(`${apiBase}/api/widget/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ text }),
      });
      fetchMessages();
    } catch {
      temp.style.opacity = "0.6";
      temp.title = "Failed to send";
    } finally {
      isSending = false;
    }
  });
})();
