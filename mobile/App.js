import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { createClient } from '@supabase/supabase-js';

WebBrowser.maybeCompleteAuthSession();
const supabase = process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ? createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { storage: { getItem: key => SecureStore.getItemAsync(key), setItem: (key, value) => SecureStore.setItemAsync(key, value), removeItem: key => SecureStore.deleteItemAsync(key) }, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
  }) : null;

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

const TONE_COLORS = {
  rice: '#f1e5cc',
  blender: '#e0e9dd',
  shirt: '#e9dfe2',
  audio: '#e4e1ed',
  oil: '#ede7cf',
  shoe: '#e6e3dc',
  kettle: '#dce8e6',
  cereal: '#f2e1d3',
};

const getToneColor = tone => TONE_COLORS[tone] || (tone && (tone.startsWith('#') || tone.startsWith('rgb')) ? tone : '#e8eadf');
const money = value => `₦${Number(value).toLocaleString('en-NG')}`;

export default function App() {
  const [session, setSession] = useState(null);
  const [cart, setCart] = useState([]);
  const [tab, setTab] = useState('Shop');
  const [category, setCategory] = useState('All finds');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const visibleProducts = useMemo(() => products.filter(p => category === 'All finds' || p.category === category), [category]);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, value) => setSession(value));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user || !supabase) { setCart([]); setLoading(false); return; }
    let active = true;
    setLoading(true);
    const userId = session.user.id;
    async function loadCart() {
      const { data, error } = await supabase.from('carts').select('items').eq('user_id', userId).maybeSingle();
      if (!active) return;
      if (error) Alert.alert('Cart sync failed', error.message);
      setCart(data?.items || []);
      setLoading(false);
    }
    loadCart();
    const channel = supabase.channel(`mobile-cart-${userId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'carts', filter: `user_id=eq.${userId}` }, event => {
      if (event.eventType === 'DELETE') {
        setCart([]);
      } else if (event.new?.items) {
        setCart(current => JSON.stringify(current) === JSON.stringify(event.new.items) ? current : event.new.items);
      }
    }).subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  async function saveCart(next) {
    setCart(next);
    if (!session?.user || !supabase) return;
    setSyncing(true);
    const { error } = await supabase.from('carts').upsert({ user_id: session.user.id, items: next, updated_at: new Date().toISOString() });
    setSyncing(false);
    if (error) Alert.alert('Cart sync failed', error.message);
  }
  function add(product) {
    const found = cart.find(item => item.id === product.id);
    saveCart(found ? cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...cart, { ...product, quantity: 1 }]);
  }
  async function signIn() {
    if (!supabase) { Alert.alert('Shop not connected', 'Add the Supabase URL and publishable key to mobile/.env.'); return; }
    const redirectTo = Linking.createURL('auth/callback');
    console.log('Mobile OAuth redirect URL:', redirectTo);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) { Alert.alert('Could not sign in', error.message); return; }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return;

    const url = result.url;
    let access_token = null;
    let refresh_token = null;
    let code = null;
    let error_description = null;

    if (url.includes('#')) {
      const hashPart = url.split('#')[1].split('?')[0];
      const hashParams = new URLSearchParams(hashPart);
      access_token = hashParams.get('access_token');
      refresh_token = hashParams.get('refresh_token');
      code = hashParams.get('code');
      error_description = hashParams.get('error_description');
    }

    if (url.includes('?')) {
      const queryPart = url.split('?')[1].split('#')[0];
      const queryParams = new URLSearchParams(queryPart);
      access_token = access_token || queryParams.get('access_token');
      refresh_token = refresh_token || queryParams.get('refresh_token');
      code = code || queryParams.get('code');
      error_description = error_description || queryParams.get('error_description');
    }

    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) Alert.alert('Could not finish sign in', exchangeError.message);
    } else if (access_token && refresh_token) {
      const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
      if (sessionError) Alert.alert('Could not finish sign in', sessionError.message);
    } else {
      Alert.alert('Sign-in incomplete', error_description || 'Please make sure redirect URLs are configured in Supabase.');
    }
  }
  async function signOut() { await supabase?.auth.signOut(); setCart([]); setTab('Shop'); }

  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const adjust = (id, amount) => saveCart(cart.map(item => item.id === id ? { ...item, quantity: item.quantity + amount } : item).filter(item => item.quantity > 0));
  const header = <View style={styles.header}><View><Text style={styles.brand}>everyday<Text style={styles.brandLight}>market</Text></Text><Text style={styles.tagline}>Little finds, lovely prices</Text></View><TouchableOpacity style={styles.cartButton} onPress={() => setTab(tab === 'Cart' ? 'Shop' : 'Cart')}><Text style={styles.cartIcon}>▱</Text><Text style={styles.cartCount}>{count}</Text></TouchableOpacity></View>;

  return <SafeAreaView style={styles.safe}><StatusBar barStyle="dark-content" backgroundColor="#faf9f4" />{header}
    {!session?.user ? <View style={styles.signinBanner}><View style={{ flex: 1 }}><Text style={styles.signinTitle}>Your shop, wherever you are</Text><Text style={styles.signinCopy}>Sign in with your shop account to sync your cart across devices.</Text></View><TouchableOpacity style={styles.signinButton} onPress={signIn}><Text style={styles.signinButtonText}>Sign in</Text></TouchableOpacity></View> : <View style={styles.accountRow}><Text style={styles.accountEmail} numberOfLines={1}>Hi, {session.user.email}</Text><TouchableOpacity onPress={signOut}><Text style={styles.signout}>Sign out</Text></TouchableOpacity></View>}
    {tab === 'Shop' ? <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}><Text style={styles.kicker}>A GOOD DAY TO FIND SOMETHING</Text><Text style={styles.heroTitle}>Good things,{'\n'}<Text style={styles.italic}>right this way.</Text></Text><Text style={styles.heroCopy}>Little upgrades, everyday essentials, and lovely finds for your home and life.</Text></View>
      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>A few good finds</Text><Text style={styles.resultCount}>{visibleProducts.length} finds</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{['All finds', 'Groceries', 'Home & Kitchen', 'Electronics', 'Fashion'].map(name => <TouchableOpacity key={name} style={[styles.filter, category === name && styles.filterSelected]} onPress={() => setCategory(name)}><Text style={[styles.filterText, category === name && styles.filterTextSelected]}>{name}</Text></TouchableOpacity>)}</ScrollView>
      <View style={styles.grid}>{visibleProducts.map(product => <View key={product.id} style={styles.product}><View style={[styles.productArt, { backgroundColor: getToneColor(product.tone) }]}><Text style={styles.productEmoji}>{product.icon}</Text><Text style={styles.productLabel}>{product.label}</Text></View><Text style={styles.productCategory}>{product.category}</Text><Text style={styles.productName}>{product.name}</Text><View style={styles.productBottom}><Text style={styles.price}>{money(product.price)}</Text><TouchableOpacity style={styles.addButton} onPress={() => add(product)}><Text style={styles.addText}>+ Add</Text></TouchableOpacity></View></View>)}</View>
    </ScrollView> : <ScrollView contentContainerStyle={styles.content}><View style={styles.sectionHead}><Text style={styles.sectionTitle}>Your cart</Text><Text style={styles.resultCount}>{count} items</Text></View>{loading ? <ActivityIndicator color="#446b49" style={{ marginTop: 50 }} /> : !session?.user ? <View style={styles.empty}><Text style={styles.emptyEmoji}>🛍️</Text><Text style={styles.emptyTitle}>Sign in to see your cart</Text><Text style={styles.emptyCopy}>Your website cart will appear here after you sign in.</Text><TouchableOpacity style={styles.checkoutButton} onPress={signIn}><Text style={styles.checkoutText}>Sign in with Google</Text></TouchableOpacity></View> : cart.length === 0 ? <View style={styles.empty}><Text style={styles.emptyEmoji}>🛍️</Text><Text style={styles.emptyTitle}>Your cart is waiting</Text><Text style={styles.emptyCopy}>Add a few good finds on the website or here.</Text><TouchableOpacity style={styles.checkoutButton} onPress={() => setTab('Shop')}><Text style={styles.checkoutText}>Explore the shop</Text></TouchableOpacity></View> : <><View>{cart.map(item => <View style={styles.cartItem} key={item.id}><View style={[styles.cartArt, { backgroundColor: getToneColor(item.tone) }]}><Text style={{ fontSize: 27 }}>{item.icon}</Text></View><View style={styles.cartDetails}><Text style={styles.productName}>{item.name}</Text><Text style={styles.cartPrice}>{money(item.price)}</Text><View style={styles.quantity}><TouchableOpacity onPress={() => adjust(item.id, -1)}><Text style={styles.quantityButton}>−</Text></TouchableOpacity><Text>{item.quantity}</Text><TouchableOpacity onPress={() => adjust(item.id, 1)}><Text style={styles.quantityButton}>+</Text></TouchableOpacity></View></View></View>)}</View><View style={styles.summary}><View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subtotal</Text><Text style={styles.summaryTotal}>{money(total)}</Text></View><Text style={styles.syncHint}>{syncing ? 'Syncing your cart…' : 'Cart synced with your shop account'}</Text></View></>}</ScrollView>}
    <View style={styles.bottomNav}><TouchableOpacity onPress={() => setTab('Shop')} style={styles.navItem}><Text style={[styles.navIcon, tab === 'Shop' && styles.navActive]}>⌂</Text><Text style={[styles.navLabel, tab === 'Shop' && styles.navActive]}>Shop</Text></TouchableOpacity><TouchableOpacity onPress={() => setTab('Cart')} style={styles.navItem}><Text style={[styles.navIcon, tab === 'Cart' && styles.navActive]}>▱ {count ? `(${count})` : ''}</Text><Text style={[styles.navLabel, tab === 'Cart' && styles.navActive]}>Cart</Text></TouchableOpacity></View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#faf9f4' }, header: { paddingHorizontal: 21, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#e9e7df' }, brand: { fontSize: 21, fontWeight: '700', color: '#314b35', letterSpacing: -1 }, brandLight: { fontWeight: '400', color: '#7d846f' }, tagline: { color: '#88887d', fontSize: 10, marginTop: 2 }, cartButton: { flexDirection: 'row', alignItems: 'center', gap: 7 }, cartIcon: { fontSize: 23, color: '#344c37' }, cartCount: { backgroundColor: '#e7eee2', color: '#355d3b', minWidth: 24, textAlign: 'center', overflow: 'hidden', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 4, fontSize: 11, fontWeight: '700' }, signinBanner: { margin: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#edf2e9', borderRadius: 6 }, signinTitle: { color: '#314b35', fontWeight: '700', fontSize: 13 }, signinCopy: { color: '#626a5e', fontSize: 10, lineHeight: 15, marginTop: 4 }, signinButton: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#446b49', borderRadius: 4 }, signinButtonText: { color: 'white', fontWeight: '600', fontSize: 11 }, accountRow: { paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#e9e7df' }, accountEmail: { color: '#52624d', fontSize: 11, flex: 1 }, signout: { color: '#52624d', fontSize: 11, fontWeight: '700', marginLeft: 12 }, content: { padding: 18, paddingBottom: 35 }, hero: { backgroundColor: '#edf0e6', padding: 22, marginBottom: 23, borderRadius: 5 }, kicker: { color: '#587457', letterSpacing: 1.2, fontSize: 9, fontWeight: '700' }, heroTitle: { marginTop: 15, color: '#293a2c', fontSize: 33, lineHeight: 38, fontWeight: '500', letterSpacing: -1 }, italic: { color: '#6f8767', fontStyle: 'italic' }, heroCopy: { maxWidth: 285, color: '#696d61', lineHeight: 18, fontSize: 12, marginTop: 12 }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 }, sectionTitle: { color: '#29352a', fontSize: 21, fontWeight: '500', letterSpacing: -0.5 }, resultCount: { color: '#83847a', fontSize: 10 }, filters: { gap: 7, paddingBottom: 15 }, filter: { paddingVertical: 8, paddingHorizontal: 11, borderRadius: 18, borderWidth: 1, borderColor: '#dedfd6' }, filterSelected: { backgroundColor: '#446b49', borderColor: '#446b49' }, filterText: { fontSize: 10, color: '#62665c' }, filterTextSelected: { color: 'white' }, grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 15 }, product: { width: '48.5%', paddingBottom: 12 }, productArt: { height: 132, alignItems: 'center', justifyContent: 'center', borderRadius: 4, position: 'relative' }, productEmoji: { fontSize: 45 }, productLabel: { position: 'absolute', top: 8, left: 8, fontSize: 8, color: '#586153', backgroundColor: '#ffffffc9', paddingVertical: 4, paddingHorizontal: 6, borderRadius: 2 }, productCategory: { textTransform: 'uppercase', letterSpacing: 1, fontSize: 8, color: '#818278', marginTop: 10 }, productName: { fontSize: 12, color: '#30372e', fontWeight: '600', marginTop: 5 }, productBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }, price: { color: '#314c35', fontWeight: '700', fontSize: 12 }, addButton: { paddingVertical: 7, paddingHorizontal: 9, backgroundColor: '#446b49', borderRadius: 3 }, addText: { color: 'white', fontSize: 10, fontWeight: '600' }, bottomNav: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#e9e7df', paddingTop: 9, paddingBottom: 5, backgroundColor: '#fffefa' }, navItem: { flex: 1, alignItems: 'center', gap: 2 }, navIcon: { fontSize: 18, color: '#85877e' }, navLabel: { color: '#85877e', fontSize: 9 }, navActive: { color: '#446b49', fontWeight: '700' }, empty: { minHeight: 360, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }, emptyEmoji: { fontSize: 48 }, emptyTitle: { color: '#30372e', fontSize: 18, fontWeight: '600', marginTop: 16 }, emptyCopy: { color: '#77786e', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7, marginBottom: 18 }, checkoutButton: { width: '100%', padding: 14, borderRadius: 3, alignItems: 'center', backgroundColor: '#446b49' }, checkoutText: { color: 'white', fontSize: 12, fontWeight: '600' }, cartItem: { flexDirection: 'row', gap: 13, paddingVertical: 15, borderBottomWidth: 1, borderColor: '#e5e4dc' }, cartArt: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 3 }, cartDetails: { flex: 1, justifyContent: 'center', gap: 5 }, cartPrice: { fontSize: 11, color: '#6b6e63' }, quantity: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 2 }, quantityButton: { fontSize: 18, color: '#446b49' }, summary: { marginTop: 18, paddingTop: 15, borderTopWidth: 1, borderColor: '#e4e3db' }, summaryRow: { flexDirection: 'row', justifyContent: 'space-between' }, summaryLabel: { color: '#55594f', fontSize: 13 }, summaryTotal: { color: '#314c35', fontWeight: '700', fontSize: 15 }, syncHint: { color: '#788074', fontSize: 10, marginTop: 10 },
});
