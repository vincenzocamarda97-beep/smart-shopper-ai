const $=id=>document.getElementById(id);
const products=[
{id:1,n:"Robot da cucina multifunzione",c:"Cucina",e:"🥣",ch:179,it:189,r:4.5,d:"Per impasti, dolci e preparazioni quotidiane."},
{id:2,n:"Impastatrice planetaria",c:"Cucina",e:"🍰",ch:149,it:159,r:4.6,d:"Per pane, pizza e brioche."},
{id:3,n:"Asciugacapelli professionale",c:"Bellezza",e:"💨",ch:89,it:99,r:4.7,d:"Per asciugatura e styling."},
{id:4,n:"MacBook Air 13 pollici",c:"Tecnologia",e:"💻",ch:899,it:999,r:4.8,d:"Portatile per lavoro e studio."},
{id:5,n:"Cuffie wireless",c:"Tecnologia",e:"🎧",ch:69,it:79,r:4.4,d:"Audio e chiamate senza fili."},
{id:6,n:"Friggitrice ad aria 6L",c:"Casa",e:"🍟",ch:79,it:89,r:4.6,d:"Capacità familiare."},
{id:7,n:"Spazzola ad aria calda",c:"Bellezza",e:"🪮",ch:59,it:69,r:4.3,d:"Styling e volume a casa."},
{id:8,n:"Lampada smart",c:"Casa",e:"💡",ch:39,it:45,r:4.2,d:"Illuminazione regolabile."},
{id:9,n:"Robot aspirapolvere",c:"Casa",e:"🤖",ch:229,it:249,r:4.5,d:"Pulizia automatizzata."},
{id:10,n:"Frullatore ad alte prestazioni",c:"Cucina",e:"🥤",ch:69,it:75,r:4.1,d:"Per frullati e preparazioni."},
{id:11,n:"Monitor 27 pollici",c:"Tecnologia",e:"🖥️",ch:179,it:199,r:4.4,d:"Schermo per lavoro e intrattenimento."},
{id:12,n:"Piastra per capelli",c:"Bellezza",e:"✨",ch:79,it:89,r:4.6,d:"Styling e controllo della temperatura."}
];
const shops=[
{name:"Galaxus",sub:"Casa, tecnologia e lifestyle",url:"https://www.galaxus.ch/search?q="},
{name:"Digitec",sub:"Informatica ed elettronica",url:"https://www.digitec.ch/search?q="},
{name:"Brack.ch",sub:"Tecnologia, casa e ufficio",url:"https://www.brack.ch/search?query="},
{name:"Manor",sub:"Casa, bellezza e moda",url:"https://www.manor.ch/it/search?query="},
{name:"Interdiscount",sub:"Elettronica ed elettrodomestici",url:"https://www.interdiscount.ch/it/search?query="},
{name:"Amazon Italia",sub:"Marketplace · verifica consegna CH",url:"https://www.amazon.it/s?k="},
{name:"Amazon Germania",sub:"Marketplace · verifica consegna CH",url:"https://www.amazon.de/s?k="},
{name:"Amazon Svizzera",sub:"Ricerca sul marketplace locale",url:"https://www.amazon.ch/s?k="},
{name:"AliExpress",sub:"Marketplace internazionale",url:"https://www.aliexpress.com/w/wholesale-"},
{name:"eBay Svizzera",sub:"Venditori e spedizioni variabili",url:"https://www.ebay.ch/sch/i.html?_nkw="},
{name:"eBay Italia",sub:"Venditori e spedizioni variabili",url:"https://www.ebay.it/sch/i.html?_nkw="},
{name:"SHEIN Svizzera",sub:"Catalogo e consegna da verificare",url:"https://ch.shein.com/search/"},
{name:"SHEIN Italia",sub:"Catalogo e consegna da verificare",url:"https://it.shein.com/search/"},
{name:"iHerb",sub:"Bellezza e benessere · consegna da verificare",url:"https://www.iherb.com/search?kw="}
];
let category="Tutti",favorites=JSON.parse(localStorage.getItem("ssa-favs")||"[]"),comparison=JSON.parse(localStorage.getItem("ssa-compare")||"[]");
const market=()=>$("market").value, money=n=>market()==="ch"?"CHF "+n.toFixed(2):"€ "+n.toFixed(2);
function card(p){return `<article class="card"><div class="photo">${p.e}</div><div class="body"><div class="tiny">${p.c} · ★ ${p.r}</div><b>${p.n}</b><p class="tiny">${p.d}</p><div class="price">${money(p[market()])}</div><div class="row" style="margin-top:8px;flex-wrap:wrap"><button class="action" data-detail="${p.id}">Dettagli</button><button class="action" data-compare="${p.id}">${comparison.includes(p.id)?"✓ Confronto":"⇄ Confronta"}</button><button class="heart" data-fav="${p.id}">${favorites.includes(p.id)?"♥":"♡"}</button></div></div></article>`}
function filtered(){let q=$("query").value.trim().toLowerCase(),b=Number($("budget").value),arr=products.filter(p=>(category==="Tutti"||p.c===category)&&(!q||(p.n+" "+p.c+" "+p.d).toLowerCase().includes(q))&&(!b||p[market()]<=b));arr.sort($("sort").value==="rating"?(a,b)=>b.r-a.r:(a,b)=>a[market()]-b[market()]);return arr}
function renderProducts(){
  let arr=filtered();
  $("products").innerHTML=arr.map(card).join("")||'<div class="notice">Nessun risultato: modifica la ricerca o il budget.</div>';
  $("count").textContent=arr.length+" prodotti nel catalogo dimostrativo.";
}

