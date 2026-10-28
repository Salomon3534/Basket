const defaultProducts = [
  {id:1,name:"Sony WH-1000XM6",brand:"Sony",price:299,old:349,category:"Tecnología",icon:"🎧",shops:[["Amazon",299],["MediaMarkt",309],["El Corte Inglés",319]],fav:true,bought:false,url:"#"},
  {id:2,name:"iPhone 17 Pro",brand:"Apple",price:1299,old:1399,category:"Tecnología",icon:"📱",shops:[["Amazon",1299],["MediaMarkt",1349],["PcComponentes",1329]],fav:false,bought:false,url:"#"},
  {id:3,name:"RTX 5070",brand:"NVIDIA",price:649,old:699,category:"Informática",icon:"🖥️",shops:[["PcComponentes",649],["Amazon",669]],fav:false,bought:false,url:"#"},
  {id:4,name:"DualSense",brand:"Sony",price:54.99,old:74.99,category:"Gaming",icon:"🎮",shops:[["Amazon",54.99],["MediaMarkt",59.99]],fav:true,bought:false,url:"#"}
];

const STORAGE_KEY = "basket-products";
let products;
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  products = Array.isArray(saved) ? saved : defaultProducts;
} catch {
  products = defaultProducts;
}
let activeFilter = "all";
let activeCat = null;
let toastTimer;
let lastFocusedElement = null;

