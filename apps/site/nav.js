/**
 * nav.js — Navegación compartida PROTEQLIFE v3
 * Mega menú 2 columnas idéntico al index.html
 * Incluir en todas las páginas: <script src="nav.js"></script>
 */
(function () {

  // ── HTML del nav ──────────────────────────────
  var NAV_HTML = `
<nav id="mainNav">

  <!-- Barra superior de contacto -->
  <div class="nav-top">
    <div class="container">
      <div class="nav-top-inner">
        <span>📧 analista.procesos@proteqlife.com.pe</span>
        <span>📱 +51 950 950 304</span>
        <span>🕐 Lun–Vie: 8am–6pm</span>
      </div>
    </div>
  </div>

  <!-- Barra principal -->
  <div style="background:rgba(255,255,255,.97);backdrop-filter:blur(12px);border-bottom:1px solid var(--gray-200,#E8ECF0)">
    <div class="container">
      <div class="nav-main-inner">

        <a href="index.html" class="nav-logo">
          <div class="logo-box"><span>PQ</span></div>
          <div>
            <div class="logo-name">PROTEQLIFE</div>
            <div class="logo-sub">Consulting</div>
          </div>
        </a>

        <div class="nav-links" id="navLinks">
          <a href="index.html" class="nav-link" id="navInicio">Inicio</a>

          <!-- CURSOS — Mega menú 2 columnas -->
          <div class="nav-dd" id="ddCursos">
            <span class="nav-link" id="trigCursos">
              Cursos <span class="nav-caret">▾</span>
            </span>
            <div class="nav-mega">
              <div class="mega-box">

                <!-- Columna izquierda: 3 áreas -->
                <div class="mega-areas">
                  <a href="cursos-sso.html" class="mega-area-btn activa" data-area="sso"
                       onmouseenter="navActivarArea('sso',this)">
                    <span class="mega-area-ic" style="background:#E3F2FD">🛡️</span>
                    <div class="mega-area-info">
                      <div class="mega-area-title">Seguridad Integral</div>
                      <div class="mega-area-sub">SST y prevención de riesgos</div>
                    </div>
                    <span class="mega-area-arrow">›</span>
                  </a>
                  <a href="cursos-calidad.html" class="mega-area-btn" data-area="calidad"
                       onmouseenter="navActivarArea('calidad',this)">
                    <span class="mega-area-ic" style="background:#FFF3EE">📊</span>
                    <div class="mega-area-info">
                      <div class="mega-area-title">Sist. Integrado de Gestión</div>
                      <div class="mega-area-sub">Calidad y Medio Ambiente</div>
                    </div>
                    <span class="mega-area-arrow">›</span>
                  </a>
                  <a href="cursos-liderazgo.html" class="mega-area-btn" data-area="liderazgo"
                       onmouseenter="navActivarArea('liderazgo',this)">
                    <span class="mega-area-ic" style="background:#FFFBEB">🎯</span>
                    <div class="mega-area-info">
                      <div class="mega-area-title">Desarrollo Empresarial</div>
                      <div class="mega-area-sub">& Liderazgo</div>
                    </div>
                    <span class="mega-area-arrow">›</span>
                  </a>
                </div>

                <!-- Columna derecha: cursos por área -->

                <!-- SEGURIDAD INTEGRAL -->
                <div class="mega-cursos-panel visible" id="navPanel-sso">
                  <div class="mega-cursos-header">
                    <span class="mega-cursos-header-ic" style="background:#E3F2FD">🛡️</span>
                    <span class="mega-cursos-header-title">Seguridad Integral</span>
                  </div>
                  <a href="curso-detalle.html?slug=ley-29783"         class="mega-curso-link">Ley 29783 — SST</a>
                  <a href="curso-detalle.html?slug=iperc"             class="mega-curso-link">IPERC</a>
                  <a href="curso-detalle.html?slug=gestion-accidentes" class="mega-curso-link">Gestión de Accidentes</a>
                  <a href="curso-detalle.html?slug=gestion-incidentes" class="mega-curso-link">Gestión de Incidentes</a>
                  <a href="curso-detalle.html?slug=comite-supervisor-sst" class="mega-curso-link">Comité o Supervisor SST</a>
                  <a href="curso-detalle.html?slug=ats"               class="mega-curso-link">Análisis de Trabajo Seguro (ATS)</a>
                  <a href="curso-detalle.html?slug=investigacion-accidentes" class="mega-curso-link">Investigación de Accidentes</a>
                  <a href="curso-detalle.html?slug=primeros-auxilios" class="mega-curso-link">Primeros Auxilios</a>
                  <a href="curso-detalle.html?slug=ergonomia"         class="mega-curso-link">Ergonomía Laboral</a>
                  <a href="curso-detalle.html?slug=prevencion-burnout" class="mega-curso-link">Prevención del Burnout</a>
                  <a href="curso-detalle.html?slug=manejo-defensivo"  class="mega-curso-link">Manejo Defensivo</a>
                  <a href="cursos-sso.html" class="mega-ver-todos">Ver todos los cursos de SST →</a>
                </div>

                <!-- CALIDAD -->
                <div class="mega-cursos-panel" id="navPanel-calidad">
                  <div class="mega-cursos-header">
                    <span class="mega-cursos-header-ic" style="background:#FFF3EE">📊</span>
                    <span class="mega-cursos-header-title">Sist. Integrado de Gestión</span>
                  </div>
                  <a href="curso-detalle.html?slug=tecnica-5s"        class="mega-curso-link">Técnica de las 5S</a>
                  <a href="curso-detalle.html?slug=ciclo-deming"      class="mega-curso-link">Ciclo de Deming (PHVA)</a>
                  <a href="curso-detalle.html?slug=cantidad-vs-calidad" class="mega-curso-link">Cantidad vs Calidad</a>
                  <a href="curso-detalle.html?slug=iso-9001"          class="mega-curso-link">ISO 9001:2015</a>
                  <a href="curso-detalle.html?slug=auditorias-internas" class="mega-curso-link">Auditorías Internas</a>
                  <a href="curso-detalle.html?slug=gestion-ambiental" class="mega-curso-link">Gestión Ambiental ISO 14001</a>
                  <a href="curso-detalle.html?slug=kpi-calidad"       class="mega-curso-link">Indicadores KPI de Calidad</a>
                  <a href="curso-detalle.html?slug=atencion-cliente"  class="mega-curso-link">Atención al Cliente</a>
                  <a href="curso-detalle.html?slug=trabajo-equipo"    class="mega-curso-link">Trabajo en Equipo</a>
                  <a href="cursos-calidad.html" class="mega-ver-todos">Ver todos los cursos →</a>
                </div>

                <!-- LIDERAZGO -->
                <div class="mega-cursos-panel" id="navPanel-liderazgo">
                  <div class="mega-cursos-header">
                    <span class="mega-cursos-header-ic" style="background:#FFFBEB">🎯</span>
                    <span class="mega-cursos-header-title">Desarrollo Empresarial & Liderazgo</span>
                  </div>
                  <a href="curso-detalle.html?slug=ia-fundamentos"    class="mega-curso-link">Fundamentos de IA</a>
                  <a href="curso-detalle.html?slug=chatgpt-productividad" class="mega-curso-link">ChatGPT y herramientas IA</a>
                  <a href="curso-detalle.html?slug=marketing-digital" class="mega-curso-link">Marketing Digital y Ventas</a>
                  <a href="curso-detalle.html?slug=startup-emprendimiento" class="mega-curso-link">StartUp y Emprendimiento</a>
                  <a href="curso-detalle.html?slug=talento-humano"    class="mega-curso-link">Talento Humano</a>
                  <a href="curso-detalle.html?slug=habilidades-blandas" class="mega-curso-link">Habilidades Blandas</a>
                  <a href="curso-detalle.html?slug=liderazgo-situacional" class="mega-curso-link">Liderazgo Situacional</a>
                  <a href="curso-detalle.html?slug=marco-legal"       class="mega-curso-link">Marco Legal Empresarial</a>
                  <a href="curso-detalle.html?slug=tributacion-basica" class="mega-curso-link">Tributación Básica</a>
                  <a href="cursos-liderazgo.html" class="mega-ver-todos">Ver todos los cursos →</a>
                </div>

              </div>
            </div>
          </div><!-- /ddCursos -->

          <!-- SERVICIOS -->
          <div class="nav-dd" id="ddServicios">
            <span class="nav-link" id="trigServicios">
              Servicios <span class="nav-caret">▾</span>
            </span>
            <div class="nav-drop">
              <div class="drop-box">
                <a href="servicio.html?s=homologaciones"  class="drop-item">
                  <span class="drop-ic">✅</span>
                  <div><div class="drop-name">Homologaciones</div><div class="drop-sub">Proveedores y contratistas</div></div>
                </a>
                <a href="servicio.html?s=gestion-sst"     class="drop-item">
                  <span class="drop-ic">🔄</span>
                  <div><div class="drop-name">Actualización Gestión SST</div><div class="drop-sub">Sistema al día</div></div>
                </a>
                <a href="servicio.html?s=iso9001"          class="drop-item">
                  <span class="drop-ic">🏆</span>
                  <div><div class="drop-name">Certificación ISO 9001</div><div class="drop-sub">Acompañamiento completo</div></div>
                </a>
                <a href="servicio.html?s=asesoria-sst"    class="drop-item">
                  <span class="drop-ic">📋</span>
                  <div><div class="drop-name">Asesoría de SST</div><div class="drop-sub">Consultoría especializada</div></div>
                </a>
                <a href="servicio.html?s=seguimiento-sst" class="drop-item">
                  <span class="drop-ic">🏠</span>
                  <div><div class="drop-name">Seguimiento SST In House</div><div class="drop-sub">Gestión en tu empresa</div></div>
                </a>
                <a href="servicio.html?s=auditorias"      class="drop-item">
                  <span class="drop-ic">🔍</span>
                  <div><div class="drop-name">Auditorías Internas</div><div class="drop-sub">Evaluación y mejora</div></div>
                </a>
              </div>
            </div>
          </div><!-- /ddServicios -->

          <a href="contacto.html" class="nav-link" id="navContacto">Contáctanos</a>
          <a href="aula-virtual.html"   class="nav-link nav-aula" id="navAula">🎓 Aula Virtual</a>
        </div>

        <!-- Hamburger móvil -->
        <button class="hamburger" id="navHamburger" onclick="navToggleMob()" aria-label="Menú">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </div>

  <!-- Menú móvil -->
  <div class="mob-menu" id="navMobMenu">
    <a href="index.html" class="mob-link">🏠 Inicio</a>
    <div>
      <div class="mob-section-hd" onclick="navToggleMobSec(this)">📚 Cursos <span>▾</span></div>
      <div class="mob-section-body">
        <div class="mob-sub-label">🛡️ Seguridad Integral</div>
        <a href="curso-detalle.html?slug=ley-29783"    class="mob-sub">Ley 29783 — SST</a>
        <a href="curso-detalle.html?slug=iperc"        class="mob-sub">IPERC</a>
        <a href="curso-detalle.html?slug=primeros-auxilios" class="mob-sub">Primeros Auxilios</a>
        <a href="cursos-sso.html" class="mob-sub" style="color:#1565C0;font-weight:600">Ver todos →</a>
        <div class="mob-sub-label" style="margin-top:8px">📊 Sist. Integrado de Gestión</div>
        <a href="curso-detalle.html?slug=tecnica-5s"   class="mob-sub">Técnica de las 5S</a>
        <a href="curso-detalle.html?slug=iso-9001"     class="mob-sub">ISO 9001:2015</a>
        <a href="cursos-calidad.html" class="mob-sub" style="color:#1565C0;font-weight:600">Ver todos →</a>
        <div class="mob-sub-label" style="margin-top:8px">🎯 Desarrollo Empresarial & Liderazgo</div>
        <a href="curso-detalle.html?slug=ia-fundamentos"    class="mob-sub">Fundamentos de IA</a>
        <a href="curso-detalle.html?slug=startup-emprendimiento" class="mob-sub">StartUp y Emprendimiento</a>
        <a href="cursos-liderazgo.html" class="mob-sub" style="color:#1565C0;font-weight:600">Ver todos →</a>
      </div>
    </div>
    <div>
      <div class="mob-section-hd" onclick="navToggleMobSec(this)">🔧 Servicios <span>▾</span></div>
      <div class="mob-section-body">
        <a href="servicio.html?s=homologaciones"  class="mob-sub">Homologaciones</a>
        <a href="servicio.html?s=gestion-sst"     class="mob-sub">Actualización Gestión SST</a>
        <a href="servicio.html?s=iso9001"          class="mob-sub">Certificación ISO 9001</a>
        <a href="servicio.html?s=asesoria-sst"    class="mob-sub">Asesoría de SST</a>
        <a href="servicio.html?s=seguimiento-sst" class="mob-sub">Seguimiento SST In House</a>
        <a href="servicio.html?s=auditorias"      class="mob-sub">Auditorías Internas</a>
      </div>
    </div>
    <a href="contacto.html" class="mob-link">📩 Contáctanos</a>
    <a href="aula-virtual.html"   class="mob-link mob-aula">🎓 Aula Virtual</a>
  </div>

</nav>`;

  // ── CSS del nav ───────────────────────────────
  var CSS = `
/* ── NAV BASE ── */
#mainNav {
  position: sticky; top: 0; z-index: 1000;
  background: rgba(255,255,255,.97);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--gray-200, #E8ECF0);
  box-shadow: 0 1px 3px rgba(5,25,45,.08);
}
.nav-top { background: #05192D; padding: 6px 0; }
.nav-top-inner {
  display: flex; gap: 24px; justify-content: flex-end; align-items: center;
  font-size: 11px; color: rgba(255,255,255,.6);
}
.nav-main-inner {
  display: flex; align-items: center; justify-content: space-between; height: 62px;
}
.nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
.logo-box {
  width: 38px; height: 38px; background: #05192D; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
}
.logo-box span {
  font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 800;
  color: #fff; letter-spacing: -.5px;
}
.logo-name { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 800; color: #05192D; }
.logo-sub  { font-size: 10px; color: #9BA3AD; margin-top: -2px; }

/* ── LINKS ── */
.nav-links { display: flex; gap: 2px; align-items: center; }
.nav-link {
  font-size: 13px; font-weight: 500; color: #5A6472;
  padding: 6px 11px; border-radius: 6px; transition: all .15s;
  cursor: pointer; white-space: nowrap; display: inline-flex;
  align-items: center; gap: 4px; background: none; border: none;
  font-family: inherit; text-decoration: none;
}
.nav-link:hover { background: #F5F7FA; color: #05192D; }
.nav-link.nav-active { color: #1565C0; font-weight: 600; }
.nav-caret { font-size: 9px; opacity: .5; transition: transform .2s; display: inline-block; }
.nav-aula {
  background: #1565C0; color: #fff !important; padding: 8px 18px !important;
  border-radius: 10px; font-size: 13px; font-weight: 600;
  margin-left: 6px; transition: background .15s;
}
.nav-aula:hover { background: #0C3254 !important; }

/* ── DROPDOWNS ── */
.nav-dd { position: relative; display: inline-flex; align-items: center; }
.nav-mega, .nav-drop {
  display: none; position: absolute; top: 100%; padding-top: 8px; z-index: 9999;
}
.nav-mega { left: -20px; min-width: 540px; }
.nav-drop { left: 0; min-width: 280px; }
.nav-dd.open .nav-mega,
.nav-dd.open .nav-drop { display: block; }
.nav-dd.open .nav-caret { transform: rotate(180deg); }

/* ── MEGA MENÚ 2 COLUMNAS ── */
.mega-box {
  background: #fff; border: 1px solid #E8ECF0; border-radius: 16px;
  box-shadow: 0 12px 40px rgba(5,25,45,.14);
  display: flex; flex-direction: row; overflow: hidden; min-height: 300px;
}
.mega-areas {
  display: flex; flex-direction: column;
  background: #FAFBFC; border-right: 1px solid #E8ECF0;
  min-width: 220px; padding: 8px; gap: 2px;
}
.mega-area-btn {
  display: flex; align-items: center; gap: 10px;
  padding: 12px; border-radius: 10px;
  cursor: pointer; text-decoration: none; transition: all .15s;
  border: 1.5px solid transparent;
}
.mega-area-btn:hover,
.mega-area-btn.activa {
  background: #fff; border-color: #E8ECF0;
  box-shadow: 0 1px 3px rgba(5,25,45,.08);
}
.mega-area-btn.activa .mega-area-arrow { opacity: 1; }
.mega-area-ic {
  width: 36px; height: 36px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 17px; flex-shrink: 0;
}
.mega-area-info { flex: 1; min-width: 0; }
.mega-area-title { font-size: 13px; font-weight: 700; color: #05192D; line-height: 1.25; }
.mega-area-sub   { font-size: 11px; color: #9BA3AD; margin-top: 2px; }
.mega-area-arrow { font-size: 11px; color: #9BA3AD; opacity: 0; transition: opacity .15s; }

.mega-cursos-panel {
  flex: 1; padding: 16px; display: none; flex-direction: column; gap: 0; min-width: 280px;
}
.mega-cursos-panel.visible { display: flex; }
.mega-cursos-header {
  display: flex; align-items: center; gap: 8px;
  padding-bottom: 12px; margin-bottom: 6px;
  border-bottom: 1px solid #E8ECF0;
}
.mega-cursos-header-ic {
  width: 28px; height: 28px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center; font-size: 14px;
}
.mega-cursos-header-title { font-size: 12px; font-weight: 700; color: #05192D; }
.mega-curso-link {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: #5A6472;
  padding: 7px 8px; border-radius: 6px;
  text-decoration: none; transition: all .15s;
}
.mega-curso-link::before {
  content: ''; width: 5px; height: 5px;
  border-radius: 50%; background: #D1D9E0;
  flex-shrink: 0; transition: background .15s;
}
.mega-curso-link:hover { background: #F5F7FA; color: #05192D; }
.mega-curso-link:hover::before { background: #1565C0; }
.mega-ver-todos {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 700; color: #1565C0;
  padding: 10px 8px; border-radius: 6px;
  text-decoration: none; margin-top: 8px;
  border-top: 1px solid #E8ECF0;
  transition: all .15s;
}
.mega-ver-todos:hover { background: #E3F2FD; }

/* ── DROPDOWN SERVICIOS ── */
.drop-box {
  background: #fff; border: 1px solid #E8ECF0; border-radius: 16px;
  box-shadow: 0 12px 40px rgba(5,25,45,.14); padding: 8px;
}
.drop-item {
  display: flex; align-items: center; gap: 12px; padding: 9px 10px;
  border-radius: 8px; transition: all .15s; text-decoration: none; cursor: pointer;
}
.drop-item:hover { background: #F5F7FA; }
.drop-ic {
  width: 32px; height: 32px; border-radius: 8px; background: #E3F2FD;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; flex-shrink: 0;
}
.drop-name { font-size: 13px; font-weight: 500; color: #05192D; }
.drop-sub  { font-size: 11px; color: #9BA3AD; }

/* ── HAMBURGER ── */
.hamburger {
  display: none; flex-direction: column; gap: 5px;
  cursor: pointer; padding: 6px; border: none; background: none; border-radius: 6px;
}
.hamburger span {
  display: block; width: 22px; height: 2px;
  background: #05192D; border-radius: 2px; transition: all .3s;
}
.hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.hamburger.open span:nth-child(2) { opacity: 0; }
.hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

/* ── MENÚ MÓVIL ── */
.mob-menu { display: none; flex-direction: column; background: #fff; border-top: 1px solid #E8ECF0; }
.mob-menu.open { display: flex; }
.mob-link {
  font-size: 14px; font-weight: 500; color: #5A6472;
  padding: 13px 24px; border-bottom: 1px solid #F5F7FA; display: block; text-decoration: none;
}
.mob-link:hover { background: #F5F7FA; }
.mob-aula { color: #1565C0 !important; font-weight: 700; }
.mob-section-hd {
  font-size: 14px; font-weight: 600; color: #05192D;
  padding: 13px 24px; border-bottom: 1px solid #F5F7FA;
  display: flex; justify-content: space-between; cursor: pointer;
}
.mob-section-hd:hover { background: #F5F7FA; }
.mob-section-body { display: none; padding: 8px 24px 12px; background: #F5F7FA; }
.mob-section-body.open { display: block; }
.mob-sub-label {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .5px; color: #9BA3AD; padding: 8px 0 4px;
}
.mob-sub {
  display: block; font-size: 13px; color: #5A6472;
  padding: 6px 0; border-bottom: 1px solid #E8ECF0; text-decoration: none;
}
.mob-sub:hover { color: #1565C0; }

@media (max-width: 900px) {
  .nav-top { display: none; }
  .nav-links { display: none !important; }
  .hamburger { display: flex; }
}`;

  // ── Insertar CSS ──────────────────────────────
  var styleEl = document.createElement('style');
  styleEl.id  = 'navMainCSS';
  styleEl.textContent = CSS;
  // ── Insertar CSS (solo si no existe ya) ──────
  if (!document.getElementById('navMainCSS')) {
    document.head.insertBefore(styleEl, document.head.firstChild);
  }

  // ── Insertar HTML (solo si no existe ya) ─────
  if (!document.getElementById('mainNav')) {
    document.body.insertAdjacentHTML('afterbegin', NAV_HTML);
  }

  // ── Marcar página activa ──────────────────────
  var page = window.location.pathname.split('/').pop() || 'index.html';
  var activeMap = {
    'index.html':           'navInicio',
    'cursos-sso.html':      null, // "Cursos" no tiene ID directo, se resalta el dropdown
    'cursos-calidad.html':  null,
    'cursos-liderazgo.html':null,
    'aula-virtual.html':    'navAula',
    'servicio.html':        null,
    'curso-detalle.html':   null
  };
  var activeId = activeMap[page];
  if (activeId) {
    var el = document.getElementById(activeId);
    if (el) el.classList.add('nav-active');
  }
  // Resaltar "Cursos" cuando se está en una página de catálogo o detalle
  if (['cursos-sso.html','cursos-calidad.html','cursos-liderazgo.html','curso-detalle.html'].includes(page)) {
    var trig = document.getElementById('trigCursos');
    if (trig) trig.classList.add('nav-active');
  }
  // Resaltar "Servicios" en servicio.html
  if (page === 'servicio.html') {
    var trigS = document.getElementById('trigServicios');
    if (trigS) trigS.classList.add('nav-active');
  }

  // ── Dropdown hover con delay ──────────────────
  var _ddTimers = {};

  function _ddOpen(id) {
    clearTimeout(_ddTimers[id]);
    ['ddCursos','ddServicios'].forEach(function(d) {
      if (d !== id) { var e = document.getElementById(d); if (e) e.classList.remove('open'); }
    });
    var el = document.getElementById(id);
    if (el) el.classList.add('open');
  }
  function _ddClose(id) {
    _ddTimers[id] = setTimeout(function() {
      var el = document.getElementById(id);
      if (el) el.classList.remove('open');
    }, 180);
  }
  function _ddCancel(id) { clearTimeout(_ddTimers[id]); }

  // Inicializar dropdowns — funciona tanto si el DOM ya cargó como si no
  function _navInitDropdowns() {
    ['ddCursos','ddServicios'].forEach(function(id) {
      var wrap    = document.getElementById(id);
      if (!wrap) return;
      var trigger = wrap.querySelector('.nav-link');
      var panel   = wrap.querySelector('.nav-mega, .nav-drop');

      trigger && trigger.addEventListener('mouseenter', function() { _ddOpen(id); });
      trigger && trigger.addEventListener('mouseleave', function() { _ddClose(id); });
      trigger && trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        wrap.classList.toggle('open');
      });
      panel && panel.addEventListener('mouseenter', function() { _ddCancel(id); });
      panel && panel.addEventListener('mouseleave', function() { _ddClose(id); });
    });

    document.addEventListener('click', function(e) {
      if (!e.target.closest('#ddCursos'))   { var a = document.getElementById('ddCursos');   if (a) a.classList.remove('open'); }
      if (!e.target.closest('#ddServicios')){ var b = document.getElementById('ddServicios'); if (b) b.classList.remove('open'); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _navInitDropdowns);
  } else {
    _navInitDropdowns();
  }

  // Ajustar top de .filtros-bar según altura real del nav (desktop vs móvil)
  function _ajustarFiltrosBar() {
    var nav = document.getElementById('mainNav');
    var bar = document.querySelector('.filtros-bar');
    if (nav && bar) {
      bar.style.top = nav.offsetHeight + 'px';
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _ajustarFiltrosBar);
  } else {
    _ajustarFiltrosBar();
  }
  window.addEventListener('resize', _ajustarFiltrosBar);

})(); // fin IIFE

// ── FUNCIONES GLOBALES ────────────────────────
function navActivarArea(area, btn) {
  document.querySelectorAll('.mega-area-btn').forEach(function(b) { b.classList.remove('activa'); });
  document.querySelectorAll('.mega-cursos-panel').forEach(function(p) { p.classList.remove('visible'); });
  btn.classList.add('activa');
  var panel = document.getElementById('navPanel-' + area);
  if (panel) panel.classList.add('visible');
}

function navToggleMob() {
  var menu = document.getElementById('navMobMenu');
  var btn  = document.getElementById('navHamburger');
  if (menu) menu.classList.toggle('open');
  if (btn)  btn.classList.toggle('open');
}

function navToggleMobSec(el) {
  var body  = el.nextElementSibling;
  var caret = el.querySelector('span');
  if (body)  body.classList.toggle('open');
  if (caret) caret.textContent = body.classList.contains('open') ? '▴' : '▾';
}