function filtered(){
  let q=$("query").value.trim().toLowerCase();
  let b=Number($("budget").value);

  const synonyms={
    "robot da cucina":["robot","impastatrice","planetaria","pane","brioche","impasti","dolci"],
    "robot aspirapolvere":["aspirapolvere","pulizia","pavimenti","casa"],
    "macbook":["computer","portatile","laptop","apple"],
    "friggitrice":["air fryer","friggitrice ad aria","frittura"],
    "phon":["asciugacapelli","asciugatura","capelli"]
  };

let terms=q.split(/\s+/).filter(t=>t.length>2&&!["per","del","della","con","una","uno"].includes(t));
  let expanded=[...terms];

  for(const [key,words] of Object.entries(synonyms)){
    if(terms.some(t=>key.includes(t)||t.includes(key))){
      expanded.push(...words);
    }
  }

  let arr=products
    .filter(p=>(category==="Tutti"||p.c===category)&&(!b||p[market()]<=b))
    .map(p=>{
      let text=(p.n+" "+p.c+" "+p.d).toLowerCase();
      let score=0;
      for(const term of expanded){
        if(text.includes(term)) score+=terms.includes(term)?5:2;
      }
      return {...p,_score:score};
    })
    .filter(p=>!q||p._score>0);

  arr.sort((a,b)=>{
    if(q&&b._score!==a._score) return b._score-a._score;
    if($("sort").value==="rating") return b.r-a.r;
    return a[market()]-b[market()];
  });

  return arr;
}

function renderFavorites(){$("saved-products").innerHTML=products.filter(p=>favorites.includes(p.id)).map(card).join("");$("saved-empty").hidden=favorites.length>0}
function renderCompare(){let arr=products.filter(p=>comparison.includes(p.id));$("compare-list").innerHTML=arr.map(p=>`<div class="panel"><div class="row"><span style="font-size:28px">${p.e}</span><div style="flex:1"><b>${p.n}</b><div class="price">${money(p[market()])}</div><div class="tiny">${p.d}</div></div><button data-remove-compare="${p.id}">Rimuovi</button></div></div>`).join("");$("compare-empty").hidden=arr.length>0}
function renderShops(){let q=$("shop-query").value.trim()||"prodotti";$("shop-links").innerHTML=shops.map(s=>`<a class="shop" target="_blank" rel="noopener noreferrer" href="${s.url+encodeURIComponent(q)}"><b>${s.name} ↗</b><span class="tiny" style="color:#fff">${s.sub}</span></a>`).join("")}
function updateAll(){renderProducts();renderFavorites();renderCompare();renderShops()}
$("categories").innerHTML=["Tutti","Tecnologia","Casa","Bellezza","Cucina"].map(c=>`<button class="chip ${c===category?"active":""}" data-cat="${c}">${c}</button>`).join("");
$("categories").addEventListener("click",e=>{let b=e.target.closest("[data-cat]");if(!b)return;category=b.dataset.cat;[...$("categories").children].forEach(x=>x.classList.toggle("active",x===b));renderProducts()});
$("products").addEventListener("click",handleCardClick);$("saved-products").addEventListener("click",handleCardClick);
function handleCardClick(e){let f=e.target.closest("[data-fav]"),c=e.target.closest("[data-compare]"),d=e.target.closest("[data-detail]");if(f){let id=+f.dataset.fav;favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];localStorage.setItem("ssa-favs",JSON.stringify(favorites));updateAll()}if(c){let id=+c.dataset.compare;comparison=comparison.includes(id)?comparison.filter(x=>x!==id):[...comparison,id];localStorage.setItem("ssa-compare",JSON.stringify(comparison));updateAll()}if(d)showDetail(+d.dataset.detail)}
function showDetail(id){let p=products.find(x=>x.id===id);$("modal-title").textContent=p.n;$("modal-content").innerHTML=`<div style="font-size:48px;text-align:center;padding:18px">${p.e}</div><p>${p.d}</p><div class="price">${money(p[market()])}</div><p class="muted">Prezzo dimostrativo: non verificato presso un rivenditore.</p><button class="primary" id="modal-compare">Aggiungi al confronto</button>`;$("modal").classList.add("open");$("modal-compare").onclick=()=>{if(!comparison.includes(id))comparison.push(id);localStorage.setItem("ssa-compare",JSON.stringify(comparison));renderCompare();$("modal").classList.remove("open")}}
$("close-modal").onclick=()=>$("modal").classList.remove("open");$("modal").addEventListener("click",e=>{if(e.target===$("modal"))$("modal").classList.remove("open")});
$("search").onclick=renderProducts;$("query").addEventListener("keydown",e=>{if(e.key==="Enter")renderProducts()});$("budget").addEventListener("input",renderProducts);$("market").addEventListener("change",updateAll);$("sort").addEventListener("change",renderProducts);
$("shop-search").onclick=renderShops;$("shop-query").addEventListener("keydown",e=>{if(e.key==="Enter")renderShops()});$("shop-market").addEventListener("change",renderShops);
$("assistant-go").onclick=()=>{let q=$("assistant-query").value.trim();if(!q){$("assistant-answer").textContent="Scrivi prodotto, budget e caratteristiche desiderate.";return}$("query").value=q;$("assistant-answer").textContent="Ho trasferito la tua richiesta alla ricerca del catalogo dimostrativo. Per una raccomandazione AI reale servirà collegare un servizio AI e fonti prodotto autorizzate.";$("home").scrollIntoView({behavior:"smooth"});renderProducts()};
document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>{document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===b.dataset.page));document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t===b));window.scrollTo({top:0,behavior:"smooth"})});
$("pref-market").onchange=()=>{$("market").value=$("pref-market").value;updateAll()};
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
updateAll();
