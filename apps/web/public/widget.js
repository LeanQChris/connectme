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
  let pendingAttachment = null;

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
    .cm-attach-btn {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      width: 30px;
      height: 36px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .cm-attach-btn:hover { color: #0f172a; }
    .cm-chip-row { padding: 8px 16px 0; }
    .cm-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 4px 8px;
      font-size: 12px;
      color: #334155;
      max-width: 100%;
    }
    .cm-chip-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }
    .cm-chip-remove { background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 14px; line-height: 1; padding: 0; }
    .cm-chip-remove:hover { color: #0f172a; }
    .cm-attach-error { color: #b91c1c; font-size: 12px; padding: 6px 16px 0; }
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
      <div class="cm-chip-row" id="cm-chip-row" style="display:none;">
        <span class="cm-chip">
          <span class="cm-chip-name" id="cm-chip-name"></span>
          <button type="button" class="cm-chip-remove" id="cm-chip-remove" aria-label="Remove attachment">&times;</button>
        </span>
      </div>
      <div class="cm-attach-error" id="cm-attach-error" style="display:none;"></div>
      <form class="cm-footer" id="cm-form">
        <input type="file" id="cm-file" accept="image/*,video/*,audio/*,.pdf,.txt" style="display:none" />
        <button type="button" class="cm-attach-btn" id="cm-attach" title="Attach a file" aria-label="Attach a file">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
        </button>
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
  const fileInput = document.getElementById("cm-file");
  const attachBtn = document.getElementById("cm-attach");
  const chipRow = document.getElementById("cm-chip-row");
  const chipName = document.getElementById("cm-chip-name");
  const chipRemove = document.getElementById("cm-chip-remove");
  const attachError = document.getElementById("cm-attach-error");

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

  function showAttachError(message) {
    attachError.textContent = message;
    attachError.style.display = message ? "block" : "none";
  }

  function setAttachment(att) {
    pendingAttachment = att;
    if (att) {
      chipName.textContent = att.name;
      chipRow.style.display = "block";
    } else {
      chipRow.style.display = "none";
    }
    showAttachError("");
  }

  function guessKind(file) {
    const type = (file.type || "").toLowerCase();
    if (type.startsWith("image/")) return "image";
    if (type.startsWith("video/")) return "video";
    if (type.startsWith("audio/")) return "audio";
    return "document";
  }

  /**
   * Ask the API for a presigned URL, then PUT the bytes straight to storage.
   * The declared size is signed into the URL server-side, so an oversized file
   * fails signature verification rather than being silently accepted.
   */
  async function uploadFile(file) {
    await initSession();
    if (!sessionToken) throw new Error("No active session");

    const presignRes = await fetch(`${apiBase}/api/widget/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
      body: JSON.stringify({ filename: file.name, size: file.size, contentType: file.type }),
    });
    if (!presignRes.ok) {
      const detail = await presignRes.json().catch(() => ({}));
      throw new Error(detail.message || "Upload rejected");
    }
    const presign = await presignRes.json();

    const putRes = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!putRes.ok) throw new Error(`Storage upload failed (HTTP ${putRes.status})`);

    return {
      url: presign.publicUrl,
      name: file.name,
      size: file.size,
      type: guessKind(file),
      mimeType: file.type || "application/octet-stream",
    };
  }

  function renderMessages(msgs) {
    list.innerHTML = `<div class="cm-msg cm-msg-out">Hello! How can we help you today?</div>`;
    // messages arrive newest first or oldest first
    const sorted = [...msgs].reverse();
    for (const m of sorted) {
      const el = document.createElement("div");
      el.className = `cm-msg ${m.direction === "INBOUND" ? "cm-msg-in" : "cm-msg-out"}`;
      // media[] is canonical; the single mediaUrl field was retired.
      const attachments = Array.isArray(m.media) ? m.media.length : 0;
      const label = attachments > 1 ? `${attachments} attachments` : attachments ? "Attachment" : "";
      el.textContent = m.text || label;
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

  attachBtn.addEventListener("click", () => fileInput.click());
  chipRemove.addEventListener("click", () => {
    fileInput.value = "";
    setAttachment(null);
  });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    showAttachError("");
    try {
      setAttachment(await uploadFile(file));
    } catch (err) {
      setAttachment(null);
      showAttachError(err && err.message ? err.message : "Upload failed");
    }
    fileInput.value = "";
  });

  btn.addEventListener("click", toggleWidget);
  closeBtn.addEventListener("click", toggleWidget);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if ((!text && !pendingAttachment) || isSending) return;

    await initSession();
    if (!sessionToken) return;

    input.value = "";
    isSending = true;

    // Optimistic message
    const temp = document.createElement("div");
    temp.className = "cm-msg cm-msg-in";
    temp.textContent = text || (pendingAttachment ? "Attachment" : "");
    list.appendChild(temp);
    list.scrollTop = list.scrollHeight;

    try {
      await fetch(`${apiBase}/api/widget/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(pendingAttachment ? { text, media: [pendingAttachment] } : { text }),
      });
      setAttachment(null);
      fetchMessages();
    } catch {
      temp.style.opacity = "0.6";
      temp.title = "Failed to send";
    } finally {
      isSending = false;
    }
  });
})();
