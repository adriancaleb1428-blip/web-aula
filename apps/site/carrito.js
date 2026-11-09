/**
 * carrito.js — PROTEQLIFE v8
 * Carrito compartido para páginas de catálogo.
 * Usa la misma clave pq_cart que curso-detalle.html
 * Inyecta: botón flotante + panel lateral + modal de pago
 */

// ── SHARED CART STATE ─────────────────────────────────
function _getCart()       { return JSON.parse(localStorage.getItem('pq_cart') || '[]'); }
function _setCart(cart)   { localStorage.setItem('pq_cart', JSON.stringify(cart)); }
function _cartTotal(cart) { return cart.reduce(function(s,c){ return s + (c.precioNum||0); }, 0); }

// ── BADGE UPDATE ──────────────────────────────────────
function _syncBadge() {
  var n = _getCart().length;
  var fb = document.getElementById('cartFloat');
  var fc = document.getElementById('cartFloatCount');
  if (fb) fb.style.display = n > 0 ? 'flex' : 'none';
  if (fc) fc.textContent = n;
}

// ── RENDER PANEL ──────────────────────────────────────
function renderCarritoPanel() {
  var cart   = _getCart();
  var total  = _cartTotal(cart);
  var totEl  = document.getElementById('cpTotal');
  var itemEl = document.getElementById('cpItems');
  if (totEl) totEl.textContent = 'S/ ' + total;
  if (!itemEl) return;

  if (!cart.length) {
    itemEl.innerHTML = '<div class="cp-empty"><div style="font-size:38px;margin-bottom:10px">🛒</div><p>Tu carrito está vacío.</p></div>';
    return;
  }
  itemEl.innerHTML = cart.map(function(item, idx) {
    var nombre = (item.nombre || '').substring(0, 48) + ((item.nombre||'').length > 48 ? '...' : '');
    return '<div class="cp-item">' +
      '<span class="cp-emoji">' + (item.emoji || '📚') + '</span>' +
      '<div style="flex:1;min-width:0">' +
        '<div class="cp-name">' + nombre + '</div>' +
        '<div class="cp-price">' + (item.precio || '') + '</div>' +
      '</div>' +
      '<button class="cp-remove" onclick="quitarDelCarrito(' + idx + ')">🗑</button>' +
    '</div>';
  }).join('');
}

// ── OPEN / CLOSE PANEL ────────────────────────────────
function toggleCarrito() {
  var panel = document.getElementById('cartPanel');
  if (!panel) return;
  renderCarritoPanel();
  panel.classList.toggle('open');
}
function abrirCarrito() {
  var panel = document.getElementById('cartPanel');
  if (!panel) return;
  renderCarritoPanel();
  panel.classList.add('open');
}
function cerrarCarrito() {
  var panel = document.getElementById('cartPanel');
  if (panel) panel.classList.remove('open');
}

// ── ADD / REMOVE ──────────────────────────────────────
function agregarCursoAlCarrito(slug, nombre, precio, precioNum, emoji) {
  var cart = _getCart();
  if (!cart.find(function(c){ return c.slug === slug; })) {
    cart.push({ slug:slug, nombre:nombre, precio:precio, precioNum:precioNum||0, emoji:emoji||'📚' });
    _setCart(cart);
  }
  _syncBadge();
  mostrarNotif('✅ "' + nombre.substring(0,35) + (nombre.length>35?'...':'"') + ' agregado al carrito');
  setTimeout(abrirCarrito, 400);
}

function quitarDelCarrito(idx) {
  var cart = _getCart();
  cart.splice(idx, 1);
  _setCart(cart);
  _syncBadge();
  renderCarritoPanel();
}