const $ = id => document.getElementById(id);

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch {
    toast("No se pudo guardar en este navegador.");
  }
}
function discount(p) {
  return p.old > p.price && p.old > 0 ? Math.round((1 - p.price / p.old) * 100) : 0;
}
function euro(n) {
  return new Intl.NumberFormat("es-ES", {style:"currency", currency:"EUR"}).format(n);
}
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}
function render() {
  const q = $("search").value.toLowerCase().trim();
  let list = products.filter(p => {
    const shops = Array.isArray(p.shops) ? p.shops : [];
    const text = [p.name, p.brand, p.category, ...shops.map(s => s[0])].join(" ").toLowerCase();
    if (q && !text.includes(q)) return false;
    if (activeFilter === "favorites" && !p.fav) return false;
    if (activeFilter === "pending" && p.bought) return false;
    if (activeFilter === "offers" && !discount(p)) return false;
    if (activeCat && p.category !== activeCat) return false;
    return true;
  });

  const sort = $("sort").value;
  if (sort === "price") list.sort((a, b) => a.price - b.price);
  if (sort === "discount") list.sort((a, b) => discount(b) - discount(a));

  $("count").textContent = products.length;
  $("pending").textContent = products.filter(p => !p.bought).length;
  $("offers").textContent = products.filter(p => discount(p)).length;
  $("buyAll").disabled = !products.some(p => !p.bought);
  $("products").innerHTML = list.length
    ? list.map(card).join("")
    : '<div class="empty" role="status">No hay productos que coincidan con tu búsqueda.</div>';
}
function card(p) {
  const d = discount(p);
  const shops = Array.isArray(p.shops) ? p.shops : [];
  return `<article class="product">
    <button class="heart ${p.fav ? "on" : ""}" type="button" aria-label="${p.fav ? "Quitar de favoritos" : "Añadir a favoritos"}" aria-pressed="${!!p.fav}" onclick="toggleFav(${p.id})">${p.fav ? "♥" : "♡"}</button>
    <div class="pic" aria-hidden="true">${esc(p.icon || "🛍️")}</div>
    <div class="product-content">
      <h3>${esc(p.name)}</h3>
      <div class="brand">${esc(p.brand || "Sin marca")} · ${esc(p.category || "Sin categoría")}</div>
      <div><span class="price">${euro(p.price)}</span>${p.old ? `<span class="old">${euro(p.old)}</span>` : ""}${d ? `<span class="discount">-${d}%</span>` : ""}</div>
      <div class="shops">${shops.map((s, i) => `<div class="shop ${i === 0 ? "best" : ""}"><span>${esc(s[0])}</span><b>${euro(s[1])}</b></div>`).join("")}</div>
      <div class="actions">
        <button class="buy" type="button" aria-pressed="${!!p.bought}" aria-label="${p.bought ? "Marcar como pendiente" : "Marcar como comprado"}: ${esc(p.name)}" onclick="buy(${p.id})">${p.bought ? "✓ Comprado" : "🛒 Marcar comprado"}</button>
        <button class="icon" type="button" aria-label="Editar ${esc(p.name)}" onclick="edit(${p.id})">✎</button>
        <button class="icon" type="button" aria-label="Eliminar ${esc(p.name)}" onclick="removeProduct(${p.id})">🗑</button>
      </div>
    </div>
  </article>`;
}
function toggleFav(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  p.fav = !p.fav;
  save();
  render();
}
function buy(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  p.bought = !p.bought;
  save();
  toast(p.bought ? "Producto marcado como comprado" : "Producto vuelto a pendiente");
  render();
}
function buyAll() {
  const pending = products.filter(p => !p.bought);
  if (!pending.length) {
    toast("No tienes productos pendientes.");
    return;
  }
  const total = pending.reduce((sum, p) => sum + Number(p.price || 0), 0);
  const confirmed = confirm(`Vas a marcar ${pending.length} productos como comprados (total orientativo: ${euro(total)}). Esta demo no realiza pagos reales. ¿Continuar?`);
  if (!confirmed) return;
  products = products.map(p => p.bought ? p : {...p, bought:true});
  save();
  render();
  toast(`${pending.length} productos marcados como comprados`);
}
function removeProduct(id) {
  if (confirm("¿Eliminar este producto?")) {
    products = products.filter(p => p.id !== id);
    save();
    render();
    toast("Producto eliminado");
  }
}
function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2400);
}
function openModal(p = null) {
  lastFocusedElement = document.activeElement;
  $("modalTitle").textContent = p ? "Editar producto" : "Añadir producto";
  $("modalBack").classList.add("open");
  $("modalBack").setAttribute("aria-hidden", "false");
  $("productForm").dataset.id = p ? String(p.id) : "";
  $("name").value = p?.name || "";
  $("brand").value = p?.brand || "";
  $("price").value = p?.price ?? "";
  $("oldPrice").value = p?.old || "";
  $("category").value = p?.category || "";
  $("url").value = p?.url && p.url !== "#" ? p.url : "";
  $("name").focus();
}
function closeModal() {
  const wasOpen = $("modalBack").classList.contains("open");
  $("modalBack").classList.remove("open");
  $("modalBack").setAttribute("aria-hidden", "true");
  if (wasOpen && lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
}
function edit(id) {
  const p = products.find(x => x.id === id);
  if (p) openModal(p);
}

$("productForm").addEventListener("submit", e => {
  e.preventDefault();
  const form = $("productForm");
  const id = Number(form.dataset.id);
  const price = Number($("price").value);
  const previousPrice = Number($("oldPrice").value) || 0;
  const existing = products.find(p => p.id === id);
  const data = {
    name: $("name").value.trim(),
    brand: $("brand").value.trim(),
    price,
    old: previousPrice,
    category: $("category").value.trim() || "Otros",
    url: $("url").value.trim() || "#",
    icon: existing?.icon || "🛍️",
    shops: [[existing?.shops?.[0]?.[0] || "Tienda añadida", price]],
    fav: existing?.fav || false,
    bought: existing?.bought || false
  };
  if (!data.name || !Number.isFinite(price) || price < 0) {
    toast("Introduce un nombre y un precio válido.");
    return;
  }
  if (id && existing) Object.assign(existing, data);
  else products.unshift({...data, id: Date.now()});
  save();
  closeModal();
  render();
  toast("Producto guardado");
});

$("addProduct").addEventListener("click", () => openModal());
$("buyAll").addEventListener("click", buyAll);
$("closeModal").addEventListener("click", closeModal);
$("modalBack").addEventListener("click", e => {
  if (e.target === $("modalBack")) closeModal();
});
document.addEventListener("keydown", e => {
  if (!$("modalBack").classList.contains("open")) return;
  if (e.key === "Escape") {
    closeModal();
    return;
  }
  if (e.key === "Tab") {
    const focusable = [...$("modalBack").querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
      .filter(el => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});
$("search").addEventListener("input", render);
$("sort").addEventListener("change", render);

document.querySelectorAll("[data-filter]").forEach(button => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    activeCat = null;
    document.querySelectorAll(".nav button").forEach(b => b.classList.remove("active"));
    button.classList.add("active");
    render();
  });
});
document.querySelectorAll("[data-cat]").forEach(button => {
  button.addEventListener("click", () => {
    activeCat = button.dataset.cat;
    activeFilter = "all";
    document.querySelectorAll(".nav button").forEach(b => b.classList.remove("active"));
    button.classList.add("active");
    render();
  });
});
$("addSource").addEventListener("click", () => toast("Demo: aquí conectaríamos fuentes autorizadas, como RSS o APIs."));
render();
