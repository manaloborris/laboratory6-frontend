import { useEffect, useState } from 'react';
import {
  ArrowDownUp,
  ArrowRight,
  Boxes,
  Check,
  LoaderCircle,
  LogOut,
  PackageOpen,
  Pencil,
  PhilippinePeso,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { api, clearTokens, getStoredUser, setStoredUser, setTokens } from './api.js';

const money = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
});

export default function App() {
  const [user, setUser] = useState(getStoredUser);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function loadProducts() {
    setLoading(true);
    setLoadError('');
    try {
      const result = await api.products();
      setProducts(result.data || []);
    } catch (error) {
      if (error.status === 401) {
        clearTokens();
        setStoredUser(null);
        setUser(null);
      } else {
        setLoadError(error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) loadProducts();
  }, [user]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(''), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setEditor(null);
        setDeleteTarget(null);
        return;
      }

      const target = event.target;
      const typing = target instanceof HTMLElement && (
        target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      );

      if (event.key === '/' && user && !typing) {
        event.preventDefault();
        document.getElementById('product-search')?.focus();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user]);

  async function authenticate(mode, values) {
    const result = mode === 'register' ? await api.register(values) : await api.login(values);
    setTokens(result.tokens);
    setStoredUser(result.user);
    setUser(result.user);
    setNotice(mode === 'register' ? 'Your account is ready.' : 'Welcome back.');
  }

  async function logout() {
    setBusy(true);
    try {
      await api.logout();
    } catch {
      clearTokens();
    } finally {
      clearTokens();
      setStoredUser(null);
      setUser(null);
      setProducts([]);
      setBusy(false);
    }
  }

  async function saveProduct(values) {
    setBusy(true);
    try {
      if (editor?.id) {
        await api.updateProduct(editor.id, values);
        setNotice('Product updated.');
      } else {
        await api.createProduct(values);
        setNotice('Product added to inventory.');
      }
      setEditor(null);
      await loadProducts();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteProduct() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await api.deleteProduct(deleteTarget.id);
      setNotice('Product removed.');
      setDeleteTarget(null);
      await loadProducts();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  if (!user) return <AuthScreen onAuthenticate={authenticate} />;

  const searchTerm = query.trim().toLowerCase();
  const filteredProducts = products.filter((product) =>
    `${product.product_name} ${product.description || ''}`.toLowerCase().includes(searchTerm),
  );
  const totalUnits = products.reduce((total, product) => total + Number(product.quantity), 0);
  const inventoryValue = products.reduce(
    (total, product) => total + Number(product.price) * Number(product.quantity),
    0,
  );

  return (
    <main className="workspace">
      <header className="topbar">
        <a className="wordmark" href="#inventory" aria-label="BorrisStock home">
          <span className="wordmark-mark"><img className="brand-logo" src="/image.png" alt="" /></span>
          <span>BorrisStock<span className="wordmark-period">.</span></span>
        </a>
        <div className="topbar-right">
          <div className="account-chip">
            <span className="avatar">{user.username?.slice(0, 1).toUpperCase()}</span>
            <span className="account-name">{user.username}</span>
          </div>
          <button className="icon-button logout-button" onClick={logout} disabled={busy} title="Log out" aria-label="Log out">
            <LogOut size={17} />
          </button>
        </div>
      </header>

      <section className="page-content" id="inventory">
        <div className="page-heading">
          <div>
            <div className="eyebrow"><span className="live-dot" /> INVENTORY / OVERVIEW</div>
            <h1>Products</h1>
            <p className="heading-caption">{products.length} {products.length === 1 ? 'item' : 'items'} in your catalog</p>
          </div>
          <button className="button button-primary" onClick={() => setEditor({})}>
            <Plus size={17} /> Add product
          </button>
        </div>

        <section className="metrics" aria-label="Inventory summary">
          <Metric icon={<PackageOpen size={18} />} label="Catalog items" value={products.length.toLocaleString()} index="01" />
          <Metric icon={<Boxes size={18} />} label="Units in stock" value={totalUnits.toLocaleString()} index="02" />
          <Metric icon={<PhilippinePeso size={18} />} label="Stock value" value={money.format(inventoryValue)} index="03" />
        </section>

        <section className="catalog-section">
          <div className="catalog-toolbar">
            <div className="catalog-title">
              <h2>All products</h2>
              <span className="count-pill">{filteredProducts.length}</span>
            </div>
            <label className="search-field">
              <Search size={16} aria-hidden="true" />
              <input id="product-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" aria-label="Search products" />
              <kbd>/</kbd>
            </label>
          </div>

          {loadError && <div className="inline-error" role="alert">{loadError}<button onClick={loadProducts}>Try again</button></div>}
          <div className="table-wrap">
            <table className="product-table">
              <thead>
                <tr>
                  <th><span className="th-label">PRODUCT</span><ArrowDownUp size={13} /></th>
                  <th>PRICE</th>
                  <th>QUANTITY</th>
                  <th>STATUS</th>
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="table-message"><LoaderCircle className="spin" size={19} /> Loading inventory</td></tr>
                ) : filteredProducts.length ? filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td data-label="Product">
                      <div className="product-cell">
                        <span className="product-thumb"><PackageOpen size={18} /></span>
                        <span className="product-copy">
                          <strong>{product.product_name}</strong>
                          <small>{product.description || 'No description'}</small>
                        </span>
                      </div>
                    </td>
                    <td data-label="Price" className="price-cell">{money.format(Number(product.price))}</td>
                    <td data-label="Quantity"><span className="quantity-value">{Number(product.quantity).toLocaleString()} <span>units</span></span></td>
                    <td data-label="Status"><StockStatus quantity={Number(product.quantity)} /></td>
                    <td data-label="Actions">
                      <div className="row-actions">
                        <button className="icon-button" onClick={() => setEditor(product)} title={`Edit ${product.product_name}`} aria-label={`Edit ${product.product_name}`}>
                          <Pencil size={16} />
                        </button>
                        <button className="icon-button danger-hover" onClick={() => setDeleteTarget(product)} title={`Delete ${product.product_name}`} aria-label={`Delete ${product.product_name}`}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5">
                      <div className="empty-state">
                        <span className="empty-icon"><PackageOpen size={22} /></span>
                        <strong>{query ? 'No matching products' : 'Your catalog is empty'}</strong>
                        <p>{query ? 'Try a different search.' : 'Add your first product to get started.'}</p>
                        {!query && <button className="button button-secondary" onClick={() => setEditor({})}><Plus size={16} /> Add first product</button>}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="table-footer">
            <span><ShieldCheck size={14} /> Synced with LavaLust API</span>
            <span>{filteredProducts.length} shown</span>
          </footer>
        </section>
      </section>

      {editor && <ProductDialog product={editor.id ? editor : null} busy={busy} onClose={() => setEditor(null)} onSave={saveProduct} />}
      {deleteTarget && <DeleteDialog product={deleteTarget} busy={busy} onClose={() => setDeleteTarget(null)} onDelete={deleteProduct} />}
      {notice && <div className="toast" role="status"><Check size={16} />{notice}</div>}
    </main>
  );
}

function AuthScreen({ onAuthenticate }) {
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form.entries());
    try {
      await onAuthenticate(mode, values);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-visual">
        <img className="auth-visual-image" src="/side.png" alt="" />
        <div className="visual-shade" />
        <a className="wordmark visual-wordmark" href="#login">
          <span className="wordmark-mark"><img className="brand-logo" src="/image.png" alt="" /></span>
          <span>BorrisStock<span className="wordmark-period">.</span></span>
        </a>
        <div className="visual-copy">
          <h1>Good stock.<br /><em>Clear mind.</em></h1>
        </div>
      </section>

      <section className="auth-panel" id="login">
        <div className="auth-panel-inner">
          <div className="auth-heading">
            <span className="auth-icon"><ShieldCheck size={20} /></span>
            <h2>{mode === 'login' ? 'Sign in to BorrisStock' : 'Create your BorrisStock account'}</h2>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {mode === 'register' && <Field label="Username" name="username" placeholder="Your name" autoComplete="username" required maxLength={100} />}
            <Field label="Email address" name="email" type="email" placeholder="you@company.com" autoComplete="email" required maxLength={255} />
            <Field label="Password" name="password" type="password" placeholder="At least 8 characters" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={8} />
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="button button-primary auth-submit" disabled={busy}>
              {busy ? <LoaderCircle size={17} className="spin" /> : <>{mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={17} /></>}
            </button>
          </form>

          <div className="auth-switch">
            <span>{mode === 'login' ? 'New to BorrisStock?' : 'Already have an account?'}</span>
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({ label, name, type = 'text', ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input name={name} type={type} {...props} />
    </label>
  );
}

function Metric({ icon, label, value, index }) {
  return (
    <article className="metric">
      <div className="metric-top"><span className="metric-icon">{icon}</span><span className="metric-index">{index}</span></div>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function StockStatus({ quantity }) {
  const status = quantity === 0 ? 'Out of stock' : quantity <= 5 ? 'Low stock' : 'In stock';
  return <span className={`stock-status ${quantity === 0 ? 'stock-out' : quantity <= 5 ? 'stock-low' : 'stock-good'}`}><i />{status}</span>;
}

function ProductDialog({ product, busy, onClose, onSave }) {
  async function submit(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    values.price = Number(values.price).toFixed(2);
    values.quantity = Number.parseInt(values.quantity, 10);
    await onSave(values);
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="dialog-frame">
        <span className="dialog-web dialog-web-start" aria-hidden="true" />
        <span className="dialog-web dialog-web-end" aria-hidden="true" />
        <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="product-dialog-title">
        <div className="dialog-heading">
          <div><span className="dialog-kicker">CATALOG / PRODUCT</span><h2 id="product-dialog-title">{product ? 'Edit product' : 'Add product'}</h2></div>
          <button className="icon-button" onClick={onClose} title="Close" aria-label="Close dialog"><X size={18} /></button>
        </div>
        <form className="product-form" onSubmit={submit}>
          <Field label="Product name" name="product_name" placeholder="e.g. Ceramic pour-over set" defaultValue={product?.product_name || ''} required maxLength={100} />
          <label className="field"><span>Description <small>OPTIONAL</small></span><textarea name="description" rows="3" placeholder="A short description" defaultValue={product?.description || ''} /></label>
          <div className="form-row">
            <Field label="Price (PHP)" name="price" type="number" min="0" max="99999999.99" step="0.01" placeholder="0.00" defaultValue={product?.price || ''} required />
            <Field label="Quantity" name="quantity" type="number" min="0" max="2147483647" step="1" placeholder="0" defaultValue={product?.quantity ?? ''} required />
          </div>
          <div className="dialog-actions">
            <button type="button" className="button button-quiet" onClick={onClose} disabled={busy}>Cancel</button>
            <button className="button button-primary" disabled={busy}>{busy ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}{product ? 'Save changes' : 'Add to inventory'}</button>
          </div>
        </form>
        </section>
      </div>
    </div>
  );
}

function DeleteDialog({ product, busy, onClose, onDelete }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="dialog-frame dialog-frame-delete">
        <span className="dialog-web dialog-web-start" aria-hidden="true" />
        <span className="dialog-web dialog-web-end" aria-hidden="true" />
        <section className="dialog delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title">
        <span className="delete-icon"><Trash2 size={19} /></span>
        <span className="dialog-kicker">REMOVE FROM CATALOG</span>
        <h2 id="delete-title">Delete this product?</h2>
        <p><strong>{product.product_name}</strong> will be permanently removed from your inventory.</p>
        <div className="dialog-actions">
          <button className="button button-quiet" onClick={onClose} disabled={busy}>Keep product</button>
          <button className="button button-danger" onClick={onDelete} disabled={busy}>{busy ? <LoaderCircle size={16} className="spin" /> : <Trash2 size={16} />}Delete product</button>
        </div>
        </section>
      </div>
    </div>
  );
}