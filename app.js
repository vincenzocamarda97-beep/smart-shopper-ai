/* Smart Shopper AI - frontend collegato alle API Flask */
const $ = id => document.getElementById(id);

const shopCatalog = [
  {name:"Galaxus",country:"CH",sub:"Casa, tecnologia e lifestyle",url:"https://www.galaxus.ch/search?q="},
  {name:"Digitec",country:"CH",sub:"Informatica ed elettronica",url:"https://www.digitec.ch/search?q="},
  {name:"Brack.ch",country:"CH",sub:"Tecnologia, casa e ufficio",url:"https://www.brack.ch/search?query="},
  {name:"Manor",country:"CH",sub:"Casa, bellezza e moda",url:"https://www.manor.ch/it/search?query="},
  {name:"Interdiscount",country:"CH",sub:"Elettronica",url:"https://www.interdiscount.ch/it/search?query="},
  {name:"MediaMarkt Svizzera",country:"CH",sub:"Elettronica",url:"https://www.mediamarkt.ch/"},
  {name:"Migros",country:"CH",sub:"Casa e alimentari",url:"https://www.migros.ch/"},
  {name:"Coop",country:"CH",sub:"Casa e alimentari",url:"https://www.coop.ch/"},
  {name:"Ricardo",country:"CH",sub:"Nuovo e usato",url:"https://www.ricardo.ch/"},
  {name:"Amazon Svizzera",country:"CH",sub:"Marketplace",url:"https://www.amazon.ch/s?k="},
  {name:"eBay Svizzera",country:"CH",sub:"Marketplace",url:"https://www.ebay.ch/sch/i.html?_nkw="},
  {name:"Amazon Italia",country:"IT",sub:"Marketplace",url:"https://www.amazon.it/s?k="},
  {name:"eBay Italia",country:"IT",sub:"Marketplace",url:"https://www.ebay.it/sch/i.html?_nkw="},
  {name:"Amazon Germania",country:"DE",sub:"Marketplace",url:"https://www.amazon.de/s?k="},
  {name:"AliExpress",country:"INT",sub:"Marketplace internazionale",url:"https://www.aliexpress.com/w/wholesale-"}
];

const categoryNames = ["Tutti","Tecnologia","Casa","Bellezza","Cucina"];
const icons = {"Cucina":"🥣","Bellezza":"✨","Tecnologia":"💻","Casa":"🏠"};

let products = [];
let category = "Tutti";
let favorites = JSON.parse(localStorage.getItem("ssa-favs") || "[]");
let comparison = JSON.parse(localStorage.getItem("ssa-compare") || "[]");
let loading = false;

const market = () => $("market").value;
const currencyCode = () => market() === "ch" ? "CHF" : "EUR";

const money = (value,currency=currencyCode()) =>
  new Intl.NumberFormat(currency==="CHF"?"de-CH":"it-IT",{
    style:"currency",currency,maximumFractionDigits:2
  }).format(Number(value)||0);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g,ch=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[ch]);
}

function normalizeProduct(p) {
  return {
    id:Number(p.id),
    n:p.name||"Prodotto",
    c:p.category||"Altro",
    e:icons[p.category]||"🛍️",
    d:p.description||"",
    price:Number(p.price),
    currency:p.currency||currencyCode(),
    url:p.product_url||"",
    retailer:p.retailer||"Negozio",
    source:p.source||"unknown"
  };
}

function productCard(p) {
  const sample=p.source==="sample"||p.source==="demo";
  return `<article class="card">
    <div class="photo">${p.e}</div>
    <div class="body">
      <div class="tiny">${escapeHtml(p.c)} · ${escapeHtml(p.retailer)}</div>
      <b>${escapeHtml(p.n)}</b>
      <p class="tiny">${escapeHtml(p.d)}</p>
      <div class="price">${money(p.price,p.currency)}</div>
      <div class="tiny">${sample?"Prezzo dimostrativo":"Dato importato"}</div>
      <div class="row" style="margin-top:8px;flex-wrap:wrap">
        <button class="action" data-detail="${p.id}">Dettagli</button>
        <button class="action" data-compare="${p.id}">${comparison.includes(p.id)?"✓ Confronto":"⇄ Confronta"}</button>
        <button class="heart" data-fav="${p.id}">${favorites.includes(p.id)?"♥":"♡"}</button>
      </div>
    </div>
  </article>`;
}

