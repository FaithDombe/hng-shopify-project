import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './supabase.js';

const products = [
  { id: 1, name: 'Everyday Rice', category: 'Groceries', price: 12500, icon: '🍚', label: 'Customer favourite', tone: 'rice' },
  { id: 2, name: 'Classic Blender', category: 'Home & Kitchen', price: 28500, icon: '🥤', label: 'Good value', tone: 'blender' },
  { id: 3, name: 'Soft Cotton T-Shirt', category: 'Fashion', price: 9500, icon: '👕', label: 'New arrival', tone: 'shirt' },
  { id: 4, name: 'Wireless Headphones', category: 'Electronics', price: 42000, icon: '🎧', label: 'Popular pick', tone: 'audio' },
  { id: 5, name: 'Golden Cooking Oil', category: 'Groceries', price: 8700, icon: '🫒', label: 'Kitchen staple', tone: 'oil' },
  { id: 6, name: 'Everyday Sneakers', category: 'Fashion', price: 32000, icon: '👟', label: 'Easy to wear', tone: 'shoe' },
  { id: 7, name: 'Pour-Over Kettle', category: 'Home & Kitchen', price: 18500, icon: '🫖', label: 'Made for mornings', tone: 'kettle' },
  { id: 8, name: 'Crunchy Breakfast Cereal', category: 'Groceries', price: 6400, icon: '🥣', label: 'Pantry pick', tone: 'cereal' },
];
const categories = [
  { name: 'All finds', icon: '✳' }, { name: 'Groceries', icon: '🥑' },
  { name: 'Home & Kitchen', icon: '🏠' }, { name: 'Electronics', icon: '🎧' }, { name: 'Fashion', icon: '👟' },
];
const money = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });

