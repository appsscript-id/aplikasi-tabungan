const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (id) => document.getElementById(id);
let mode = "login";
let saldo = 0;

const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

const hariIni = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

function showMsg(id, text, type = "error") {
  const el = $(id);
  el.textContent = text;
  el.className = "msg " + type;
  el.hidden = false;
}
function clearMsg(id) {
  $(id).hidden = true;
}

/* ---------- Login / daftar ---------- */

function setMode(newMode) {
  mode = newMode;
  const isLogin = mode === "login";
  $("auth-title").textContent = isLogin ? "Masuk ke akunmu" : "Buat akun baru";
  $("auth-btn").textContent = isLogin ? "Masuk" : "Daftar";
  $("switch-text").textContent = isLogin ? "Belum punya akun?" : "Sudah punya akun?";
  $("switch-link").textContent = isLogin ? "Daftar" : "Masuk";
  $("password").autocomplete = isLogin ? "current-password" : "new-password";
  clearMsg("msg");
}

$("switch-link").addEventListener("click", (e) => {
  e.preventDefault();
  setMode(mode === "login" ? "daftar" : "login");
});

$("auth-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMsg("msg");
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
        showMsg("msg", "Pendaftaran berhasil. Cek email untuk konfirmasi, lalu masuk.", "ok");
      }
    }
  } catch (err) {
    showMsg("msg", err.message);
  } finally {
    btn.disabled = false;
  }
});

$("logout-btn").addEventListener("click", () => db.auth.signOut());

/* ---------- Transaksi ---------- */

function renderRiwayat(rows) {
  const list = $("riwayat");
  list.innerHTML = "";

  if (rows.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Belum ada transaksi.";
    list.appendChild(li);
    return;
  }

  rows.forEach((t) => {
    const li = document.createElement("li");

    const info = document.createElement("div");
    info.className = "info";
    const cat = document.createElement("div");
    cat.className = "cat";
    cat.textContent = t.catatan || (t.tipe === "setor" ? "Setor" : "Tarik");
    const tgl = document.createElement("div");
    tgl.className = "tgl";
    tgl.textContent = t.tanggal;
    info.append(cat, tgl);

    const right = document.createElement("div");
    right.className = "right";
    const amt = document.createElement("div");
    amt.className = "amt " + t.tipe;
    amt.textContent = (t.tipe === "setor" ? "+ " : "- ") + rupiah(t.jumlah);
    const del = document.createElement("button");
    del.className = "hapus";
    del.textContent = "Hapus";
    del.addEventListener("click", () => hapusTransaksi(t.id));
    right.append(amt, del);

    li.append(info, right);
    list.appendChild(li);
  });
}

async function loadTransaksi() {
  const { data, error } = await db
    .from("transaksi")
    .select("*")
    .order("tanggal", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    showMsg("trx-msg", "Gagal memuat data: " + error.message);
    return;
  }

  saldo = data.reduce(
    (sum, t) => sum + (t.tipe === "setor" ? Number(t.jumlah) : -Number(t.jumlah)),
    0
  );
  $("saldo").textContent = rupiah(saldo);
  renderRiwayat(data);
}

$("trx-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMsg("trx-msg");

  const tipe = $("tipe").value;
  const jumlah = Number($("jumlah").value);
  const catatan = $("catatan").value.trim() || null;
  const tanggal = $("tanggal").value;

  if (!(jumlah > 0)) {
    showMsg("trx-msg", "Jumlah harus lebih dari 0.");
    return;
  }
  if (tipe === "tarik" && jumlah > saldo) {
    showMsg("trx-msg", "Saldo tidak cukup untuk penarikan ini.");
    return;
  }

  const btn = $("trx-btn");
  btn.disabled = true;
  const { error } = await db.from("transaksi").insert({ tipe, jumlah, catatan, tanggal });
  btn.disabled = false;

  if (error) {
    showMsg("trx-msg", "Gagal menyimpan: " + error.message);
    return;
  }

  $("jumlah").value = "";
  $("catatan").value = "";
  showMsg("trx-msg", "Transaksi tersimpan.", "ok");
  loadTransaksi();
});

async function hapusTransaksi(id) {
  if (!confirm("Hapus transaksi ini?")) return;
  const { error } = await db.from("transaksi").delete().eq("id", id);
  if (error) {
    showMsg("trx-msg", "Gagal menghapus: " + error.message);
    return;
  }
  loadTransaksi();
}

/* ---------- Status login ---------- */

function render(session) {
  $("auth-view").hidden = !!session;
  $("home-view").hidden = !session;

  if (session) {
    $("user-email").textContent = session.user.email;
    $("tanggal").value = hariIni();
    clearMsg("trx-msg");
    // setTimeout supaya tidak memanggil Supabase langsung di dalam callback auth
    setTimeout(loadTransaksi, 0);
  } else {
    $("riwayat").innerHTML = "";
    saldo = 0;
  }
}

// Dipanggil saat halaman dibuka (sesi tersimpan), login, dan logout
db.auth.onAuthStateChange((_event, session) => render(session));