async function loadProducts() {
  if(loading)return;
  loading=true;
  $("count").textContent="Caricamento catalogo…";
  $("products").innerHTML='<div class="notice">Sto caricando i prodotti dal server.</div>';

  const params=new URLSearchParams({currency:currencyCode()});
  const q=$("query").value.trim();
  const budget=$("budget").value.trim();

  if(q)params.set("q",q);
  if(category!=="Tutti")params.set("category",category);
  if(budget&&Number(budget)>0)params.set("max_price",budget);

  try {
    const response=await fetch(`/api/products?${params.toString()}`);
    if(!response.ok)throw new Error(`Errore server (${response.status})`);
    const data=await response.json();
    products=(data.products||[]).map(normalizeProduct);
    renderProducts(data.disclaimer||"");
    renderFavorites();
    renderCompare();
  } catch(error) {
    products=[];
    $("products").innerHTML=`<div class="notice">Catalogo non disponibile: ${escapeHtml(error.message)}</div>`;
    $("count").textContent="Catalogo non disponibile.";
  } finally {
    loading=false;
  }
}

function renderProducts(disclaimer="") {
  const list=[...products];
  list.sort((a,b)=>$("sort").value==="rating"
    ?a.n.localeCompare(b.n)
    :a.price-b.price);

  $("products").innerHTML=list.map(productCard).join("")||
    '<div class="notice">Nessun prodotto trovato.</div>';

  const samples=list.filter(p=>p.source==="sample"||p.source==="demo").length;
  $("count").textContent=`${list.length} prodotti dal server${samples?` · ${samples} prezzi dimostrativi`:""}.`;
  if(disclaimer)$("count").title=disclaimer;
}

function renderFavorites() {
  const list=products.filter(p=>favorites.includes(p.id));
  $("saved-products").innerHTML=list.map(productCard).join("");
  $("saved-empty").hidden=list.length>0;
}

function renderCompare() {
  const list=products.filter(p=>comparison.includes(p.id));
  $("compare-list").innerHTML=list.map(p=>`
    <div class="panel"><div class="row">
      <span style="font-size:28px">${p.e}</span>
      <div style="flex:1">
        <b>${escapeHtml(p.n)}</b>
        <div class="price">${money(p.price,p.currency)}</div>
        <div class="tiny">${escapeHtml(p.retailer)} · ${escapeHtml(p.d)}</div>
      </div>
      <button data-remove-compare="${p.id}">Rimuovi</button>
    </div></div>`).join("");
  $("compare-empty").hidden=list.length>0;
}

function renderShops() {
  const q=$("shop-query").value.trim();
  const choice=$("shop-market").value;
  const list=shopCatalog.filter(s=>
    choice==="all"||s.country===choice.toUpperCase()||s.country==="INT"
  );

  $("shop-links").innerHTML=list.map(s=>{
    const href=s.url.includes("?")&&q?s.url+encodeURIComponent(q):s.url;
    return `<a class="shop" target="_blank" rel="noopener noreferrer" href="${href}">
      <b>${escapeHtml(s.name)} ↗</b>
      <span class="tiny" style="color:#fff">${escapeHtml(s.sub)}</span>
    </a>`;
  }).join("");
}

function renderDetail(id) {
  const p=products.find(x=>x.id===id);
  if(!p)return;
  $("modal-title").textContent=p.n;
  const link=p.url?`<p><a href="${escapeHtml(p.url)}" target="_blank" rel="noopener noreferrer">Apri il negozio ↗</a></p>`:"";
  $("modal-content").innerHTML=`
    <div style="font-size:48px;text-align:center;padding:18px">${p.e}</div>
    <p>${escapeHtml(p.d)}</p>
    <div class="price">${money(p.price,p.currency)}</div>
    <p class="muted">${p.source==="sample"?"Prezzo dimostrativo, non verificato in tempo reale.":"Dato importato: verifica prezzo e disponibilità."}</p>
    ${link}
    <button class="primary" id="modal-compare">Aggiungi al confronto</button>`;
  $("modal").classList.add("open");
  $("modal-compare").onclick=()=>{
    if(!comparison.includes(id))comparison.push(id);
    localStorage.setItem("ssa-compare",JSON.stringify(comparison));
    renderCompare();
    $("modal").classList.remove("open");
  };
}

function updateAll() {
  renderShops();
  loadProducts();
}
