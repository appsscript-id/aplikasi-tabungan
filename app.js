const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function init() {
  const { data, error } = await db.from("transaksi").select("*");
  document.getElementById("app").textContent = error
    ? "Error: " + error.message
    : "Terhubung! Jumlah transaksi: " + data.length;
}
init();