// ── PAGO ──────────────────────────────────────────────
function abrirPago() {
  if (!_getCart().length) return;
  location.href = 'checkout.html';
  return;
  cerrarCarrito();
  var cart  = _getCart();
  var total = _cartTotal(cart);
  var res   = '<div class="pr-title">Resumen del pedido</div>';
  cart.forEach(function(c){
    res += '<div class="pr-item"><span>' + (c.nombre||'').substring(0,42) + '</span><span>' + (c.precio||'') + '</span></div>';
  });
  res += '<div class="pr-total"><span>Total</span><span>S/ ' + total + '</span></div>';
  var re = document.getElementById('pagoResumen');
  if (re) re.innerHTML = res;
  var mo = document.getElementById('pagoModal');
  if (mo) mo.classList.add('open');
}
function cerrarPago() {
  var mo = document.getElementById('pagoModal');
  if (mo) mo.classList.remove('open');
}
function fmtCard(el) {
  var v = el.value.replace(/\D/g,'').substring(0,16);
  el.value = v.replace(/(.{4})/g,'$1 ').trim();
}
function fmtExpiry(el) {
  var v = el.value.replace(/\D/g,'');
  if (v.length >= 2) v = v.substring(0,2) + '/' + v.substring(2,4);
  el.value = v;
}
function procesarPago() {
  alert('El pago en línea aún no está habilitado. No ingreses datos de tarjeta. Puedes coordinar tu inscripción por WhatsApp.');
}
function pagarWhatsApp() {
  var cart  = _getCart();
  var lista = cart.map(function(c){ return '• '+(c.nombre||'')+' ('+(c.precio||'')+')'; }).join('\n');
  var total = _cartTotal(cart);
  var message = 'Hola PROTEQLIFE, quiero consultar mi inscripción en:\n\n' + lista + '\n\nTotal referencial: S/ ' + total;
  window.open('https://wa.me/51950950304?text=' + encodeURIComponent(message), '_blank', 'noopener');
  cerrarCarrito();
}

// ── TOAST ─────────────────────────────────────────────
function mostrarNotif(msg) {
  var el = document.getElementById('cartNotif');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'flex';
  setTimeout(function(){ el.style.display='none'; }, 2600);
}

