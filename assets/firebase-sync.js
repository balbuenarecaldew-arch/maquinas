/**
 * firebase-sync.js — Maquiler
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

  let db        = null;
  let lastSaved = null;
  let isSaving  = false;

  // ── Guardar en localStorage SIN activar el interceptor ───
  // (evita loop infinito cuando el interceptor está activo)
  function rawSetItem(key, value) {
    try {
      const proto = Object.getPrototypeOf(localStorage);
      // Si el patch está activo, usar _setItem; si no, usar setItem normal
      const fn = proto._setItem || proto.setItem;
      fn.call(localStorage, key, value);
    } catch (e) {
      // Fallback absoluto
      try { window.localStorage.setItem(key, value); } catch (_) {}
    }
  }

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

  // ── Subir base64 a Cloudinary ─────────────────────────────
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

  // ── Convertir fotos base64 → Cloudinary en el estado ─────
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
            console.log("[sync] ✅ Foto en Cloudinary:", photo.imageUrl.slice(0,60));
          } catch (e) {
            console.warn("[sync] ❌ Cloudinary falló:", e.message);
          }
        }
      }
    }
    if (changed) {
      rawSetItem(STORAGE_KEY, JSON.stringify(s));
      console.log("[sync] ✅ localStorage actualizado con URLs Cloudinary");
    }
    return s;
  }

  // ── Guardar en Firestore ──────────────────────────────────
  async function saveToFirestore(rawState) {
    if (!db || isSaving) return;
    const raw = JSON.stringify(rawState);
    if (raw === lastSaved) return;
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
        console.log("[sync] ℹ️ Firestore vacío — sin datos aún");
        return false;
      }
      const data = doc.data();
      rawSetItem(STORAGE_KEY, JSON.stringify(data));  // ← usa rawSetItem, sin bug
      lastSaved = JSON.stringify(data);
      console.log("[sync] ✅ Estado cargado desde Firestore");
      return true;
    } catch (e) {
      console.warn("[sync] ❌ Lectura fallida:", e.message);
      return false;
    }
  }

  // ── Interceptar localStorage para capturar cambios ────────
  function patchLocalStorage() {
    const proto = Object.getPrototypeOf(localStorage);
    proto._setItem = proto.setItem;
    proto.setItem  = function(key, value) {
      this._setItem(key, value);
      if (this === localStorage && key === STORAGE_KEY) {
        console.log("[sync] 🔔 Cambio detectado en localStorage");
        try { saveToFirestore(JSON.parse(value)); } catch (e) {}
      }
    };
    console.log("[sync] ✅ localStorage interceptado");
  }

  // ── Intervalo de respaldo cada 3s ─────────────────────────
  function startBackupInterval() {
    setInterval(() => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw || raw === lastSaved) return;
      console.log("[sync] 🔄 Respaldo: sincronizando cambio…");
      try { saveToFirestore(JSON.parse(raw)); } catch (e) {}
    }, 3000);
  }

  // ── Patch de compressImageFile para Cloudinary ────────────
  function patchCompressImageFile() {
    const tryPatch = () => {
      const App = window.MaquilerApp;
      if (!App?.compressImageFile) { setTimeout(tryPatch, 80); return; }
      if (App._cloudinaryPatched) return;
      App._cloudinaryPatched = true;
      const original = App.compressImageFile;
      App.compressImageFile = async function(file) {
        try {
          console.log("[sync] ⬆️ Subiendo foto directo a Cloudinary…");
          const form = new FormData();
          form.append("file", file);
          form.append("upload_preset", CLOUDINARY_PRESET);
          form.append("folder", "maquiler/galeria");
          const res  = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
            { method: "POST", body: form }
          );
          const data = await res.json();
          if (data.error) throw new Error(data.error.message);
          console.log("[sync] ✅ Foto directa en Cloudinary:", data.secure_url.slice(0,60));
          return { dataUrl: data.secure_url, width: data.width, height: data.height };
        } catch (e) {
          console.warn("[sync] ❌ Upload directo falló, usando base64:", e.message);
          return original(file);
        }
      };
      console.log("[sync] ✅ compressImageFile parchado → Cloudinary");
    };
    tryPatch();
  }

  function triggerRerender() {
    window.dispatchEvent(new Event("storage"));
  }

  // ── Inicialización ────────────────────────────────────────
  async function main() {
    try { await loadFirebase(); }
    catch (e) { console.warn("[sync] Firebase no cargó:", e.message); return; }

    console.log("[sync] ✅ Firebase listo");

    const page = document.body?.dataset?.page || "";

    if (page === "public") {
      const loaded = await loadFromFirestore();
      if (loaded) triggerRerender();
      return;
    }

    if (page === "admin-section") {
      patchLocalStorage();
      patchCompressImageFile();
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