export default function App() {
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('everyday-market-cart') || '[]'); }
    catch { return []; }
  });
  const [activeCategory, setActiveCategory] = useState('All finds');
  const [search, setSearch] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [session, setSession] = useState(null);
  const [cartReady, setCartReady] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderBusy, setOrderBusy] = useState(false);
  const [orderMessage, setOrderMessage] = useState('');
  const [orderResult, setOrderResult] = useState(null);
  const [delivery, setDelivery] = useState({ name: '', phone: '', address: '' });
  const visibleProducts = useMemo(() => products.filter(product => {
    const matchesCategory = activeCategory === 'All finds' || product.category === activeCategory;
    const matchesSearch = `${product.name} ${product.category}`.toLowerCase().includes(search.trim().toLowerCase());
    return matchesCategory && matchesSearch;
  }), [activeCategory, search]);
  useEffect(() => {
    if (!accountOpen) return;
    function closeAccountMenu(event) {
      if (!accountRef.current?.contains(event.target)) setAccountOpen(false);
    }
    document.addEventListener('mousedown', closeAccountMenu);
    return () => document.removeEventListener('mousedown', closeAccountMenu);
  }, [accountOpen]);
  useEffect(() => {
    if (!accountOpen) return;
    function closeAccountMenu(event) {
      if (!accountRef.current?.contains(event.target)) setAccountOpen(false);
    }
    document.addEventListener('mousedown', closeAccountMenu);
    return () => document.removeEventListener('mousedown', closeAccountMenu);
  }, [accountOpen]);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session?.user) {
      setCartReady(true);
      try { localStorage.setItem('everyday-market-cart', JSON.stringify(cart)); } catch { /* Browser storage may be unavailable. */ }
      return;
    }
    let active = true;
    setCartReady(false);
    const userId = session.user.id;
    async function loadCart() {
      const { data, error } = await supabase.from('carts').select('items').eq('user_id', userId).maybeSingle();
      if (!active) return;
      if (error) { setNotice(`Cart sync failed: ${error.message}`); setCartReady(true); return; }
      let local = [];
      try { local = JSON.parse(localStorage.getItem('everyday-market-cart') || '[]'); } catch { /* Ignore invalid local cart. */ }
      const remote = data?.items || [];
      const merged = [...remote];
      for (const item of local) {
        const found = merged.find(entry => entry.id === item.id);
        if (found) found.quantity += item.quantity;
        else merged.push(item);
      }
      setCart(merged);
      if (local.length) await supabase.from('carts').upsert({ user_id: userId, items: merged, updated_at: new Date().toISOString() });
      try { localStorage.removeItem('everyday-market-cart'); } catch { /* Ignore unavailable storage. */ }
      setCartReady(true);
    }
    loadCart();
    const channel = supabase.channel(`cart-${userId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'carts', filter: `user_id=eq.${userId}` }, payload => {
      if (payload.new?.items) setCart(current => JSON.stringify(current) === JSON.stringify(payload.new.items) ? current : payload.new.items);
    }).subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [session?.user?.id]);
  useEffect(() => {
    if (!session?.user || !cartReady) return;
    const timeout = window.setTimeout(async () => {
      const { error } = await supabase.from('carts').upsert({ user_id: session.user.id, items: cart, updated_at: new Date().toISOString() });
      if (error) setNotice(`Cart sync failed: ${error.message}`);
    }, 120);
    return () => window.clearTimeout(timeout);
  }, [cart, cartReady, session?.user?.id]);
  useEffect(() => {
    if (session?.user) return;
    try { localStorage.setItem('everyday-market-cart', JSON.stringify(cart)); } catch { /* Browser storage may be unavailable. */ }
  }, [cart, session?.user?.id]);
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  function addToCart(product) {
    setCart(items => {
      const found = items.find(item => item.id === product.id);
      return found ? items.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...items, { ...product, quantity: 1 }];
    });
    setNotice(`${product.name} added to your cart`);
    window.setTimeout(() => setNotice(''), 2200);
  }
  function changeQuantity(productId, amount) {
    setCart(items => items.map(item => item.id === productId ? { ...item, quantity: item.quantity + amount } : item).filter(item => item.quantity > 0));
  }
  function chooseCategory(name) {
    setActiveCategory(name);
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  }

  async function handleSignOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setNotice(`Sign-out could not finish: ${error.message}`);
    else { setAccountOpen(false); setNotice('You have signed out.'); }
  }
  async function handleGoogleSignIn() {
    if (!supabase) { setNotice('Add your Supabase project settings before signing in.'); return; }
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) setNotice(`Sign-in could not start: ${error.message}`);
  }
  async function submitOrder(event) {
    event.preventDefault();
    if (!supabase) { setOrderMessage('Connect your Supabase project first.'); return; }
    if (!session?.user) { setOrderMessage('Please sign in with Google before placing an order.'); return; }
    setOrderBusy(true); setOrderMessage('');
    try {
      const { data: saved, error } = await supabase.from('orders').insert({
        user_id: session.user.id,
        customer_name: delivery.name.trim(),
        customer_email: session.user.email,
        customer_phone: delivery.phone.trim(),
        shipping_address: delivery.address.trim(),
        items: cart.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, unit_price: item.price })),
        total: cartTotal,
      }).select('id').single();
      if (error) throw error;
      const { error: emailError } = await supabase.functions.invoke('send-order-confirmation', { body: { orderId: saved.id } });
      setCart([]);
      setOrderResult({ id: saved.id, emailSent: !emailError });
    } catch (error) {
      setOrderMessage(error.message || 'We could not save the order. Please try again.');
    } finally { setOrderBusy(false); }
  }
  return <>
    <div className="announcement"><span>Little finds, lovely prices</span><span className="announcement-divider">✦</span><span>Welcome to Everyday Market</span></div>
    <header className="site-header">
      <a className="brand" href="#home" aria-label="Everyday Market home"><span className="brand-mark">e</span><span>everyday<span className="brand-light">market</span></span></a>
      <label className="search-box"><span aria-hidden="true">⌕</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search for something good..." aria-label="Search products" />{search && <button type="button" aria-label="Clear search" onClick={() => setSearch('')}>×</button>}</label>
      <div className="header-actions"><div className="account-wrap" ref={accountRef}><button className="account-button" type="button" aria-haspopup="menu" aria-expanded={Boolean(session?.user && accountOpen)} onClick={() => session?.user ? setAccountOpen(open => !open) : handleGoogleSignIn()} title={session?.user?.email ?? 'Sign in with Google'}><span aria-hidden="true">♙</span><span>{session?.user?.email ?? 'Account'}</span><span className="account-chevron" aria-hidden="true">⌄</span></button>{session?.user && accountOpen && <div className="account-menu" role="menu"><small>Signed in as</small><strong>{session.user.email}</strong><button type="button" role="menuitem" onClick={handleSignOut}>Sign out</button></div>}</div><button className="cart-button" type="button" onClick={() => setCartOpen(true)} aria-label={`Open cart, ${cartCount} items`}><span className="cart-icon" aria-hidden="true">▱</span><span className="cart-label">Cart</span><b>{cartCount}</b></button></div>
    </header>
    <nav className="category-nav" aria-label="Shop categories">{categories.map(category => <button key={category.name} className={activeCategory === category.name ? 'nav-category active' : 'nav-category'} type="button" onClick={() => chooseCategory(category.name)}><span aria-hidden="true">{category.icon}</span>{category.name}</button>)}</nav>
    <main id="home" className="storefront">
      <section className="hero"><div className="hero-content"><span className="hero-kicker"><i /> A GOOD DAY TO FIND SOMETHING</span><h1>Good things,<br /><em>right this way.</em></h1><p>Little upgrades, everyday essentials, and lovely finds for your home and life.</p><a className="primary-link" href="#products">Explore the shop <span aria-hidden="true">↗</span></a><div className="hero-footnote"><span>✳</span> A friendly little corner for good finds.</div></div><div className="hero-scene" aria-hidden="true"><div className="hero-sun"/><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><div className="hero-bag"><div className="bag-handle"/><span>e</span></div><span className="hero-spark spark-one">✦</span><span className="hero-spark spark-two">✳</span><span className="hero-spark spark-three">✧</span><div className="hero-sticker">GOOD<br/>FINDS<br/><b>HERE</b></div></div></section>
      <section className="category-section" aria-labelledby="category-title"><div className="section-title-row"><div><p className="eyebrow">A LITTLE BIT OF EVERYTHING</p><h2 id="category-title">What are you in the mood for?</h2></div><button className="text-link" type="button" onClick={() => setActiveCategory('All finds')}>See everything <span>→</span></button></div><div className="category-cards">{[
        { name: 'Pantry favourites', category: 'Groceries', icon: '🥑', color: 'mint', caption: 'Good things for the kitchen' },
        { name: 'Home comforts', category: 'Home & Kitchen', icon: '🪴', color: 'peach', caption: 'Make your space feel yours' },
        { name: 'Little tech joys', category: 'Electronics', icon: '🎧', color: 'lilac', caption: 'Clever things, made simple' },
        { name: 'Everyday style', category: 'Fashion', icon: '👟', color: 'butter', caption: 'Easy pieces for every day' },
      ].map(item => <button className={`category-card ${item.color}`} type="button" key={item.category} onClick={() => chooseCategory(item.category)}><span className="category-illustration" aria-hidden="true">{item.icon}</span><span className="category-card-copy"><b>{item.name}</b><small>{item.caption}</small></span><span className="category-arrow" aria-hidden="true">↗</span></button>)}</div></section>
      <section className="promo-strip"><div className="promo-icon" aria-hidden="true">✳</div><div><p className="eyebrow">A NOTE FROM OUR LITTLE SHOP</p><h2>Everyday essentials can still feel special.</h2><p>Take a look around and find something that makes your day a little brighter.</p></div><a href="#products" className="promo-link">Find your favourite <span>→</span></a><span className="promo-decoration" aria-hidden="true">✿</span></section>
      <section className="products-section" id="products" aria-labelledby="products-heading"><div className="section-title-row product-title-row"><div><p className="eyebrow">HANDPICKED FOR YOU</p><h2 id="products-heading">A few good finds</h2></div><span className="result-count">{visibleProducts.length} {visibleProducts.length === 1 ? 'find' : 'finds'}</span></div><div className="filter-pills" aria-label="Filter products by category">{categories.map(category => <button type="button" key={category.name} className={activeCategory === category.name ? 'filter-pill selected' : 'filter-pill'} onClick={() => setActiveCategory(category.name)}>{category.name}</button>)}</div>
        {visibleProducts.length ? <div className="product-grid">{visibleProducts.map(product => <article className="product-card" key={product.id}><div className={`product-art art-${product.tone}`}><span className="product-badge">{product.label}</span><span className="product-emoji" aria-hidden="true">{product.icon}</span><button type="button" className="save-button" aria-label={`Save ${product.name}`} onClick={() => setNotice('Favourites will be available when accounts are connected.')}>♡</button></div><div className="product-info"><p className="product-category">{product.category}</p><h3>{product.name}</h3><div className="product-bottom"><strong>{money.format(product.price)}</strong><button type="button" className="add-button" onClick={() => addToCart(product)} aria-label={`Add ${product.name} to cart`}><span>Add to cart</span><b aria-hidden="true">+</b></button></div></div></article>)}</div> : <div className="empty-results"><span>⌕</span><h3>No finds just yet</h3><p>Try another search or choose a different category.</p><button type="button" onClick={() => { setSearch(''); setActiveCategory('All finds'); }}>Show all products</button></div>}
      </section>
      <section className="newsletter"><div className="newsletter-flower" aria-hidden="true">✿</div><div><p className="eyebrow">GOOD THINGS, OCCASIONALLY</p><h2>A little note from us?</h2><p>We’ll have shop updates here soon. For now, enjoy looking around.</p></div><a href="#home" className="newsletter-link">Back to the top ↑</a></section>
    </main>
    <footer className="site-footer"><a className="brand footer-brand" href="#home"><span className="brand-mark">e</span><span>everyday<span className="brand-light">market</span></span></a><p>Good finds for everyday living.</p><div className="footer-meta"><span>Sample shop project</span><span>Made with care ✳</span><span>© 2026 Everyday Market</span></div></footer>
    {notice && <div className="toast" role="status"><span>✓</span>{notice}<button type="button" aria-label="Dismiss message" onClick={() => setNotice('')}>×</button></div>}
    {cartOpen && <div className="cart-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setCartOpen(false); }}><aside className="cart-panel" aria-label="Shopping cart"><div className="cart-panel-head"><div><p className="eyebrow">YOUR LITTLE HAUL</p><h2>Your cart <span>({cartCount})</span></h2></div><button className="close-cart" type="button" aria-label="Close cart" onClick={() => setCartOpen(false)}>×</button></div>{cart.length === 0 ? <div className="cart-empty"><span aria-hidden="true">🛍️</span><h3>Your cart is waiting</h3><p>Add a few good finds and they’ll show up here.</p><button type="button" onClick={() => setCartOpen(false)}>Keep browsing</button></div> : <><div className="cart-items">{cart.map(item => <div className="cart-item" key={item.id}><div className={`cart-item-art art-${item.tone}`} aria-hidden="true">{item.icon}</div><div className="cart-item-copy"><b>{item.name}</b><span>{money.format(item.price)}</span><div className="quantity-control"><button type="button" aria-label={`Remove one ${item.name}`} onClick={() => changeQuantity(item.id, -1)}>−</button><span>{item.quantity}</span><button type="button" aria-label={`Add one ${item.name}`} onClick={() => changeQuantity(item.id, 1)}>+</button></div></div><button type="button" className="remove-item" aria-label={`Remove ${item.name} from cart`} onClick={() => setCart(items => items.filter(entry => entry.id !== item.id))}>×</button></div>)}</div><div className="cart-summary"><div><span>Subtotal</span><strong>{money.format(cartTotal)}</strong></div><p>Delivery details are collected securely at checkout.</p><button type="button" onClick={() => { setCartOpen(false); setCheckoutOpen(true); setOrderMessage(''); setOrderResult(null); }}>Go to checkout</button></div></>}</aside></div>}
    {checkoutOpen && <div className="checkout-backdrop"><section className="checkout-panel" role="dialog" aria-modal="true" aria-labelledby="checkout-title"><header className="checkout-head"><div><p className="eyebrow">ALMOST YOURS</p><h2 id="checkout-title">Checkout</h2></div><button type="button" className="close-cart" aria-label="Close checkout" onClick={() => setCheckoutOpen(false)}>×</button></header>
      {orderResult ? <div className="checkout-success"><span>✓</span><h3>Order placed</h3><p>Your order number is <b>{orderResult.id}</b>.</p><p>{orderResult.emailSent ? 'A confirmation email has been sent.' : 'Your order was saved. Email setup is still needed to send the confirmation.'}</p><button type="button" onClick={() => { setCheckoutOpen(false); setOrderResult(null); }}>Back to the shop</button></div> : <>
        {!session?.user ? <div className="checkout-signin"><p>Sign in with Google to place your order and keep it connected to your account.</p><button type="button" onClick={handleGoogleSignIn}>Continue with Google</button></div> : <div className="checkout-user">Signed in as <b>{session.user.email}</b></div>}
        <form className="checkout-form" onSubmit={submitOrder}><label>Your name<input required autoComplete="name" value={delivery.name} onChange={event => setDelivery({ ...delivery, name: event.target.value })} /></label><label>Phone number<input required type="tel" autoComplete="tel" value={delivery.phone} onChange={event => setDelivery({ ...delivery, phone: event.target.value })} /></label><label>Delivery address<textarea required rows="3" autoComplete="street-address" value={delivery.address} onChange={event => setDelivery({ ...delivery, address: event.target.value })} /></label><div className="checkout-total"><span>Order total</span><b>{money.format(cartTotal)}</b></div>{orderMessage && <p className="checkout-error" role="alert">{orderMessage}</p>}<button className="place-order" type="submit" disabled={orderBusy || cart.length === 0}>{orderBusy ? 'Placing order…' : 'Place order'}</button></form>
      </>}
    </section></div>}
  </>;
}
