// data.js — seed data and persistence
(function(){
  const STORAGE_KEY = "bazaar_v2_data_v1";
  const USERS_KEY = "bazaar_v2_users_v1";
  const SESSION_KEY = "bazaar_v2_session_v1";

  const sampleHomes = [
    {
      id: "h_seed_1",
      title: "Sunny 3BR Apartment — Karte 3",
      city: "Kabul",
      propertyType: "Apartment",
      bedrooms: 3, bathrooms: 2,
      price: 52000,
      description: "Renovated kitchen, balcony, near market.",
      image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1200&auto=format&fit=crop",
      phone: "+93700000001",
      whatsapp: "+93700000001",
      featured: true,
      ownerEmail: "seed@local"
    }
  ];

  const sampleCars = [
    {
      id: "c_seed_1",
      title: "Toyota Corolla 2014 — Good condition",
      city: "Kabul",
      make: "Toyota", model: "Corolla", year: 2014,
      price: 9800,
      description: "Well maintained, single owner.",
      image: "https://images.unsplash.com/photo-1542362567-b07e54358753?q=80&w=1200&auto=format&fit=crop",
      phone: "+93700000002",
      whatsapp: "+93700000002",
      featured: true,
      ownerEmail: "seed@local"
    }
  ];

  function load(){
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    // first time: seed with one random home and car
    const data = { homes: sampleHomes.slice(), cars: sampleCars.slice() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // create a demo user
    const demoUsers = [{ email: "demo@bazaar.af", password: "demo123", name: "Demo User" }];
    localStorage.setItem(USERS_KEY, JSON.stringify(demoUsers));
    return data;
  }

  function save(data){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function loadUsers(){
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  }
  function saveUsers(users){
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function setSession(email){
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email, ts: Date.now() }));
  }
  function clearSession(){ localStorage.removeItem(SESSION_KEY); }
  function getSession(){ return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }

  window.BAZAAR = {
    STORAGE_KEY, USERS_KEY, SESSION_KEY,
    load, save, loadUsers, saveUsers, setSession, clearSession, getSession
  };

})();
