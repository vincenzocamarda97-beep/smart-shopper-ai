import os, csv, io, sqlite3, secrets, time
from functools import wraps
from pathlib import Path
from flask import Flask, request, jsonify, session, send_from_directory, abort
from werkzeug.security import generate_password_hash, check_password_hash

ROOT = Path(__file__).resolve().parent
DB_PATH = os.getenv("DATABASE_PATH", str(ROOT / "smartshopper.db"))
app = Flask(__name__, static_folder=".", static_url_path="")
app.secret_key = os.getenv("SECRET_KEY", "CHANGE_ME_BEFORE_DEPLOYMENT")
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.getenv("COOKIE_SECURE", "0") == "1",
    MAX_CONTENT_LENGTH=2 * 1024 * 1024,
)

def db():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con

def init_db():
    with db() as c:
        c.executescript("""
        CREATE TABLE IF NOT EXISTS users(
          id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
          created_at INTEGER NOT NULL, is_admin INTEGER DEFAULT 0, plan TEXT DEFAULT 'free'
        );
        CREATE TABLE IF NOT EXISTS products(
          id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL DEFAULT '',
          description TEXT DEFAULT '', image TEXT DEFAULT '', currency TEXT NOT NULL,
          price REAL NOT NULL, product_url TEXT DEFAULT '', retailer TEXT DEFAULT '',
          external_id TEXT DEFAULT '', updated_at INTEGER NOT NULL, source TEXT DEFAULT 'demo'
        );
        CREATE TABLE IF NOT EXISTS price_history(
          id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL, currency TEXT NOT NULL,
          price REAL NOT NULL, checked_at INTEGER NOT NULL,
          FOREIGN KEY(product_id) REFERENCES products(id)
        );
        CREATE TABLE IF NOT EXISTS favorites(
          user_id INTEGER NOT NULL, product_id INTEGER NOT NULL,
          PRIMARY KEY(user_id,product_id)
        );
        CREATE TABLE IF NOT EXISTS watchlist(
          id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, product_id INTEGER NOT NULL,
          target_price REAL NOT NULL, currency TEXT NOT NULL, created_at INTEGER NOT NULL,
          UNIQUE(user_id,product_id)
        );
        CREATE TABLE IF NOT EXISTS stores(
          id INTEGER PRIMARY KEY, name TEXT NOT NULL, country TEXT NOT NULL,
          search_url TEXT NOT NULL, note TEXT DEFAULT ''
        );
        """)
        count = c.execute("SELECT COUNT(*) n FROM products").fetchone()["n"]
        if count == 0:
            demo = [
              ("Robot da cucina multifunzione","Cucina","Per impasti, dolci e preparazioni.", "CHF",179,"https://www.galaxus.ch/search?q=robot%20da%20cucina","Galaxus"),
              ("Impastatrice planetaria","Cucina","Per pane, pizza e brioche.","CHF",149,"https://www.brack.ch/search?query=impastatrice","Brack.ch"),
              ("Asciugacapelli professionale","Bellezza","Per asciugatura e styling.","CHF",89,"https://www.manor.ch/it/search?query=asciugacapelli","Manor"),
              ("MacBook Air 13 pollici","Tecnologia","Portatile per lavoro e studio.","CHF",899,"https://www.digitec.ch/search?q=macbook","Digitec"),
              ("Cuffie wireless","Tecnologia","Audio e chiamate senza fili.","CHF",69,"https://www.digitec.ch/search?q=cuffie","Digitec"),
              ("Friggitrice ad aria 6L","Casa","Capacità familiare.","CHF",79,"https://www.galaxus.ch/search?q=friggitrice%20aria","Galaxus"),
              ("Spazzola ad aria calda","Bellezza","Styling e volume a casa.","EUR",59,"https://www.amazon.it/s?k=spazzola+aria+calda","Amazon.it"),
              ("Lampada smart","Casa","Illuminazione regolabile.","EUR",39,"https://www.amazon.it/s?k=lampada+smart","Amazon.it"),
            ]
            now = int(time.time())
            for p in demo:
                c.execute("""INSERT INTO products(name,category,description,currency,price,product_url,retailer,updated_at,source)
                VALUES(?,?,?,?,?,?,?,?,?)""", (*p, now, "sample"))
        if c.execute("SELECT COUNT(*) n FROM stores").fetchone()["n"] == 0:
            stores = [
              ("Galaxus","CH","https://www.galaxus.ch/search?q=","Ricerca pubblica; verifica consegna e disponibilità"),
              ("Digitec","CH","https://www.digitec.ch/search?q=","Ricerca pubblica"),
              ("Brack.ch","CH","https://www.brack.ch/search?query=","Ricerca pubblica"),
              ("Manor","CH","https://www.manor.ch/it/search?query=","Ricerca pubblica"),
              ("Interdiscount","CH","https://www.interdiscount.ch/it/search?query=","Ricerca pubblica"),
              ("Amazon Italia","IT","https://www.amazon.it/s?k=","Spedizione CH variabile per articolo"),
              ("Amazon Germania","DE","https://www.amazon.de/s?k=","Spedizione CH variabile per articolo"),
              ("AliExpress","INT","https://www.aliexpress.com/w/wholesale-","Venditore e consegna da verificare"),
              ("eBay Svizzera","CH","https://www.ebay.ch/sch/i.html?_nkw=","Venditore e consegna da verificare"),
              ("eBay Italia","IT","https://www.ebay.it/sch/i.html?_nkw=","Venditore e consegna da verificare"),
              ("SHEIN Svizzera","CH","https://ch.shein.com/search/","Consegna e disponibilità da verificare"),
              ("SHEIN Italia","IT","https://it.shein.com/search/","Consegna e disponibilità da verificare"),
              ("iHerb","INT","https://www.iherb.com/search?kw=","Consegna e disponibilità da verificare"),
            ]
            c.executemany("INSERT INTO stores(name,country,search_url,note) VALUES(?,?,?,?)", stores)

