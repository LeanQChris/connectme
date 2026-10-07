/**
 * ConnectMe website chat widget.
 *
 * Dropped on a customer's site with one script tag:
 *   <script src="https://app.example.com/widget.js?wid=wgt_…" async></script>
 *
 * No framework, no build step, served straight from /public. Everything lives in a
 * shadow root so the host page's CSS cannot reach in and ours cannot leak out.
 * Replies are pulled: the panel polls while it is open, and a closed tab collects
 * whatever was waiting when it comes back.
 */
(function () {
  "use strict";

  var script = document.currentScript;
  if (!script) return;
  var WID = new URL(script.src).searchParams.get("wid");
  if (!WID) return;

  var ORIGIN = new URL(script.src).origin;
  var API = ORIGIN + "/api/widget";
  var STORE = "cmw." + WID;
  var POLL_MS = 2500;

  var session = load();
  var token = session.token || null;
  var sid = session.sid || null;
  var name = session.name || "";
  var open = false;
  var unread = 0;
  var lastFlashed = 0;

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORE) || "{}") || {};
    } catch {
      return {};
    }
  }

  function newSid() {
    return (
      (self.crypto && self.crypto.randomUUID
        ? self.crypto.randomUUID()
        : String(Date.now()) + Math.random().toString(36).slice(2)) || ""
    )
      .replace(/-/g, "")
      .slice(0, 32);
  }

  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify({ token: token, sid: sid, name: name }));
    } catch {
      /* private mode: the widget still works, the session just won't persist */
    }
  }

  function api(path, options) {
    return fetch(API + path, Object.assign({ cache: "no-store" }, options)).then(function (res) {
      if (res.status === 401 || res.status === 404) throw new Error("session");
      if (!res.ok) throw new Error("request failed");
      return res.json();
    });
  }

  /* ------------------------------------------------------------------ shadow */

  var host = document.createElement("div");
  host.setAttribute("data-connectme-widget", "");
  host.style.position = "fixed";
  host.style.right = "20px";
  host.style.bottom = "20px";
  host.style.zIndex = "2147483000";

  var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
  var style = document.createElement("style");
  style.textContent = [
    ":host{all:initial}",
    "*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}",
    "button{font:inherit;cursor:pointer;border:0;background:none;color:inherit}",
    "#launcher{width:56px;height:56px;border-radius:50%;background:#111827;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,.24);transition:transform .15s}",
    "#launcher:hover{transform:scale(1.05)}",
    "#launcher svg{width:26px;height:26px;fill:currentColor}",
    "#badge{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:#ef4444;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center}",
    "#panel{display:none;flex-direction:column;position:absolute;right:0;bottom:68px;width:340px;max-width:calc(100vw - 32px);height:440px;max-height:calc(100vh - 110px);background:#fff;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.22);overflow:hidden}",
    "#panel.open{display:flex}",
    "#head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;background:#111827;color:#fff}",
    "#head strong{font-size:14px;font-weight:600}",
    "#head small{display:block;font-size:11px;opacity:.7;margin-top:2px}",
    "#close{font-size:20px;line-height:1;opacity:.7;padding:2px 6px}",
    "#log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#f9fafb}",
    ".row{display:flex}",
    ".in{justify-content:flex-start}",
    ".out{justify-content:flex-end}",
    ".bubble{max-width:78%;padding:8px 11px;border-radius:14px;font-size:13.5px;line-height:1.4;white-space:pre-wrap;overflow-wrap:anywhere}",
    ".in .bubble{background:#fff;border:1px solid #e5e7eb;border-bottom-left-radius:4px;color:#111827}",
    ".out .bubble{background:#111827;color:#fff;border-bottom-right-radius:4px}",
    ".bubble img{max-width:100%;border-radius:8px;display:block}",
    "#form{display:flex;gap:8px;padding:10px;border-top:1px solid #e5e7eb;background:#fff}",
    "#text{flex:1;min-width:0;height:38px;padding:0 12px;border:1px solid #d1d5db;border-radius:19px;font-size:13.5px;outline:none;color:#111827}",
    "#text:focus{border-color:#111827}",
    "#send{width:38px;height:38px;border-radius:50%;background:#111827;color:#fff;font-size:16px;flex:none}",
    "#clip{width:38px;height:38px;border-radius:50%;color:#6b7280;font-size:17px;flex:none;display:flex;align-items:center;justify-content:center}",
    "#clip:hover{background:#f3f4f6}",
    "#previews{display:flex;flex-wrap:wrap;gap:6px;padding:8px 10px 0;background:#fff}",
    ".chip{position:relative;max-width:120px;padding:4px 20px 4px 8px;border:1px solid #e5e7eb;border-radius:8px;font-size:11px;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".chip button{position:absolute;right:2px;top:2px;color:#9ca3af;font-size:12px;line-height:1}",
    ".bubble audio,.bubble video{max-width:100%;display:block;margin-top:4px}",
    ".bubble a{color:inherit;text-decoration:underline}",
    "@media(prefers-color-scheme:dark){#previews{background:#111827}.chip{border-color:#374151;color:#d1d5db}#clip:hover{background:#1f2937}}",
    "#send:disabled{opacity:.4;cursor:default}",
    "#err{padding:0 14px 8px;font-size:11.5px;color:#b91c1c;background:#fff;display:none}",
    "@media(prefers-color-scheme:dark){#panel,#form{background:#111827}#panel{border:1px solid #374151}#head{background:#030712}#log{background:#0b1220}#text{background:#111827;border-color:#374151;color:#f9fafb}.in .bubble{background:#1f2937;border-color:#374151;color:#f9fafb}}",
  ].join("");

  function el(tag, id) {
    var node = document.createElement(tag);
    if (id) node.id = id;
    return node;
  }

  root.appendChild(style);

  var panel = el("div", "panel");
  var head = el("div", "head");
  var titles = el("div");
  var title = el("strong");
  title.textContent = "Live chat";
  var subtitle = el("small");
  subtitle.textContent = "We usually reply in a few minutes";
  titles.appendChild(title);
  titles.appendChild(subtitle);
  var close = el("button", "close");
  close.type = "button";
  close.setAttribute("aria-label", "Close chat");
  close.textContent = "×";
  head.appendChild(titles);
  head.appendChild(close);

  var log = el("div", "log");
  log.setAttribute("role", "log");

  var previews = el("div", "previews");
  var pendingFiles = [];

  var err = el("div", "err");

  var form = el("form", "form");
  var input = el("input", "text");
  input.type = "text";
  input.placeholder = "Type a message…";
  input.setAttribute("aria-label", "Message");
  var send = el("button", "send");
  send.type = "submit";
  send.textContent = "→";

  var clip = el("button", "clip");
  clip.type = "button";
  clip.setAttribute("aria-label", "Attach a file");
  clip.textContent = "📎";
  var fileInput = el("input");
  fileInput.type = "file";
  fileInput.multiple = true;
  fileInput.style.display = "none";

  form.appendChild(clip);
  form.appendChild(fileInput);
  form.appendChild(input);
  form.appendChild(send);

  panel.appendChild(head);
  panel.appendChild(log);
  panel.appendChild(err);
  panel.appendChild(previews);
  panel.appendChild(form);

  function renderPreviews() {
    previews.innerHTML = "";
    pendingFiles.forEach(function (f, i) {
      var chip = el("span", "chip");
      chip.textContent = f.name.length > 18 ? f.name.slice(0, 16) + "…" : f.name;
      var x = el("button");
      x.type = "button";
      x.textContent = "×";
      x.addEventListener("click", function () {
        pendingFiles.splice(i, 1);
        renderPreviews();
      });
      chip.appendChild(x);
      previews.appendChild(chip);
    });
  }

  clip.addEventListener("click", function () {
    fileInput.click();
  });
  fileInput.addEventListener("change", function () {
    for (var i = 0; i < fileInput.files.length; i++) {
      if (pendingFiles.length >= 10) break;
      pendingFiles.push(fileInput.files[i]);
    }
    fileInput.value = "";
    renderPreviews();
  });

  var launcher = el("button", "launcher");
  launcher.type = "button";
  launcher.setAttribute("aria-label", "Open chat");
  launcher.innerHTML =
    '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM7 9h10v2H7V9zm6 5H7v-2h6v2zm4-6H7V6h10v2z"/></svg>';
  var badge = el("span", "badge");
  badge.style.display = "none";
  launcher.appendChild(badge);

  var anchor = el("div");
  anchor.style.position = "relative";
  anchor.appendChild(panel);
  anchor.appendChild(launcher);
  host.appendChild(anchor);

  function mount() {
    if (!document.body) return document.addEventListener("DOMContentLoaded", mount);
    document.body.appendChild(host);
  }

  /* ------------------------------------------------------------------ render */

  function bubble(item, mine) {
    var row = el("div", mine ? "row out" : "row in");
    var wrap = el("div", "bubble");
    if (item.text) wrap.appendChild(document.createTextNode(item.text));

    var mediaItems = item.media && item.media.length ? item.media : item.mediaUrl ? [{ url: item.mediaUrl, type: item.type }] : [];
    mediaItems.forEach(function (m) {
      var src = m.url && m.url[0] === "/" ? ORIGIN + m.url : m.url;
      if (!src) return;
      if (m.type === "image" || m.type === "sticker" || (!m.type && item.type === "text")) {
        var img = el("img");
        img.src = src;
        img.alt = m.name || "Attachment";
        img.loading = "lazy";
        wrap.appendChild(img);
      } else if (m.type === "audio") {
        var au = el("audio");
        au.src = src;
        au.controls = true;
        wrap.appendChild(au);
      } else if (m.type === "video") {
        var vi = el("video");
        vi.src = src;
        vi.controls = true;
        wrap.appendChild(vi);
      } else {
        var link = el("a");
        link.href = src;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = "📎 " + (m.name || "Attachment");
        wrap.appendChild(link);
      }
    });

    row.appendChild(wrap);
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  function unreadBadge() {
    if (unread > 0) {
      badge.textContent = unread > 9 ? "9+" : String(unread);
      badge.style.display = "flex";
    } else {
      badge.style.display = "none";
    }
  }

  function flashTitle() {
    var base = document.title;
    var tick = function () {
      document.title = unread > 0 ? "● (" + unread + ") " + base : base;
      lastFlashed = Date.now();
    };
    tick();
    setTimeout(function () {
      document.title = base;
    }, 1200);
  }

  /* ------------------------------------------------------------------ session */

  function authenticate() {
    if (token) return Promise.resolve();
    if (!sid) sid = newSid();
    return api("/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ widgetId: WID, sid: sid }),
    })
      .then(function (body) {
        token = body.token;
        save();
      })
      .catch(function () {
        err.textContent = "Chat is unavailable right now.";
        err.style.display = "block";
      });
  }

  function askName() {
    if (name) return Promise.resolve();
    var asked = window.prompt("What is your name?");
    name = (asked || "").trim().slice(0, 80);
    save();
    return Promise.resolve();
  }

  /* ------------------------------------------------------------------ traffic */

  function postMessage() {
    var text = input.value.trim();
    if ((!text && pendingFiles.length === 0) || !token) return Promise.resolve();

    var files = pendingFiles.slice();
    input.value = "";
    pendingFiles = [];
    renderPreviews();
    send.disabled = true;
    err.style.display = "none";

    return authenticate()
      .then(askName)
      .then(function () {
        var uploads = files.map(function (f) {
          var form = new FormData();
          form.append("file", f);
          return api("/upload", {
            method: "POST",
            headers: { authorization: "Bearer " + token },
            body: form,
          }).then(function (body) {
            return body.media;
          });
        });
        return Promise.all(uploads);
      })
      .then(function (media) {
        return api("/message", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: "Bearer " + token },
          body: JSON.stringify({ text: text, name: name, media: media }),
        }).then(function () {
          return media;
        });
      })
      .then(function (media) {
        bubble({ text: text, type: media && media.length ? media[0].type : "text", media: media }, true);
      })
      .catch(function () {
        err.textContent = "Message could not be sent. Try again.";
        err.style.display = "block";
        input.value = text;
        pendingFiles = files;
        renderPreviews();
      })
      .then(function () {
        send.disabled = false;
        input.focus();
      });
  }

  var failures = 0;

  function pollDelay() {
    return failures === 0 ? POLL_MS : Math.min(POLL_MS * Math.pow(2, failures), 15000);
  }

  function poll() {
    if (!token) return;
    api("/poll", { headers: { authorization: "Bearer " + token } })
      .then(function (body) {
        failures = 0;
        var messages = body.messages || [];
        if (!messages.length) return;

        messages.forEach(function (item) {
          bubble(item, false);
          if (!open) {
            unread += 1;
            unreadBadge();
            if (Date.now() - lastFlashed > 4000) flashTitle();
          }
        });
      })
      .catch(function () {
        failures += 1;
      });
  }

  function pollLoop() {
    if (open) {
      poll();
      setTimeout(pollLoop, pollDelay());
    } else {
      setTimeout(pollLoop, POLL_MS);
    }
  }

  /* ------------------------------------------------------------------ wiring */

  function toggle() {
    open = !open;
    panel.className = open ? "panel open" : "panel";
    if (open) {
      unread = 0;
      unreadBadge();
      poll();
    }
  }

  launcher.addEventListener("click", function () {
    authenticate().then(function () {
      toggle();
    });
  });
  close.addEventListener("click", function () {
    open = false;
    panel.className = "panel";
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    void postMessage();
  });

  mount();
  authenticate().then(poll);
  setTimeout(pollLoop, POLL_MS);
})();