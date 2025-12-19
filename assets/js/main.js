async function loadPartial(id, file) {
  const res = await fetch(file);
  document.getElementById(id).innerHTML = await res.text();
}

loadPartial("header", "/partials/header.html");
loadPartial("footer", "/partials/footer.html");
