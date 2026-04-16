/**
 * chat-widget.js — Maquiler
 * Reemplaza el botón flotante de WhatsApp por una ventana de chat
 * que invita al usuario a escribir antes de abrir WhatsApp.
 */
(() => {
  function initChatWidget() {
    // Ocultar el botón flotante original
    const oldBtn = document.querySelector(".floating-whatsapp");
    if (oldBtn) oldBtn.style.display = "none";

    // Leer número y mensaje del sistema existente
    const App = window.MaquilerApp;
    let waNumber = "595972848607";
    let waTemplate = "Hola, quiero reservar la mini cargadora.";
    let businessName = "Maquiler";

    if (App?.getState) {
      try {
        const state = App.getState();
        const machine = App.getActiveMachine?.(state) || state?.machines?.[0];
        if (machine?.config?.whatsappNumber) waNumber = machine.config.whatsappNumber.replace(/\D/g, "");
        if (machine?.config?.whatsappMessageTemplate) waTemplate = machine.config.whatsappMessageTemplate;
        if (machine?.config?.businessName) businessName = machine.config.businessName;
      } catch (e) {}
    }

    // ── Estilos ───────────────────────────────────────────────
    const style = document.createElement("style");
    style.textContent = `
      .cw-wrap {
        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 9999;
        font-family: 'Archivo', sans-serif;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 12px;
      }

      /* ── Ventana ── */
      .cw-window {
        width: 320px;
        border-radius: 20px;
        background: #1a1814;
        border: 1px solid rgba(255,255,255,0.1);
        box-shadow: 0 24px 60px rgba(0,0,0,0.6);
        overflow: hidden;
        transform-origin: bottom right;
        transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease;
        transform: scale(0.85) translateY(12px);
        opacity: 0;
        pointer-events: none;
      }
      .cw-window.cw-open {
        transform: scale(1) translateY(0);
        opacity: 1;
        pointer-events: all;
      }

      /* ── Header ── */
      .cw-header {
        background: linear-gradient(135deg, #f2b41e, #ffca3a);
        padding: 16px 18px;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .cw-avatar {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: rgba(0,0,0,0.18);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        font-size: 1.3rem;
      }
      .cw-header-info { flex: 1; }
      .cw-header-name {
        font-weight: 700;
        font-size: 0.95rem;
        color: #111;
        display: block;
      }
      .cw-header-status {
        font-size: 0.75rem;
        color: rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        gap: 5px;
        margin-top: 1px;
      }
      .cw-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #1a7a3c;
        display: inline-block;
      }
      .cw-close {
        background: none;
        border: none;
        cursor: pointer;
        color: rgba(0,0,0,0.5);
        font-size: 1.3rem;
        line-height: 1;
        padding: 0;
        display: flex;
        align-items: center;
      }
      .cw-close:hover { color: #111; }

      /* ── Mensajes ── */
      .cw-messages {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        background: #111009;
        min-height: 120px;
      }
      .cw-bubble {
        max-width: 85%;
        padding: 10px 14px;
        border-radius: 16px 16px 16px 4px;
        background: #2a2620;
        color: #f0ece3;
        font-size: 0.875rem;
        line-height: 1.5;
        border: 1px solid rgba(255,255,255,0.07);
        animation: cw-pop 0.3s cubic-bezier(0.34,1.56,0.64,1);
      }
      .cw-bubble strong { color: #f2b41e; }
      @keyframes cw-pop {
        from { transform: scale(0.8) translateY(6px); opacity: 0; }
        to   { transform: scale(1) translateY(0);    opacity: 1; }
      }

      /* ── Input ── */
      .cw-input-row {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        padding: 12px 14px;
        background: #1a1814;
        border-top: 1px solid rgba(255,255,255,0.07);
      }
      .cw-input {
        flex: 1;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 12px;
        color: #f0ece3;
        font-family: 'Archivo', sans-serif;
        font-size: 0.875rem;
        padding: 10px 14px;
        resize: none;
        outline: none;
        min-height: 42px;
        max-height: 100px;
        line-height: 1.4;
        transition: border-color 0.15s;
      }
      .cw-input:focus { border-color: rgba(242,180,30,0.5); }
      .cw-input::placeholder { color: rgba(255,255,255,0.3); }
      .cw-send {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: linear-gradient(135deg, #25d366, #128c4f);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: transform 0.15s, box-shadow 0.15s;
        box-shadow: 0 4px 14px rgba(37,211,102,0.35);
      }
      .cw-send:hover { transform: scale(1.08); box-shadow: 0 6px 18px rgba(37,211,102,0.45); }
      .cw-send svg { width: 18px; height: 18px; fill: #fff; }

      /* ── Nota ── */
      .cw-note {
        text-align: center;
        font-size: 0.7rem;
        color: rgba(255,255,255,0.25);
        padding: 0 14px 10px;
        background: #1a1814;
      }

      /* ── Botón flotante ── */
      .cw-fab {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #25d366, #128c4f);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 6px 24px rgba(37,211,102,0.45);
        transition: transform 0.2s, box-shadow 0.2s;
        position: relative;
      }
      .cw-fab:hover { transform: scale(1.08); box-shadow: 0 8px 28px rgba(37,211,102,0.55); }
      .cw-fab svg { width: 28px; height: 28px; fill: #fff; transition: transform 0.2s; }
      .cw-fab.cw-open svg { transform: rotate(90deg); }

      /* ── Badge de notificación ── */
      .cw-badge {
        position: absolute;
        top: -2px;
        right: -2px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #f2b41e;
        color: #111;
        font-size: 0.72rem;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #0d0c09;
        animation: cw-bounce 1.2s ease infinite;
      }
      .cw-badge.cw-hidden { display: none; }
      @keyframes cw-bounce {
        0%, 100% { transform: scale(1); }
        50%       { transform: scale(1.2); }
      }

      @media (max-width: 400px) {
        .cw-window { width: calc(100vw - 32px); }
        .cw-wrap { right: 12px; bottom: 12px; }
      }
    `;
    document.head.appendChild(style);

    // ── HTML ─────────────────────────────────────────────────
    const wrap = document.createElement("div");
    wrap.className = "cw-wrap";
    wrap.innerHTML = `
      <div class="cw-window" id="cw-window">
        <div class="cw-header">
          <div class="cw-avatar">🚜</div>
          <div class="cw-header-info">
            <span class="cw-header-name">${businessName}</span>
            <span class="cw-header-status"><span class="cw-dot"></span> Normalmente responde rápido</span>
          </div>
          <button class="cw-close" id="cw-close" aria-label="Cerrar">✕</button>
        </div>
        <div class="cw-messages" id="cw-messages">
          <div class="cw-bubble">
            ¡Hola! 👋 ¿En qué podemos ayudarte hoy?<br/>
            <strong>Reservá la mini cargadora</strong> para tu obra o trabajo.
          </div>
        </div>
        <div class="cw-input-row">
          <textarea
            class="cw-input"
            id="cw-input"
            placeholder="Escribí tu consulta..."
            rows="1"
          ></textarea>
          <button class="cw-send" id="cw-send" aria-label="Enviar por WhatsApp">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
        <div class="cw-note">Continúa la conversación en WhatsApp</div>
      </div>

      <button class="cw-fab" id="cw-fab" aria-label="Abrir chat">
        <svg viewBox="0 0 24 24">
          <path d="M20 11.5A8.5 8.5 0 005.7 5.4 8.4 8.4 0 004 16.7L3 21l4.5-1.2A8.5 8.5 0 1020 11.5z"/>
        </svg>
        <span class="cw-badge" id="cw-badge">1</span>
      </button>
    `;
    document.body.appendChild(wrap);

    // ── Lógica ───────────────────────────────────────────────
    const win   = document.getElementById("cw-window");
    const fab   = document.getElementById("cw-fab");
    const close = document.getElementById("cw-close");
    const input = document.getElementById("cw-input");
    const send  = document.getElementById("cw-send");
    const badge = document.getElementById("cw-badge");
    let isOpen  = false;

    function toggle() {
      isOpen = !isOpen;
      win.classList.toggle("cw-open", isOpen);
      fab.classList.toggle("cw-open", isOpen);
      badge.classList.add("cw-hidden");
      if (isOpen) setTimeout(() => input.focus(), 250);
    }

    function sendMessage() {
      const text = input.value.trim();
      const msg  = text || waTemplate;
      const url  = `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`;
      window.open(url, "_blank", "noopener,noreferrer");
      input.value = "";
    }

    fab.addEventListener("click", toggle);
    close.addEventListener("click", toggle);
    send.addEventListener("click", sendMessage);

    // Enter envía, Shift+Enter hace salto de línea
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Auto-resize del textarea
    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 100) + "px";
    });

    // Abrir automáticamente después de 4 segundos (solo una vez)
    const autoShown = sessionStorage.getItem("cw-autoshown");
    if (!autoShown) {
      setTimeout(() => {
        if (!isOpen) toggle();
        sessionStorage.setItem("cw-autoshown", "1");
      }, 4000);
    }
  }

  // Esperar a que la app cargue
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initChatWidget);
  } else {
    initChatWidget();
  }

  // Re-inicializar si la app hace re-render
  window.addEventListener("storage", () => {
    setTimeout(() => {
      const existing = document.querySelector(".cw-wrap");
      if (!existing) initChatWidget();
      else {
        const oldBtn = document.querySelector(".floating-whatsapp");
        if (oldBtn) oldBtn.style.display = "none";
      }
    }, 100);
  });
})();
