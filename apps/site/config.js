// Direcciones de la API y del aula. En producción cámbialas por las URLs reales
// (por ejemplo API: 'https://api.proteqlife.com/api', AULA: 'https://aula.proteqlife.com').
window.PQL = (function () {
  var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  return {
    API: local ? 'http://localhost:3001/api' : '/api',
    AULA: local ? 'http://localhost:5173' : '/aula'
  };
})();
