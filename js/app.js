// Theme & language toggles (RTL/labels)
(function(){
  const themeBtn = document.getElementById("themeToggle");
  const langBtn = document.getElementById("langToggle");
  if (themeBtn) themeBtn.addEventListener("click", () => {
    const html = document.documentElement;
    const current = html.getAttribute("data-theme") || "light";
    html.setAttribute("data-theme", current === "light" ? "dark" : "light");
  });

  let rtl = false;
  if (langBtn) langBtn.addEventListener("click", () => {
    rtl = !rtl;
    document.body.dir = rtl ? "rtl" : "ltr";
  });
})();

// Helpers
function fmtPrice(n){ return n ? `${n.toLocaleString()}` : ""; }
function cardHTML(item){
  const isHome = !!item.propertyType;
  const href = `listing.html?id=${encodeURIComponent(item.id)}&type=${isHome ? "home":"car"}`;
  return `
  <article class="card">
    <img src="${item.image || 'https://placehold.co/600x400'}" alt="${item.title}">
    <div class="content">
      <div class="price">$${fmtPrice(item.price)}</div>
      <h3>${item.title}</h3>
      <div class="meta">${item.city} ${isHome ? `• ${item.propertyType} • ${item.bedrooms||0} BR` : `• ${item.make||''} ${item.model||''} • ${item.year||''}`}</div>
      <div class="actions">
        <a class="btn outline" href="${href}">View</a>
        <a class="btn" href="tel:${item.phone || ''}">Call</a>
        ${item.whatsapp ? `<a class="btn accent" href="https://wa.me/${item.whatsapp.replace(/\D/g,'')}">WhatsApp</a>`:''}
      </div>
    </div>
  </article>`;
}

// Index: featured render
(function(){
  const el = document.getElementById("featuredGrid");
  if (!el || !window._DATA) return;
  const featured = [
    ...window._DATA.homes.filter(x=>x.featured),
    ...window._DATA.cars.filter(x=>x.featured)
  ];
  el.innerHTML = featured.map(cardHTML).join("");
})();

// Homes page
window.renderHomesPage = function(){
  const grid = document.getElementById("homeGrid");
  const form = document.getElementById("homeFilters");
  function apply(){
    const f = new FormData(form);
    const city = f.get("city");
    const type = f.get("propertyType");
    const maxPrice = Number(f.get("maxPrice"));
    const q = (f.get("q")||"").toLowerCase();

    const list = window._DATA.homes.filter(h=>{
      if (city && h.city !== city) return false;
      if (type && h.propertyType !== type) return false;
      if (maxPrice && h.price > maxPrice) return false;
      const blob = `${h.title} ${h.description} ${h.city} ${h.propertyType}`.toLowerCase();
      if (q && !blob.includes(q)) return false;
      return true;
    });
    grid.innerHTML = list.map(cardHTML).join("") || `<p class="meta">No homes match your filters.</p>`;
  }
  form.addEventListener("submit", e=>{ e.preventDefault(); apply(); });
  apply();
};

// Cars page
window.renderCarsPage = function(){
  const grid = document.getElementById("carGrid");
  const form = document.getElementById("carFilters");
  function apply(){
    const f = new FormData(form);
    const city = f.get("city");
    const make = (f.get("make")||"").toLowerCase();
    const model = (f.get("model")||"").toLowerCase();
    const maxPrice = Number(f.get("maxPrice"));
    const q = (f.get("q")||"").toLowerCase();

    const list = window._DATA.cars.filter(c=>{
      if (city && c.city !== city) return false;
      if (make && !(c.make||"").toLowerCase().includes(make)) return false;
      if (model && !(c.model||"").toLowerCase().includes(model)) return false;
      if (maxPrice && c.price > maxPrice) return false;
      const blob = `${c.title} ${c.description} ${c.city} ${c.make} ${c.model} ${c.year}`.toLowerCase();
      if (q && !blob.includes(q)) return false;
      return true;
    });
    grid.innerHTML = list.map(cardHTML).join("") || `<p class="meta">No cars match your filters.</p>`;
  }
  form.addEventListener("submit", e=>{ e.preventDefault(); apply(); });
  apply();
};

// Add page
window.renderAddPage = function(){
  const form = document.getElementById("addForm");
  const success = document.getElementById("addSuccess");
  const homeFields = document.getElementById("homeFields");
  const carFields = document.getElementById("carFields");

  function toggleFields(){
    const cat = form.category.value;
    if (cat === "home"){ homeFields.style.display = "flex"; carFields.style.display = "none"; }
    else { homeFields.style.display = "none"; carFields.style.display = "flex"; }
  }
  toggleFields();
  form.category.addEventListener("change", toggleFields);

  form.addEventListener("submit", e=>{
    e.preventDefault();
    const f = new FormData(form);
    const cat = f.get("category");
    const id = (cat === "home" ? "h":"c") + Date.now();
    const base = {
      id,
      title: f.get("title"),
      city: f.get("city"),
      price: Number(f.get("price")),
      description: f.get("description"),
      image: f.get("image"),
      phone: f.get("phone"),
      whatsapp: f.get("whatsapp"),
      featured: f.get("featured") === "true"
    };
    if (cat === "home"){
      const item = {
        ...base,
        propertyType: f.get("propertyType"),
        bedrooms: Number(f.get("bedrooms")||0),
        bathrooms: Number(f.get("bathrooms")||0)
      };
      window._DATA.homes.unshift(item);
    } else {
      const item = {
        ...base,
        make: f.get("make"),
        model: f.get("model"),
        year: Number(f.get("year")||"")
      };
      window._DATA.cars.unshift(item);
    }
    window._persist();
    success.style.display = "block";
    form.reset();
    toggleFields();
  });
};

// Listing page
window.renderListingPage = function(){
  const el = document.getElementById("listingDetail");
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const type = params.get("type");

  const item = (type === "home" ? window._DATA.homes : window._DATA.cars).find(x=>x.id===id);
  if (!item){ el.innerHTML = `<p class="meta">Listing not found.</p>`; return; }

  const isHome = !!item.propertyType;
  el.innerHTML = `
    <div class="lead">
      <img src="${item.image || 'https://placehold.co/600x400'}" alt="${item.title}">
      <div>
        <h1>${item.title}</h1>
        <div class="price">$${fmtPrice(item.price)}</div>
        <div class="meta">${item.city} ${isHome ? `• ${item.propertyType} • ${item.bedrooms||0} BR, ${item.bathrooms||0} bath` : `• ${item.make||''} ${item.model||''} • ${item.year||''}`}</div>
        <p>${item.description || ""}</p>
        <div class="actions">
          <a class="btn" href="tel:${item.phone || ''}">Call</a>
          ${item.whatsapp ? `<a class="btn accent" href="https://wa.me/${item.whatsapp.replace(/\D/g,'')}">WhatsApp</a>`:''}
          <a class="btn outline" href="${isHome?'homes.html':'cars.html'}">Back</a>
        </div>
      </div>
    </div>
  `;
};