init_db()

def login_required(fn):
    @wraps(fn)
    def wrapper(*a, **kw):
        if not session.get("user_id"):
            return jsonify(error="Autenticazione richiesta"), 401
        return fn(*a, **kw)
    return wrapper

def admin_required(fn):
    @wraps(fn)
    def wrapper(*a, **kw):
        if not session.get("is_admin"):
            return jsonify(error="Permessi amministratore richiesti"), 403
        return fn(*a, **kw)
    return wrapper

@app.after_request
def security_headers(resp):
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    resp.headers["X-Frame-Options"] = "DENY"
    return resp

@app.get("/")
def home():
        return send_from_directory(str(ROOT), "index.html")

@app.get("/api/health")
def health():
    return jsonify(status="ok", app="Smart Shopper AI", mode="MVP")

@app.get("/api/me")
def me():
    if not session.get("user_id"):
        return jsonify(user=None)
    return jsonify(user={"id":session["user_id"],"email":session["email"],"plan":session.get("plan","free"),"is_admin":bool(session.get("is_admin"))})

@app.post("/api/register")
def register():
    data=request.get_json(silent=True) or {}
    email=str(data.get("email","")).strip().lower()
    password=str(data.get("password",""))
    if "@" not in email or len(password)<10:
        return jsonify(error="Inserisci un'email valida e una password di almeno 10 caratteri."),400
    try:
        with db() as c:
            cur=c.execute("INSERT INTO users(email,password_hash,created_at) VALUES(?,?,?)",
                          (email,generate_password_hash(password),int(time.time())))
            uid=cur.lastrowid
        session.update(user_id=uid,email=email,plan="free",is_admin=False)
        return jsonify(ok=True,user={"id":uid,"email":email,"plan":"free"})
    except sqlite3.IntegrityError:
        return jsonify(error="Questa email è già registrata."),409

@app.post("/api/login")
def login():
    data=request.get_json(silent=True) or {}
    email=str(data.get("email","")).strip().lower()
    with db() as c: user=c.execute("SELECT * FROM users WHERE email=?",(email,)).fetchone()
    if not user or not check_password_hash(user["password_hash"],str(data.get("password",""))):
        return jsonify(error="Email o password non corretti."),401
    session.clear()
    session.update(user_id=user["id"],email=user["email"],plan=user["plan"],is_admin=bool(user["is_admin"]))
    return jsonify(ok=True,user={"id":user["id"],"email":user["email"],"plan":user["plan"],"is_admin":bool(user["is_admin"])})

