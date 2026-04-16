/**
 * firebase-sync.js — Maquiler
 * Sincroniza localStorage ↔ Firestore + fotos en Cloudinary.
 * La contraseña nunca se guarda en el código.
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

  const FIREBASE_ADMIN_EMAIL = "sewyllconstrucciones@gmail.com";
  const CLOUDINARY_CLOUD     = "dxxyibglf";
  const CLOUDINARY_PRESET    = "galeria_maquiler";
  const STORAGE_KEY          = "maquiler-site-v2";
  const SESSION_PASS         = "_mq_fsp";

  let db = null, auth = null;

  // ── Cargar SDKs Firebase ──────────────────────────────────
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
    await loadScript(`${base}/firebase-auth-compat.js`);
    await loadScript(`${base}/firebase-firestore-compat.js`);
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    db   = firebase.firestore();
    auth = firebase.auth();
  }

  // ── Esperar a que Firebase restaure la sesión ─────────────
  // Firebase guarda la sesión automáticamente — pero tarda un poco en restaurarla
  function waitForAuthReady() {
    return new Promise((resolve) => {
      const unsub = auth.onAuthStateChanged((user) => {
        unsub();
        resolve(user);
      });
    });
  }

  // ── Autenticar con contraseña capturada del formulario ────
  async function signInWithCapturedPassword() {
    const pass = sessionStorage.getItem(SESSION_PASS);
    if (!pass) return false;
    sessionStorage.removeItem(SESSION_PASS);
    try {
      await auth.signInWithEmailAndPassword(FIREBASE_ADMIN_EMAIL, pass);
      console.log("[sync] Firebase Auth OK ✓");
      return true;
    } catch (e) {
      console.info("[sync] Firebase Auth no disponible:", e.message);
      return false;
    }
  }

  // ── Leer desde Firestore ──────────────────────────────────
  async function loadFromFirestore() {
    try {
      const doc = await db.collection("state").doc("main").get();
      if (!doc.exists) return false;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(doc.data()));
      console.log("[sync] Estado cargado desde Firestore ✓");
      return true;
    } catch (e) {
      console.warn("[sync] Lectura fallida:", e.message);
      return false;
    }
  }

  // ── Guardar en Firestore ──────────────────────────────────
  async function saveToFirestore(state) {
    if (!auth?.currentUser) return;
    try {
      await db.collection("state").doc("main").set(state);
      console.log("[sync] Guardado en Firestore ✓");
    } catch (e) {
      console.warn("[sync] Escritura fallida:", e.message);
    }
  }

  // ── Parchar updateState ───────────────────────────────────
  function patchUpdateState() {
    const App = window.MaquilerApp;
    if (!App?.updateState || App._syncPatched) return;
    App._syncPatched = true;
    const original = App.updateState;
    App.updateState = function(mutator) {
      const result = original(mutator);
      saveToFirestore(result); // async, no bloquea UI
      return result;
    };
    console.log("[sync] updateState parchado ✓");
  }

  // ── Capturar contraseña del formulario de login ───────────
  function captureLoginPassword() {
    document.addEventListener("submit", (e) => {
      if (e.target.id !== "admin-login-form") return;
      const pass = e.target.querySelector('[name="password"]')?.value;
      if (pass) sessionStorage.setItem(SESSION_PASS, pass);
    }, true);
  }

  // ── Parchar fotos → Cloudinary ────────────────────────────
  function patchCompressImageFile() {
    const tryPatch = () => {
      const App = window.MaquilerApp;
      if (!App?.compressImageFile) { setTimeout(tryPatch, 80); return; }
      if (App._cloudinaryPatched) return;
      App._cloudinaryPatched = true;
      const original = App.compressImageFile;
      App.compressImageFile = async function(file) {
        try {
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
          console.log("[sync] Foto subida a Cloudinary ✓");
          return { dataUrl: data.secure_url, width: data.width, height: data.height };
        } catch (e) {
          console.warn("[sync] Cloudinary falló, usando base64:", e.message);
          return original(file);
        }
      };
    };
    tryPatch();
  }

  // ── Disparar re-render ────────────────────────────────────
  function triggerRerender() {
    window.dispatchEvent(new Event("storage"));
  }

  // ── Inicialización ────────────────────────────────────────
  async function main() {
    try { await loadFirebase(); }
    catch (e) { console.warn("[sync] Firebase no cargó:", e.message); return; }

    const page = document.body?.dataset?.page || "";

    patchCompressImageFile();

    // ── Página pública ──
    if (page === "public") {
      const loaded = await loadFromFirestore();
      if (loaded) triggerRerender();
      return;
    }

    // ── Login del admin ──
    if (page === "admin-login") {
      captureLoginPassword();
      return;
    }

    // ── Secciones del admin ──
    if (page === "admin-section") {
      // Parchamos updateState SIEMPRE, así queda listo cuando haya auth
      patchUpdateState();

      // 1. Esperar a que Firebase restaure la sesión guardada
      let user = await waitForAuthReady();

      // 2. Si no hay sesión guardada, intentar con contraseña del formulario
      if (!user) {
        await signInWithCapturedPassword();
        user = auth.currentUser;
      }

      if (user) {
        console.log("[sync] Autenticado como:", user.email);
      } else {
        console.info("[sync] Sin autenticación — cambios solo en localStorage");
      }

      // 3. Cargar estado actualizado desde Firestore
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