// ── INJECT HTML ───────────────────────────────────────
function _inyectarCarrito() {
  // Inject CSS
  var style = document.createElement('style');
  style.textContent = [
    '.cart-notif{position:fixed;top:80px;right:24px;background:#1B5E20;color:#fff;padding:12px 18px;border-radius:10px;font-size:13px;font-weight:600;box-shadow:0 8px 24px rgba(5,25,45,.14);z-index:9999;display:none;align-items:center;gap:8px}',
    '.cart-float{position:fixed;bottom:24px;right:24px;background:#1565C0;color:#fff;border:none;border-radius:50px;padding:12px 20px;font-family:Syne,sans-serif;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 8px 24px rgba(5,25,45,.25);display:none;align-items:center;gap:8px;z-index:500}',
    '.cart-float:hover{background:#05192D}',
    '.cart-float-count{background:#fff;color:#1565C0;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800}',
    '.cart-panel{display:none;position:fixed;top:0;right:0;bottom:0;width:380px;max-width:100vw;background:#fff;box-shadow:-8px 0 40px rgba(5,25,45,.15);z-index:9000;flex-direction:column}',
    '.cart-panel.open{display:flex}',
    '.cp-header{padding:18px 22px;border-bottom:1px solid #E8ECF0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}',
    '.cp-title{font-family:Syne,sans-serif;font-size:18px;font-weight:800;color:#05192D}',
    '.cp-close{background:none;border:none;font-size:20px;cursor:pointer;color:#9BA3AD;line-height:1}',
    '.cp-items{flex:1;overflow-y:auto;padding:14px 22px}',
    '.cp-item{background:#F5F7FA;border-radius:10px;padding:12px;display:flex;gap:10px;align-items:flex-start;margin-bottom:8px}',
    '.cp-emoji{font-size:22px;flex-shrink:0}',
    '.cp-name{font-size:13px;font-weight:600;color:#05192D;margin-bottom:3px;line-height:1.35}',
    '.cp-price{font-size:13px;font-weight:700;color:#1565C0}',
    '.cp-remove{margin-left:auto;background:none;border:none;font-size:15px;cursor:pointer;color:#9BA3AD;flex-shrink:0}',
    '.cp-remove:hover{color:#E24B4A}',
    '.cp-empty{text-align:center;padding:40px 20px;color:#9BA3AD}',
    '.cp-footer{padding:18px 22px;border-top:1px solid #E8ECF0;flex-shrink:0}',
    '.cp-total-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}',
    '.cp-total-lbl{font-size:14px;color:#5A6472}',
    '.cp-total-val{font-family:Syne,sans-serif;font-size:22px;font-weight:800;color:#05192D}',
    '.cp-btn-pay{width:100%;padding:13px;background:#1565C0;color:#fff;border:none;border-radius:10px;font-family:Syne,sans-serif;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:8px}',
    '.cp-btn-pay:hover{background:#05192D}',
    '.cp-btn-wa{width:100%;padding:12px;background:#25D366;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer}',
    '.cp-btn-wa:hover{background:#1da851}',
    '.pago-overlay{display:none;position:fixed;inset:0;background:rgba(5,25,45,.65);z-index:10000;align-items:center;justify-content:center;padding:20px}',
    '.pago-overlay.open{display:flex}',
    '.pago-box{background:#fff;border-radius:16px;max-width:440px;width:100%;padding:28px;position:relative;max-height:90vh;overflow-y:auto}',
    '.pago-close{position:absolute;top:12px;right:16px;background:none;border:none;font-size:20px;cursor:pointer;color:#9BA3AD}',
    '.pago-title{font-family:Syne,sans-serif;font-size:20px;font-weight:800;color:#05192D;margin-bottom:4px}',
    '.pago-sub{font-size:13px;color:#5A6472;margin-bottom:18px}',
    '.pago-resumen{background:#F5F7FA;border-radius:10px;padding:14px;margin-bottom:18px}',
    '.pr-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#9BA3AD;margin-bottom:8px}',
    '.pr-item{display:flex;justify-content:space-between;font-size:13px;padding:3px 0;color:#5A6472}',
    '.pr-total{display:flex;justify-content:space-between;font-size:15px;font-weight:700;color:#05192D;border-top:1px solid #E8ECF0;margin-top:8px;padding-top:8px}',
    '.pf-group{margin-bottom:12px}',
    '.pf-label{display:block;font-size:12px;font-weight:600;color:#5A6472;margin-bottom:5px}',
    '.pf-input{width:100%;padding:10px 12px;border:1px solid #E8ECF0;border-radius:6px;font-size:13px;color:#2C3540;outline:none;box-sizing:border-box}',
    '.pf-input:focus{border-color:#2196F3}',
    '.pf-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
    '.pago-secure{display:flex;align-items:center;gap:6px;font-size:11px;color:#9BA3AD;margin-bottom:14px}',
    '.pago-submit{width:100%;padding:13px;background:#1565C0;color:#fff;border:none;border-radius:10px;font-family:Syne,sans-serif;font-size:15px;font-weight:700;cursor:pointer}',
    '.pago-submit:disabled{background:#9BA3AD;cursor:not-allowed}',
    '@media(max-width:600px){.cart-panel{width:100%}}'
  ].join('');
  document.head.appendChild(style);

  // Inject HTML
  var wrap = document.createElement('div');
  wrap.innerHTML =
    // Toast
    '<div class="cart-notif" id="cartNotif"></div>' +
    // Float button
    '<button class="cart-float" id="cartFloat" onclick="toggleCarrito()">' +
      '🛒 Ver carrito <span class="cart-float-count" id="cartFloatCount">0</span>' +
    '</button>' +
    // Panel
    '<div class="cart-panel" id="cartPanel">' +
      '<div class="cp-header">' +
        '<div class="cp-title">🛒 Mi carrito</div>' +
        '<button class="cp-close" onclick="cerrarCarrito()">✕</button>' +
      '</div>' +
      '<div class="cp-items" id="cpItems"></div>' +
      '<div class="cp-footer">' +
        '<div class="cp-total-row">' +
          '<span class="cp-total-lbl">Total:</span>' +
          '<span class="cp-total-val" id="cpTotal">S/ 0</span>' +
        '</div>' +
        '<button class="cp-btn-pay" onclick="abrirPago()">Finalizar inscripción</button>' +
        '<button class="cp-btn-wa" onclick="pagarWhatsApp()">📱 Coordinar por WhatsApp</button>' +
      '</div>' +
    '</div>' +
    // Pago modal
    '<div class="pago-overlay" id="pagoModal">' +
      '<div class="pago-box">' +
        '<button class="pago-close" onclick="cerrarPago()">✕</button>' +
        '<div class="pago-title">Consulta tu inscripción</div>' +
        '<div class="pago-sub">El pago en línea con Culqi todavía se está configurando.</div>' +
        '<div class="pago-resumen" id="pagoResumen"></div>' +
        '<p role="status">No ingreses datos de tarjeta aquí. La inscripción solo se confirmará después de verificar el pago.</p>' +
        '<button class="pago-submit" type="button" onclick="pagarWhatsApp()">Consultar por WhatsApp →</button>' +
        '<a href="contacto.html">Ver otros medios de contacto</a>' +
      '</div>' +
    '</div>';
  document.body.appendChild(wrap);

  // Close panel on outside click
  document.addEventListener('click', function(e) {
    var panel = document.getElementById('cartPanel');
    if (panel && panel.classList.contains('open') &&
        !panel.contains(e.target) &&
        !e.target.closest('#cartFloat') &&
        !e.target.closest('.cart-float')) {
      panel.classList.remove('open');
    }
    if (e.target === document.getElementById('pagoModal')) cerrarPago();
  });

  _syncBadge();
}

// ── INIT ─────────────────────────────────────────────
(function(){
  function run() { _inyectarCarrito(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