@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify(ok=True)

@app.get("/api/products")
def products():
    q=request.args.get("q","").strip()
    category=request.args.get("category","").strip()
    currency=request.args.get("currency","CHF").upper()
    max_price=request.args.get("max_price","")
    sql="SELECT * FROM products WHERE currency=?"
    args=[currency]
    if q: sql+=" AND (name LIKE ? OR category LIKE ? OR description LIKE ?)"; args += [f"%{q}%"]*3
    if category: sql+=" AND category=?"; args.append(category)
    if max_price:
        try: sql+=" AND price<=?"; args.append(float(max_price))
        except ValueError: return jsonify(error="Budget non valido"),400
    sql+=" ORDER BY price ASC LIMIT 100"
    with db() as c: rows=c.execute(sql,args).fetchall()
    return jsonify(products=[dict(r) for r in rows],disclaimer="Prezzi campione o importati: controlla sempre il negozio. Non sono necessariamente offerte live.")

@app.get("/api/stores")
def stores():
    with db() as c: rows=c.execute("SELECT * FROM stores ORDER BY country,name").fetchall()
    return jsonify(stores=[dict(r) for r in rows])

@app.get("/api/favorites")
@login_required
def get_favorites():
    with db() as c:
        rows=c.execute("""SELECT p.* FROM products p JOIN favorites f ON f.product_id=p.id WHERE f.user_id=?""",(session["user_id"],)).fetchall()
    return jsonify(products=[dict(r) for r in rows])

@app.post("/api/favorites/<int:pid>")
@login_required
def toggle_favorite(pid):
    with db() as c:
        if not c.execute("SELECT id FROM products WHERE id=?",(pid,)).fetchone(): return jsonify(error="Prodotto non trovato"),404
        exists=c.execute("SELECT 1 FROM favorites WHERE user_id=? AND product_id=?",(session["user_id"],pid)).fetchone()
        if exists: c.execute("DELETE FROM favorites WHERE user_id=? AND product_id=?",(session["user_id"],pid)); saved=False
        else: c.execute("INSERT INTO favorites(user_id,product_id) VALUES(?,?)",(session["user_id"],pid)); saved=True
    return jsonify(saved=saved)

@app.get("/api/watchlist")
@login_required
def get_watchlist():
    with db() as c:
        rows=c.execute("""SELECT w.*,p.name,p.retailer,p.price AS current_price FROM watchlist w JOIN products p ON p.id=w.product_id WHERE w.user_id=?""",(session["user_id"],)).fetchall()
    return jsonify(items=[dict(r) for r in rows])

@app.post("/api/watchlist")
@login_required
def add_watch():
    data=request.get_json(silent=True) or {}
    try: pid=int(data["product_id"]); target=float(data["target_price"]); currency=str(data["currency"]).upper()
    except Exception: return jsonify(error="Dati non validi"),400
    if target<=0 or currency not in ("CHF","EUR"): return jsonify(error="Prezzo o valuta non validi"),400
    with db() as c:
        if not c.execute("SELECT id FROM products WHERE id=?",(pid,)).fetchone(): return jsonify(error="Prodotto non trovato"),404
        c.execute("INSERT OR REPLACE INTO watchlist(user_id,product_id,target_price,currency,created_at) VALUES(?,?,?,?,?)",(session["user_id"],pid,target,currency,int(time.time())))
    return jsonify(ok=True,note="Monitoraggio salvato. Le notifiche automatiche richiedono un servizio di invio e una fonte prezzi aggiornata.")

@app.delete("/api/watchlist/<int:wid>")
@login_required
def delete_watch(wid):
    with db() as c: c.execute("DELETE FROM watchlist WHERE id=? AND user_id=?",(wid,session["user_id"]))
    return jsonify(ok=True)

