const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (id) => document.getElementById(id);
let mode = "login"; // "login" atau "daftar"

function showMsg(text, type = "error") {
  const el = $("msg");
  el.textContent = text;
  el.className = "msg " + type;
  el.hidden = false;
}

function clearMsg() {
  $("msg").hidden = true;
}

function setMode(newMode) {
  mode = newMode;
  const isLogin = mode === "login";
  $("auth-title").textContent = isLogin ? "Masuk ke akunmu" : "Buat akun baru";
  $("auth-btn").textContent = isLogin ? "Masuk" : "Daftar";
  $("switch-text").textContent = isLogin ? "Belum punya akun?" : "Sudah punya akun?";
  $("switch-link").textContent = isLogin ? "Daftar" : "Masuk";
  $("password").autocomplete = isLogin ? "current-password" : "new-password";
  clearMsg();
}

function render(session) {
  $("auth-view").hidden = !!session;
  $("home-view").hidden = !session;
  if (session) $("user-email").textContent = session.user.email;
}

$("switch-link").addEventListener("click", (e) => {
  e.preventDefault();
  setMode(mode === "login" ? "daftar" : "login");
});

$("auth-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMsg();

  const email = $("email").value.trim();
  const password = $("password").value;
  const btn = $("auth-btn");
  btn.disabled = true;

  try {
    if (mode === "login") {
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } else {
      const { data, error } = await db.auth.signUp({ email, password });
      if (error) throw error;
      if (!data.session) {
        showMsg("Pendaftaran berhasil. Cek email untuk konfirmasi, lalu masuk.", "ok");
      }
    }
  } catch (err) {
    showMsg(err.message);
  } finally {
    btn.disabled = false;
  }
});

$("logout-btn").addEventListener("click", () => db.auth.signOut());

// Pantau status login (login, logout, dan sesi tersimpan)
db.auth.onAuthStateChange((_event, session) => render(session));

// Cek sesi saat halaman pertama dibuka
db.auth.getSession().then(({ data }) => render(data.session));
