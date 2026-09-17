function renderJson(elementId, value) {
  document.getElementById(elementId).textContent = JSON.stringify(value, null, 2);
}