@app.post("/api/assistant")
def assistant():
    data=request.get_json(silent=True) or {}
    prompt=str(data.get("prompt","")).strip()[:2000]
    if not prompt: return jsonify(error="Scrivi cosa stai cercando."),400
    api_key=os.getenv("OPENAI_API_KEY")
    if not api_key:
        return jsonify(answer="Assistente in modalità base: descrivi prodotto, budget e caratteristiche. Per risposte AI reali, l'amministratore deve configurare OPENAI_API_KEY sul server. Nessun prezzo viene inventato."),200
    try:
        import requests
        r=requests.post("https://api.openai.com/v1/responses",headers={"Authorization":f"Bearer {api_key}","Content-Type":"application/json"},
          json={"model":os.getenv("OPENAI_MODEL","gpt-4.1-mini"),"input":"Sei Smart Shopper AI. Aiuta a definire criteri di acquisto, non inventare prezzi o disponibilità. Richiesta: "+prompt},timeout=25)
        r.raise_for_status()
        obj=r.json()
        text_out=" ".join(x.get("text","") for item in obj.get("output",[]) for x in item.get("content",[]) if x.get("type")=="output_text")
        return jsonify(answer=text_out or "Non ho generato una risposta.")
    except Exception:
        return jsonify(error="Servizio AI temporaneamente non disponibile."),502

@app.post("/api/admin/import-csv")
@admin_required
def import_csv():
    # CSV columns: name,category,description,currency,price,product_url,retailer,external_id
    f=request.files.get("file")
    if not f: return jsonify(error="Carica un CSV."),400
    try:
        reader=csv.DictReader(io.StringIO(f.stream.read().decode("utf-8-sig")))
        now=int(time.time()); inserted=0
        with db() as c:
            for row in reader:
                currency=row.get("currency","").upper()
                price=float(row.get("price",""))
                if currency not in ("CHF","EUR") or price<=0 or not row.get("name"): continue
                c.execute("""INSERT INTO products(name,category,description,currency,price,product_url,retailer,external_id,updated_at,source)
                VALUES(?,?,?,?,?,?,?,?,?,'admin_csv')""",(row["name"],row.get("category",""),row.get("description",""),currency,price,row.get("product_url",""),row.get("retailer",""),row.get("external_id",""),now))
                inserted+=1
        return jsonify(ok=True,imported=inserted)
    except Exception as e:
        return jsonify(error=f"CSV non valido: {e}"),400

@app.get("/api/admin/summary")
@admin_required
def admin_summary():
    with db() as c:
        return jsonify(users=c.execute("SELECT COUNT(*) n FROM users").fetchone()["n"],
          products=c.execute("SELECT COUNT(*) n FROM products").fetchone()["n"],
          watchlists=c.execute("SELECT COUNT(*) n FROM watchlist").fetchone()["n"])

@app.post("/api/admin/create-first-admin")
def create_first_admin():
    # One-time bootstrap: only succeeds when no admin exists and requires secret.
    if not os.getenv("BOOTSTRAP_ADMIN_SECRET"): return jsonify(error="Bootstrap disattivato: configura BOOTSTRAP_ADMIN_SECRET."),403
    data=request.get_json(silent=True) or {}
    if not secrets.compare_digest(str(data.get("secret","")),os.getenv("BOOTSTRAP_ADMIN_SECRET")):
        return jsonify(error="Secret non valido."),403
    email=str(data.get("email","")).strip().lower(); password=str(data.get("password",""))
    if "@" not in email or len(password)<14: return jsonify(error="Email non valida o password troppo corta (minimo 14)."),400
    with db() as c:
        if c.execute("SELECT 1 FROM users WHERE is_admin=1").fetchone(): return jsonify(error="Amministratore già creato."),409
        cur=c.execute("INSERT INTO users(email,password_hash,created_at,is_admin,plan) VALUES(?,?,?,?,?)",(email,generate_password_hash(password),int(time.time()),1,"admin"))
        uid=cur.lastrowid
    session.update(user_id=uid,email=email,plan="admin",is_admin=True)
    return jsonify(ok=True)

if __name__ == "__main__":
    app.run(host="0.0.0.0",port=int(os.getenv("PORT","8000")),debug=False)
