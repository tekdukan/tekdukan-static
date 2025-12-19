// app.js — UI logic, auth, rendering, posting
(function(){
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  /* Utilities */
  function fmtPrice(n){ return n ? n.toLocaleString() : "—"; }
  function el(html){ const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function uid(prefix='id'){ return prefix + '_' + Math.random().toString(36).slice(2,9); }

  /* Data helpers */
  function loadData(){ return window.BAZAAR.load(); }
  function saveData(d){ window.BAZAAR.save(d); }
  function loadUsers(){ return window.BAZAAR.loadUsers(); }
  function saveUsers(u){ window.BAZAAR.saveUsers(u); }
  function getSession(){ return window.BAZAAR.getSession(); }
  function setSession(email){ window.BAZAAR.setSession(email); }
  function clearSession(){ window.BAZAAR.clearSession(); }

  /* Header user area */
  function renderHeaderUser(){
    const area = document.getElementById('headerUserArea');
    if (!area) return;
    const s = getSession();
    if (s && s.email){
      area.innerHTML = `<div class="user-pill"><span class="small">${s.email}</span> <a class="btn small ghost" href="account.html">Account</a></div>`;
    } else {
      area.innerHTML = `<a class="btn small ghost" href="account.html">Sign in</a>`;
    }
  }

  /* Card HTML */
  function cardHTML(item, type){
    const isHome = type === 'home';
    const href = `listing.html?id=${encodeURIComponent(item.id)}&type=${isHome ? 'home':'car'}`;
    const img = item.image || 'https://placehold.co/600x400/071827/00e0c6';
    return `
      <article class="card">
        <img src="${img}" alt="${item.title}">
        <div>
          <div class="price">$${fmtPrice(item.price)}</div>
          <h3>${item.title}</h3>
          <div class="meta">${item.city} • ${isHome ? item.propertyType || '' : (item.make || '') + ' ' + (item.model || '')}</div>
        </div>
        <div class="actions">
          <a class="btn ghost" href="${href}">View</a>
          <a class="btn small" href="tel:${item.phone || ''}">Call</a>
          ${item.whatsapp ? `<a class="btn small" href="https://wa.me/${item.whatsapp.replace(/\D/g,'')}">WhatsApp</a>` : ''}
        </div>
      </article>
    `;
  }

  /* Index */
  window.initIndex = function(){
    document.getElementById('year').textContent = new Date().getFullYear();
    renderHeaderUser();
    // featured
    const data = loadData();
    const featured = [
      ...(data.homes || []).filter(x=>x.featured).slice(0,3).map(i=>cardHTML(i,'home')),
      ...(data.cars || []).filter(x=>x.featured).slice(0,3).map(i=>cardHTML(i,'car'))
    ];
    const grid = document.getElementById('featuredGrid');
    if (grid) grid.innerHTML = featured.join('') || `<p class="meta">No featured listings yet.</p>`;
    // theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) themeToggle.addEventListener('click', ()=>{
      const html = document.documentElement;
      const cur = html.getAttribute('data-theme') || 'dark';
      html.setAttribute('data-theme', cur === 'dark' ? 'light' : 'dark');
    });
  };

  /* Homes page */
  window.renderHomesPage = function(){
    renderHeaderUser();
    const grid = document.getElementById('homeGrid');
    const form = document.getElementById('homeFilters');
    if (!grid || !form) return;
    function apply(){
      const f = new FormData(form);
      const city = f.get('city') || '';
      const type = f.get('propertyType') || '';
      const maxPrice = Number(f.get('maxPrice') || 0);
      const q = (f.get('q') || '').toLowerCase();
      const data = loadData();
      const list = (data.homes || []).filter(h=>{
        if (city && h.city !== city) return false;
        if (type && h.propertyType !== type) return false;
        if (maxPrice && h.price > maxPrice) return false;
        const blob = `${h.title} ${h.description} ${h.city} ${h.propertyType}`.toLowerCase();
        if (q && !blob.includes(q)) return false;
        return true;
      });
      grid.innerHTML = list.map(i=>cardHTML(i,'home')).join('') || `<p class="meta">No homes match your filters.</p>`;
    }
    form.addEventListener('submit', e=>{ e.preventDefault(); apply(); });
    apply();
  };

  /* Cars page */
  window.renderCarsPage = function(){
    renderHeaderUser();
    const grid = document.getElementById('carGrid');
    const form = document.getElementById('carFilters');
    if (!grid || !form) return;
    function apply(){
      const f = new FormData(form);
      const city = f.get('city') || '';
      const make = (f.get('make')||'').toLowerCase();
      const model = (f.get('model')||'').toLowerCase();
      const maxPrice = Number(f.get('maxPrice') || 0);
      const q = (f.get('q') || '').toLowerCase();
      const data = loadData();
      const list = (data.cars || []).filter(c=>{
        if (city && c.city !== city) return false;
        if (make && !(c.make||'').toLowerCase().includes(make)) return false;
        if (model && !(c.model||'').toLowerCase().includes(model)) return false;
        if (maxPrice && c.price > maxPrice) return false;
        const blob = `${c.title} ${c.description} ${c.city} ${c.make} ${c.model} ${c.year}`.toLowerCase();
        if (q && !blob.includes(q)) return false;
        return true;
      });
      grid.innerHTML = list.map(i=>cardHTML(i,'car')).join('') || `<p class="meta">No cars match your filters.</p>`;
    }
    form.addEventListener('submit', e=>{ e.preventDefault(); apply(); });
    apply();
  };

  /* Add page */
  window.renderAddPage = function(){
    renderHeaderUser();
    const form = document.getElementById('addForm');
    if (!form) return;
    const homeFields = document.getElementById('homeFields');
    const carFields = document.getElementById('carFields');
    function toggle(){
      const cat = form.category.value;
      if (cat === 'home'){ homeFields.style.display = 'flex'; carFields.style.display = 'none'; }
      else { homeFields.style.display = 'none'; carFields.style.display = 'flex'; }
    }
    toggle();
    form.category.addEventListener('change', toggle);
    form.addEventListener('submit', e=>{
      e.preventDefault();
      const f = new FormData(form);
      const cat = f.get('category');
      const id = uid(cat === 'home' ? 'h' : 'c');
      const base = {
        id,
        title: f.get('title'),
        city: f.get('city'),
        price: Number(f.get('price') || 0),
        description: f.get('description'),
        image: f.get('image'),
        phone: f.get('phone'),
        whatsapp: f.get('whatsapp'),
        featured: f.get('featured') === 'true',
        ownerEmail: (getSession() && getSession().email) || 'anonymous'
      };
      const data = loadData();
      if (cat === 'home'){
        const item = Object.assign({}, base, {
          propertyType: f.get('propertyType'),
          bedrooms: Number(f.get('bedrooms')||0),
          bathrooms: Number(f.get('bathrooms')||0)
        });
        data.homes.unshift(item);
      } else {
        const item = Object.assign({}, base, {
          make: f.get('make'),
          model: f.get('model'),
          year: Number(f.get('year')||'')
        });
        data.cars.unshift(item);
      }
      saveData(data);
      document.getElementById('addSuccess').style.display = 'block';
      form.reset();
      toggle();
      setTimeout(()=>{ document.getElementById('addSuccess').style.display = 'none'; }, 2200);
    });
  };

  /* Listing page */
  window.renderListingPage = function(){
    renderHeaderUser();
    const el = document.getElementById('listingDetail');
    if (!el) return;
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const type = params.get('type');
    const data = loadData();
    const list = type === 'home' ? data.homes : data.cars;
    const item = (list || []).find(x=>x.id === id);
    if (!item){ el.innerHTML = `<p class="meta">Listing not found.</p>`; return; }
    const isHome = !!item.propertyType;
    el.innerHTML = `
      <div class="detail">
        <div class="lead">
          <img src="${item.image || 'https://placehold.co/800x600/071827/00e0c6'}" alt="${item.title}">
          <div>
            <h1>${item.title}</h1>
            <div class="price">$${fmtPrice(item.price)}</div>
            <div class="meta">${item.city} • ${isHome ? item.propertyType : (item.make || '') + ' ' + (item.model || '')}</div>
            <p class="small">${item.description || ''}</p>
            <div class="actions" style="margin-top:12px">
              <a class="btn primary" href="tel:${item.phone || ''}">Call</a>
              ${item.whatsapp ? `<a class="btn ghost" href="https://wa.me/${item.whatsapp.replace(/\D/g,'')}">WhatsApp</a>` : ''}
              <a class="btn small" href="${isHome ? 'homes.html' : 'cars.html'}">Back</a>
            </div>
            <div style="margin-top:12px" class="meta small">Owner: ${item.ownerEmail || 'unknown'}</div>
          </div>
        </div>
      </div>
    `;
  };

  /* Account page */
  window.initAccount = function(){
    document.getElementById('year2').textContent = new Date().getFullYear();
    renderHeaderUser();
    const authCard = document.getElementById('authCard');
    const profileCard = document.getElementById('profileCard');
    const authForm = document.getElementById('authForm');
    const authTitle = document.getElementById('authTitle');
    const authSubmit = document.getElementById('authSubmit');
    const switchAuth = document.getElementById('switchAuth');
    const logoutBtn = document.getElementById('logoutBtn');
    const profileInfo = document.getElementById('profileInfo');
    const myListings = document.getElementById('myListings');

    let mode = 'signin'; // or signup
    function showProfile(){
      const s = getSession();
      if (!s){ authCard.style.display = ''; profileCard.style.display = 'none'; return; }
      authCard.style.display = 'none';
      profileCard.style.display = '';
      profileInfo.innerHTML = `<p class="small">Signed in as <strong>${s.email}</strong></p>`;
      // show user's listings
      const data = loadData();
      const all = [...(data.homes||[]).filter(x=>x.ownerEmail===s.email), ...(data.cars||[]).filter(x=>x.ownerEmail===s.email)];
      myListings.innerHTML = all.length ? all.map(i=>cardHTML(i, i.propertyType ? 'home' : 'car')).join('') : `<p class="meta">You have no listings yet.</p>`;
    }

    const s = getSession();
    if (s && s.email) showProfile();

    switchAuth.addEventListener('click', ()=>{
      mode = mode === 'signin' ? 'signup' : 'signin';
      authTitle.textContent = mode === 'signin' ? 'Sign in' : 'Create account';
      authSubmit.textContent = mode === 'signin' ? 'Sign in' : 'Create';
      switchAuth.textContent = mode === 'signin' ? 'Create account' : 'Have an account? Sign in';
    });

    authForm.addEventListener('submit', e=>{
      e.preventDefault();
      const f = new FormData(authForm);
      const email = (f.get('email')||'').trim().toLowerCase();
      const password = f.get('password')||'';
      if (!email || !password) return alert('Please fill email and password');
      const users = loadUsers();
      if (mode === 'signin'){
        const u = users.find(x=>x.email === email && x.password === password);
        if (!u) return alert('Invalid credentials');
        setSession(email);
        renderHeaderUser();
        showProfile();
      } else {
        if (users.find(x=>x.email === email)) return alert('Account exists');
        users.push({ email, password, name: email.split('@')[0] });
        saveUsers(users);
        setSession(email);
        renderHeaderUser();
        showProfile();
      }
    });

    if (logoutBtn) logoutBtn.addEventListener('click', ()=>{
      clearSession();
      renderHeaderUser();
      showProfile();
      location.href = 'index.html';
    });
  };

  /* Initialize pages that might be loaded directly */
  document.addEventListener('DOMContentLoaded', ()=>{
    renderHeaderUser();
    // If index page present, initIndex called from index.html
    // If homes/cars/add/listing/account pages include their init calls, they will run
  });

  // Expose small helpers for inline calls
  window.fmtPrice = fmtPrice;
  window.cardHTML = cardHTML;
})();
