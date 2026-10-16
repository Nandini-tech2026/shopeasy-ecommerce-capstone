// ---------- Storage helpers ----------
const KEYS = { products: "se_products", cart: "se_cart", user: "se_user" };

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ---------- State ----------
const seed = [
  { id: 1, name: "Wireless Earbuds", price: 39.99, category: "Electronics", emoji: "🎧" },
  { id: 2, name: "Running Shoes", price: 59.5, category: "Fashion", emoji: "👟" },
  { id: 3, name: "Ceramic Mug", price: 12, category: "Home", emoji: "☕" },
  { id: 4, name: "Backpack", price: 45, category: "Fashion", emoji: "🎒" },
  { id: 5, name: "Desk Lamp", price: 24.9, category: "Home", emoji: "💡" },
  { id: 6, name: "Smart Watch", price: 89, category: "Electronics", emoji: "⌚" }
];
let products = load(KEYS.products, seed);
let cart = load(KEYS.cart, {}); // { productId: quantity }
let user = load(KEYS.user, null);
let editingId = null;

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const money = (n) => "$" + Number(n).toFixed(2);

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1800);
}

// ---------- Render ----------
function renderCategories() {
  const current = $("category").value || "All";
  const cats = ["All", ...new Set(products.map((p) => p.category))];
  $("category").innerHTML = "";
  cats.forEach((c) => {
    const o = document.createElement("option");
    o.value = o.textContent = c;
    $("category").appendChild(o);
  });
  $("category").value = cats.includes(current) ? current : "All";
}

function renderProducts() {
  const q = $("search").value.trim().toLowerCase();
  const cat = $("category").value;
  const list = products.filter(
    (p) => (cat === "All" || p.category === cat) && p.name.toLowerCase().includes(q)
  );
  const grid = $("grid");
  grid.innerHTML = "";
  $("empty").hidden = list.length > 0;

  list.forEach((p) => {
    const card = document.createElement("article");
    card.className = "card";

    const emoji = document.createElement("div");
    emoji.className = "emoji";
    emoji.textContent = p.emoji;

    const name = document.createElement("h3");
    name.textContent = p.name;

    const c = document.createElement("div");
    c.className = "cat";
    c.textContent = p.category;

    const price = document.createElement("div");
    price.className = "price";
    price.textContent = money(p.price);

    const actions = document.createElement("div");
    actions.className = "actions";
    actions.appendChild(button("Add to cart", "primary", () => addToCart(p.id)));
    if (user) {
      actions.appendChild(button("Edit", "", () => openProductForm(p.id)));
      actions.appendChild(button("Delete", "danger", () => deleteProduct(p.id)));
    }

    card.append(emoji, name, c, price, actions);
    grid.appendChild(card);
  });
}

function button(label, cls, handler) {
  const b = document.createElement("button");
  b.textContent = label;
  if (cls) b.className = cls;
  b.addEventListener("click", handler);
  return b;
}

function renderAuth() {
  $("authBtn").textContent = user ? "Log out (" + user.email + ")" : "Log in";
  $("addBtn").hidden = !user;
}

function renderCartCount() {
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  $("cartCount").textContent = count;
}

function renderAll() {
  renderCategories();
  renderProducts();
  renderAuth();
  renderCartCount();
}

// ---------- Auth (simulated) ----------
$("authBtn").addEventListener("click", () => {
  if (user) {
    user = null;
    localStorage.removeItem(KEYS.user);
    toast("Logged out");
    renderAll();
  } else {
    $("loginDlg").showModal();
  }
});

$("loginForm").addEventListener("submit", (e) => {
  if (e.submitter && e.submitter.value === "ok") {
    user = { email: $("email").value.trim() };
    save(KEYS.user, user);
    $("loginForm").reset();
    toast("Welcome, " + user.email);
    renderAll();
  }
});

// ---------- CRUD ----------
function openProductForm(id) {
  editingId = id || null;
  const p = products.find((x) => x.id === id);
  $("productTitle").textContent = p ? "Edit product" : "Add product";
  $("pName").value = p ? p.name : "";
  $("pPrice").value = p ? p.price : "";
  $("pCat").value = p ? p.category : "";
  $("pEmoji").value = p ? p.emoji : "🛍️";
  $("productDlg").showModal();
}

$("addBtn").addEventListener("click", () => openProductForm(null));

$("productForm").addEventListener("submit", (e) => {
  if (!e.submitter || e.submitter.value !== "ok") return;
  const data = {
    name: $("pName").value.trim(),
    price: parseFloat($("pPrice").value),
    category: $("pCat").value.trim(),
    emoji: $("pEmoji").value.trim() || "🛍️"
  };
  if (editingId) {
    products = products.map((p) => (p.id === editingId ? { ...p, ...data } : p));
    toast("Product updated");
  } else {
    const nextId = products.reduce((m, p) => Math.max(m, p.id), 0) + 1;
    products.push({ id: nextId, ...data });
    toast("Product added");
  }
  save(KEYS.products, products);
  renderAll();
});

function deleteProduct(id) {
  const p = products.find((x) => x.id === id);
  if (!p || !confirm('Delete "' + p.name + '"?')) return;
  products = products.filter((x) => x.id !== id);
  delete cart[id];
  save(KEYS.products, products);
  save(KEYS.cart, cart);
  toast("Product deleted");
  renderAll();
}

// ---------- Cart ----------
function addToCart(id) {
  cart[id] = (cart[id] || 0) + 1;
  save(KEYS.cart, cart);
  renderCartCount();
  toast("Added to cart");
}

function renderCart() {
  const box = $("cartItems");
  box.innerHTML = "";
  let total = 0;
  const ids = Object.keys(cart).filter((id) => products.some((p) => p.id == id));
  if (!ids.length) box.textContent = "Your cart is empty. Add something from the catalog.";
  ids.forEach((id) => {
    const p = products.find((x) => x.id == id);
    const qty = cart[id];
    total += p.price * qty;
    const line = document.createElement("div");
    line.className = "cart-line";
    const label = document.createElement("span");
    label.textContent = p.emoji + " " + p.name + " × " + qty;
    const right = document.createElement("span");
    right.textContent = money(p.price * qty) + " ";
    right.appendChild(button("Remove", "danger", () => {
      cart[id] > 1 ? cart[id]-- : delete cart[id];
      save(KEYS.cart, cart);
      renderCart();
      renderCartCount();
    }));
    line.append(label, right);
    box.appendChild(line);
  });
  $("cartTotal").textContent = money(total);
}

$("cartBtn").addEventListener("click", () => { renderCart(); $("cartDlg").showModal(); });
$("closeCart").addEventListener("click", () => $("cartDlg").close());
$("clearCart").addEventListener("click", () => {
  cart = {};
  save(KEYS.cart, cart);
  renderCart();
  renderCartCount();
});

// ---------- Filters ----------
$("search").addEventListener("input", renderProducts);
$("category").addEventListener("change", renderProducts);

renderAll();
