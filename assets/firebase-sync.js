/**
 * firebase-sync.js — Maquiler
 * Doble mecanismo: intercepción de localStorage + intervalo de respaldo
 */
(() => {
  const FIREBASE_CONFIG = {
    apiKey:            "AIzaSyCgkKYrnxCCyImkIc3lMin4acrLKzr4mlQ",
    authDomain:        "maquiler-b35dc.firebaseapp.com",
    projectId:         "maquiler-b35dc",
    storageBucket:     "maquiler-b35dc.firebasestorage.app",
    messagingSenderId: "506992586359",
    appId:             "1:506992586359:web:a395756d063cbf74042072",
  };

  const CLOUDINARY_CLOUD  = "dxxyibglf";
  const CLOUDINARY_PRESET = "galeria_maquiler";
  const STORAGE_KEY       = "maquiler-site-v2";

  let db           = null;
  let lastSaved    = null; // evita guardar dos veces lo mismo
  let isSaving     = false;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement("script");
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function loadFirebase() {
    const base = "https://www.gstatic.com/firebasejs/10.12.2";
    await loadScript(`${base}/firebase-app-compat.js`);
    await loadScript(`${base}/firebase-firestore-compat.js`);
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
  }

  // ── Subir foto base64 a Cloudinary ───────────────────────
  async function uploadBase64(dataUrl) {
    const form = new FormData();
    form.append("file", dataUrl);
    form.append("upload_preset", CLOUDINARY_PRESET);
    form.append("folder", "maquiler/galeria");
    const res  = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
      { method: "POST", body: form }
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.secure_url;
  }

  // ── Convertir base64 → Cloudinary en el estado ───────────
  async function resolvePhotos(state) {
    const s = JSON.parse(JSON.stringify(state));
    let changed = false;
    for (const machine of (s.machines || [])) {
      for (const photo of (machine.photos || [])) {
        if (photo.imageUrl && photo.imageUrl.startsWith("data:")) {
          try {
            console.log("[sync] ⬆️ Subiendo foto a Cloudinary…");
            photo.imageUrl = await uploadBase64(photo.imageUrl);
            changed = true;
            console.log("[sync] ✅ Foto en Cloudinary:", photo.imageUrl.slice(0, 60));
          } catch (e) {
            console.warn("[sync] ❌ Cloudinary falló:", e.message);
          }
        }
      }
    }
    if (changed) {
      // Guardar URLs limpias en localStorage (sin activar el interceptor)
      Object.getPrototypeOf(localStorage)._setItem.call(localStorage, STORAGE_KEY, JSON.stringify(s));
      console.log("[sync] ✅ localStorage actualizado con URLs de Cloudinary");
    }
    return s;
  }

  // ── Guardar en Firestore ──────────────────────────────────
  async function saveToFirestore(rawState) {
    if (!db || isSaving) return;
    const raw = JSON.stringify(rawState);
    if (raw === lastSaved) return; // sin cambios
    isSaving = true;
    try {
      console.log("[sync] 💾 Guardando en Firestore…");
      const clean = await resolvePhotos(rawState);
      await db.collection("state").doc("main").set(clean);
      lastSaved = JSON.stringify(clean);
      console.log("[sync] ✅ Guardado en Firestore");
    } catch (e) {
      console.warn("[sync] ❌ Escritura fallida:", e.message);
    } finally {
      isSaving = false;
    }
  }

  // ── Leer desde Firestore ──────────────────────────────────
  async function loadFromFirestore() {
    try {
      console.log("[sync] 📥 Cargando desde Firestore…");
      const doc = await db.collection("state").doc("main").get();
      if (!doc.exists) {
        console.log("[sync] ℹ️ Firestore vacío — primera vez");
        return false;
      }
      const data = doc.data();
      Object.getPrototypeOf(localStorage)._setItem.call(localStorage, STORAGE_KEY, JSON.stringify(data));
      lastSaved = JSON.stringify(data);
      console.log("[sync] ✅ Estado cargado desde Firestore");
      return true;
    } catch (e) {
      console.warn("[sync] ❌ Lectura fallida:", e.message);
      return false;
    }
  }

  // ── INTERCEPTOR de localStorage ───────────────────────────
  function patchLocalStorage() {
    const proto = Object.getPrototypeOf(localStorage);
    proto._setItem = proto.setItem;
    proto.setItem  = function(key, value) {
      this._setItem(key, value);
      if (this === localStorage && key === STORAGE_KEY) {
        console.log("[sync] 🔔 localStorage cambiado — sincronizando…");
        try { saveToFirestore(JSON.parse(value)); } catch (e) {}
      }
    };
    console.log("[sync] ✅ localStorage interceptado");
  }

  // ── INTERVALO de respaldo (por si el interceptor falla) ───
  function startBackupInterval() {
    setInterval(() => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      if (raw === lastSaved) return;
      console.log("[sync] 🔄 Intervalo: detectado cambio, sincronizando…");
      try { saveToFirestore(JSON.parse(raw)); } catch (e) {}
    }, 3000);
    console.log("[sync] ✅ Intervalo de respaldo activo (3s)");
  }

  function triggerRerender() {
    window.dispatchEvent(new Event("storage"));
  }

  // ── Test de conectividad con Firestore ────────────────────
  async function testFirestore() {
    try {
      await db.collection("state").doc("main").get();
      console.log("[sync] ✅ Conexión con Firestore OK");
      return true;
    } catch (e) {
      console.error("[sync] ❌ Firestore no accesible:", e.message);
      console.error("[sync] Verificá las reglas: allow read, write: if true;");
      return false;
    }
  }

  // ── Inicialización ────────────────────────────────────────
  async function main() {
    try { await loadFirebase(); }
    catch (e) { console.warn("[sync] Firebase no cargó:", e.message); return; }

    const ok = await testFirestore();
    if (!ok) return;

    const page = document.body?.dataset?.page || "";

    if (page === "public") {
      const loaded = await loadFromFirestore();
      if (loaded) triggerRerender();
      return;
    }

    if (page === "admin-section") {
      patchLocalStorage();
      startBackupInterval();
      const loaded = await loadFromFirestore();
      if (loaded) triggerRerender();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => main().catch(console.error));
  } else {
    main().catch(console.error);
  }
})();
