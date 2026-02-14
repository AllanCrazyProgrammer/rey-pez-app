<template>
  <div class="predator-nav-wrapper">
    <div class="safe-area-top"></div>
    
    <!-- Scanlines overlay -->
    <div class="predator-scanlines"></div>

    <nav class="navbar-predator" role="navigation" aria-label="Navegación principal">
      <!-- Thermal vision grid effect -->
      <div class="thermal-grid"></div>
      
      <!-- HUD Corner brackets -->
      <div class="hud-corner hud-tl"></div>
      <div class="hud-corner hud-tr"></div>
      <div class="hud-corner hud-bl"></div>
      <div class="hud-corner hud-br"></div>
      
      <!-- Brand Section -->
      <div class="navbar-brand-section">
        <router-link to="/" class="brand-link" aria-label="Ir al inicio - Rey Pez">
          <div class="targeting-reticle">
            <span class="reticle-ring"></span>
            <span class="reticle-dot"></span>
          </div>
          <div class="brand-info">
            <span class="alien-symbols">◬◭◮◯</span>
            <h1 class="brand-title">REY_PEZ</h1>
            <span class="system-status">▸ SISTEMA ACTIVO</span>
          </div>
        </router-link>
      </div>

      <!-- Mobile Menu Toggle -->
      <button 
        class="mobile-toggle"
        @click="toggleMobileMenu"
        :aria-expanded="mobileMenuOpen"
        aria-controls="mobile-navigation"
        aria-label="Abrir menú de navegación"
      >
        <span class="toggle-bracket">[</span>
        <span class="hamburger-lines" :class="{ 'active': mobileMenuOpen }">
          <span class="h-line"></span>
          <span class="h-line"></span>
          <span class="h-line"></span>
        </span>
        <span class="toggle-bracket">]</span>
      </button>

      <!-- Navigation Menu -->
      <div 
        class="nav-menu" 
        :class="{ 'mobile-open': mobileMenuOpen }"
        id="mobile-navigation"
      >
        <div class="desktop-nav-items">
          <router-link 
            to="/" 
            class="nav-link" 
            @click="closeMobileMenu"
            aria-label="Ir a la página de inicio"
          >
            <span class="link-bracket">⟨</span>
            <span class="link-index">01</span>
            <span class="nav-text">HOME</span>
            <span class="link-bracket">⟩</span>
            <span class="thermal-indicator"></span>
          </router-link>

          <router-link 
            to="/procesos/pedidos" 
            class="nav-link nav-link-priority"
            @click="closeMobileMenu"
            aria-label="Acceso rapido a pedidos"
          >
            <span class="link-bracket">⟨</span>
            <span class="link-index">02</span>
            <span class="nav-text">PEDIDOS</span>
            <span class="link-bracket">⟩</span>
            <span class="thermal-indicator"></span>
          </router-link>

          <router-link 
            to="/cuentas-mexico" 
            class="nav-link"
            @click="closeMobileMenu"
            aria-label="Ver cuentas de México"
          >
            <span class="link-bracket">⟨</span>
            <span class="link-index">03</span>
            <span class="nav-text">CUENTAS</span>
            <span class="link-bracket">⟩</span>
            <span class="thermal-indicator"></span>
          </router-link>

          <router-link 
            to="/sacadas" 
            class="nav-link"
            @click="closeMobileMenu"
            aria-label="Ver entradas y salidas"
          >
            <span class="link-bracket">⟨</span>
            <span class="link-index">04</span>
            <span class="nav-text">E/S</span>
            <span class="link-bracket">⟩</span>
            <span class="thermal-indicator"></span>
          </router-link>

          <details class="desktop-more-menu desktop-exist-menu">
            <summary class="nav-link nav-link-more" aria-label="Ver existencias">
              <span class="link-bracket">⟨</span>
              <span class="link-index">05</span>
              <span class="nav-text">EXIST</span>
              <span class="link-bracket">⟩</span>
            </summary>
            <div class="desktop-more-panel">
              <router-link 
                to="/existencias" 
                class="nav-link"
                @click="closeMobileMenu"
                aria-label="Ver existencias de limpios"
              >
                <span class="link-bracket">⟨</span>
                <span class="nav-text">LIMPIOS</span>
                <span class="link-bracket">⟩</span>
                <span class="thermal-indicator"></span>
              </router-link>
              <router-link 
                to="/existencias-crudos" 
                class="nav-link"
                @click="closeMobileMenu"
                aria-label="Ver existencias de crudos"
              >
                <span class="link-bracket">⟨</span>
                <span class="nav-text">CRUDOS</span>
                <span class="link-bracket">⟩</span>
                <span class="thermal-indicator"></span>
              </router-link>
            </div>
          </details>

          <router-link 
            to="/embarques-menu" 
            class="nav-link"
            @click="closeMobileMenu"
            aria-label="Gestionar embarques"
          >
            <span class="link-bracket">⟨</span>
            <span class="link-index">06</span>
            <span class="nav-text">EMBARQUES</span>
            <span class="link-bracket">⟩</span>
            <span class="thermal-indicator"></span>
          </router-link>

          <router-link 
            to="/procesos" 
            class="nav-link"
            @click="closeMobileMenu"
            aria-label="Ver procesos"
          >
            <span class="link-bracket">⟨</span>
            <span class="link-index">07</span>
            <span class="nav-text">PROCESOS</span>
            <span class="link-bracket">⟩</span>
            <span class="thermal-indicator"></span>
          </router-link>

        </div>

        <div class="mobile-nav-items">
          <router-link 
            to="/" 
            class="nav-link" 
            @click="closeMobileMenu"
            aria-label="Ir a la página de inicio"
          >
            <span class="link-bracket">⟨</span>
            <span class="link-index">01</span>
            <span class="nav-text">HOME</span>
            <span class="link-bracket">⟩</span>
            <span class="thermal-indicator"></span>
          </router-link>
          
          <router-link 
            to="/procesos/pedidos" 
            class="nav-link nav-link-priority"
            @click="closeMobileMenu"
            aria-label="Acceso rapido a pedidos"
          >
            <span class="link-bracket">⟨</span>
            <span class="link-index">02</span>
            <span class="nav-text">PEDIDOS</span>
            <span class="link-bracket">⟩</span>
            <span class="thermal-indicator"></span>
          </router-link>
          
          <router-link 
            to="/sacadas" 
            class="nav-link"
            @click="closeMobileMenu"
            aria-label="Ver entradas y salidas"
          >
            <span class="link-bracket">⟨</span>
            <span class="link-index">03</span>
            <span class="nav-text">E/S</span>
            <span class="link-bracket">⟩</span>
            <span class="thermal-indicator"></span>
          </router-link>
          
          <router-link 
            to="/existencias" 
            class="nav-link"
            @click="closeMobileMenu"
            aria-label="Ver existencias"
          >
            <span class="link-bracket">⟨</span>
            <span class="link-index">04</span>
            <span class="nav-text">EXIST</span>
            <span class="link-bracket">⟩</span>
            <span class="thermal-indicator"></span>
          </router-link>
          
          <router-link 
            to="/existencias-crudos" 
            class="nav-link"
            @click="closeMobileMenu"
            aria-label="Ver existencias de productos crudos"
          >
            <span class="link-bracket">⟨</span>
            <span class="link-index">05</span>
            <span class="nav-text">CRUDOS</span>
            <span class="link-bracket">⟩</span>
            <span class="thermal-indicator"></span>
          </router-link>
          
          <router-link 
            to="/cuentas-mexico" 
            class="nav-link"
            @click="closeMobileMenu"
            aria-label="Ver cuentas de México"
          >
            <span class="link-bracket">⟨</span>
            <span class="link-index">06</span>
            <span class="nav-text">CUENTAS</span>
            <span class="link-bracket">⟩</span>
            <span class="thermal-indicator"></span>
          </router-link>
          
          <router-link 
            to="/embarques-menu" 
            class="nav-link"
            @click="closeMobileMenu"
            aria-label="Gestionar embarques"
          >
            <span class="link-bracket">⟨</span>
            <span class="link-index">07</span>
            <span class="nav-text">EMBARQUES</span>
            <span class="link-bracket">⟩</span>
            <span class="thermal-indicator"></span>
          </router-link>
          
          <router-link 
            to="/procesos" 
            class="nav-link"
            @click="closeMobileMenu"
            aria-label="Ver procesos"
          >
            <span class="link-bracket">⟨</span>
            <span class="link-index">08</span>
            <span class="nav-text">PROCESOS</span>
            <span class="link-bracket">⟩</span>
            <span class="thermal-indicator"></span>
          </router-link>
        </div>
        
        <!-- HUD Data display in mobile -->
        <div class="hud-data-mobile">
          <span class="hud-coord">LAT: 24.0277°N</span>
          <span class="hud-coord">LON: 110.3128°W</span>
        </div>
      </div>

      <!-- Mobile Menu Overlay -->
      <div 
        v-if="mobileMenuOpen" 
        class="mobile-overlay"
        @click="closeMobileMenu"
        aria-hidden="true"
      ></div>
    </nav>
  </div>
</template>

<script>
export default {
  name: "Navbar",
  data() {
    return {
      mobileMenuOpen: false
    };
  },
  methods: {
    toggleMobileMenu() {
      this.mobileMenuOpen = !this.mobileMenuOpen;
      // Prevent body scroll when menu is open
      if (this.mobileMenuOpen) {
        document.body.style.overflow = 'hidden';
        document.body.classList.add('mobile-menu-open');
      } else {
        document.body.style.overflow = '';
        document.body.classList.remove('mobile-menu-open');
      }
    },
    closeMobileMenu() {
      this.mobileMenuOpen = false;
      document.body.style.overflow = '';
      document.body.classList.remove('mobile-menu-open');
    },
    handleResize() {
      // Close mobile menu on resize to larger screen
      if (window.innerWidth > 1024 && this.mobileMenuOpen) {
        this.closeMobileMenu();
      }
    }
  },
  mounted() {
    window.addEventListener('resize', this.handleResize);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize);
    // Ensure body scroll is restored
    document.body.style.overflow = '';
    document.body.classList.remove('mobile-menu-open');
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');

/* ═══════════════════════════════════════════
   PREDATOR VISION - THERMAL HUD NAVBAR
   ═══════════════════════════════════════════ */

.predator-nav-wrapper {
  --thermal-red: #ff2a2a;
  --thermal-orange: #ff6b00;
  --thermal-yellow: #ffcc00;
  --thermal-hot: #ff4444;
  --thermal-warm: #ff8800;
  --predator-bg: #0a0505;
  --predator-dark: #120808;
  --hud-glow: rgba(255, 100, 0, 0.6);
  --scanline-opacity: 0.04;
  position: relative;
}

/* Safe area */
.safe-area-top {
  height: env(safe-area-inset-top);
  background: var(--predator-bg);
}

/* Scanlines overlay - CRT effect */
.predator-scanlines {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 9999;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, var(--scanline-opacity)),
    rgba(0, 0, 0, var(--scanline-opacity)) 1px,
    transparent 1px,
    transparent 2px
  );
}

/* Main Navbar */
.navbar-predator {
  position: relative;
  background: linear-gradient(180deg, var(--predator-bg) 0%, var(--predator-dark) 100%);
  border-bottom: 2px solid var(--thermal-orange);
  padding: 12px 25px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 
    0 0 30px rgba(255, 107, 0, 0.3),
    inset 0 -5px 20px rgba(255, 68, 68, 0.1);
  z-index: 1000;
  padding-top: calc(12px + env(safe-area-inset-top));
  overflow: visible;
  font-family: 'Orbitron', 'Share Tech Mono', monospace;
}

/* Thermal grid background */
.thermal-grid {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: 
    linear-gradient(rgba(255, 68, 68, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 68, 68, 0.03) 1px, transparent 1px);
  background-size: 20px 20px;
  pointer-events: none;
}

/* HUD Corner brackets */
.hud-corner {
  position: absolute;
  width: 20px;
  height: 20px;
  border-color: var(--thermal-orange);
  border-style: solid;
  opacity: 0.8;
}

.hud-tl {
  top: 8px;
  left: 8px;
  border-width: 2px 0 0 2px;
}

.hud-tr {
  top: 8px;
  right: 8px;
  border-width: 2px 2px 0 0;
}

.hud-bl {
  bottom: 8px;
  left: 8px;
  border-width: 0 0 2px 2px;
}

.hud-br {
  bottom: 8px;
  right: 8px;
  border-width: 0 2px 2px 0;
}

/* Brand section */
.navbar-brand-section {
  display: flex;
  align-items: center;
  z-index: 1001;
}

.brand-link {
  display: flex;
  align-items: center;
  text-decoration: none;
  gap: 15px;
  padding: 8px 15px;
  border: 1px solid var(--thermal-orange);
  background: rgba(255, 68, 68, 0.1);
  transition: all 0.3s ease;
  position: relative;
}

.brand-link::before {
  content: '◄';
  position: absolute;
  left: -20px;
  color: var(--thermal-yellow);
  font-size: 0.8rem;
  opacity: 0;
  transition: all 0.3s ease;
}

.brand-link:hover::before {
  opacity: 1;
  left: -15px;
}

.brand-link:hover {
  background: rgba(255, 107, 0, 0.2);
  box-shadow: 0 0 20px var(--hud-glow);
  text-decoration: none;
}

/* Targeting reticle */
.targeting-reticle {
  position: relative;
  width: 45px;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.reticle-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 2px solid var(--thermal-orange);
  border-radius: 50%;
  animation: reticle-pulse 2s ease-in-out infinite;
}

.reticle-ring::before,
.reticle-ring::after {
  content: '';
  position: absolute;
  background: var(--thermal-orange);
}

.reticle-ring::before {
  width: 100%;
  height: 2px;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
}

.reticle-ring::after {
  width: 2px;
  height: 100%;
  left: 50%;
  top: 0;
  transform: translateX(-50%);
}

.reticle-dot {
  width: 8px;
  height: 8px;
  background: var(--thermal-red);
  border-radius: 50%;
  box-shadow: 0 0 10px var(--thermal-red);
  animation: dot-blink 1s ease-in-out infinite;
}

@keyframes reticle-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.7; }
}

@keyframes dot-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* Brand info */
.brand-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.alien-symbols {
  font-size: 0.7rem;
  color: var(--thermal-yellow);
  letter-spacing: 3px;
  opacity: 0.7;
}

.brand-title {
  color: var(--thermal-orange);
  font-family: 'Orbitron', sans-serif;
  font-size: 1.5rem;
  font-weight: 900;
  margin: 0;
  text-shadow: 
    0 0 10px var(--thermal-orange),
    0 0 20px rgba(255, 107, 0, 0.5);
  letter-spacing: 3px;
}

.system-status {
  font-size: 0.65rem;
  color: var(--thermal-yellow);
  font-family: 'Share Tech Mono', monospace;
  animation: status-flicker 3s ease-in-out infinite;
}

@keyframes status-flicker {
  0%, 90%, 100% { opacity: 1; }
  95% { opacity: 0.5; }
}

/* Mobile toggle */
.mobile-toggle {
  display: none;
  align-items: center;
  background: transparent;
  border: 1px solid var(--thermal-orange);
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 1001;
  gap: 5px;
}

.mobile-toggle:hover {
  background: rgba(255, 107, 0, 0.2);
  box-shadow: 0 0 15px var(--hud-glow);
}

.toggle-bracket {
  color: var(--thermal-yellow);
  font-family: 'Orbitron', sans-serif;
  font-size: 1.2rem;
}

.hamburger-lines {
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: all 0.3s ease;
}

.h-line {
  width: 20px;
  height: 2px;
  background: var(--thermal-orange);
  transition: all 0.3s ease;
  box-shadow: 0 0 5px var(--thermal-orange);
}

.hamburger-lines.active .h-line:nth-child(1) {
  transform: translateY(6px) rotate(45deg);
}

.hamburger-lines.active .h-line:nth-child(2) {
  opacity: 0;
}

.hamburger-lines.active .h-line:nth-child(3) {
  transform: translateY(-6px) rotate(-45deg);
}

/* Navigation menu */
.nav-menu {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  justify-content: flex-end;
}

.desktop-nav-items,
.mobile-nav-items {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
}

.mobile-nav-items {
  display: none;
}

/* Navigation links */
.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  text-decoration: none;
  color: var(--thermal-orange);
  font-family: 'Orbitron', sans-serif;
  font-weight: 600;
  font-size: 0.8rem;
  border: 1px solid transparent;
  transition: all 0.2s ease;
  position: relative;
  letter-spacing: 1px;
  background: transparent;
  white-space: nowrap;
}

.nav-link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 0;
  height: 2px;
  background: var(--thermal-red);
  transition: all 0.3s ease;
  transform: translateX(-50%);
  box-shadow: 0 0 10px var(--thermal-red);
}

.nav-link:hover::after {
  width: 80%;
}

.nav-link:hover {
  color: var(--thermal-yellow);
  text-shadow: 0 0 10px var(--thermal-yellow);
  text-decoration: none;
  border-color: var(--thermal-orange);
  background: rgba(255, 68, 68, 0.1);
}

.nav-link.router-link-active {
  color: var(--thermal-yellow);
  border-color: var(--thermal-yellow);
  background: rgba(255, 204, 0, 0.1);
  box-shadow: 0 0 15px rgba(255, 204, 0, 0.3);
}

.nav-link.router-link-active::after {
  width: 100%;
  background: var(--thermal-yellow);
}

.link-bracket {
  color: var(--thermal-red);
  font-size: 0.9rem;
  opacity: 0.6;
}

.link-index {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.7rem;
  color: var(--thermal-yellow);
  opacity: 0.5;
}

.thermal-indicator {
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 4px;
  background: var(--thermal-red);
  border-radius: 50%;
  opacity: 0;
  transition: all 0.3s ease;
}

.nav-link:hover .thermal-indicator {
  opacity: 1;
  box-shadow: 0 0 8px var(--thermal-red);
}

.nav-link.router-link-active .thermal-indicator {
  opacity: 1;
  background: var(--thermal-yellow);
  box-shadow: 0 0 8px var(--thermal-yellow);
}

.desktop-more-menu {
  position: relative;
}

.desktop-more-menu > summary {
  list-style: none;
  cursor: pointer;
}

.desktop-more-menu > summary::-webkit-details-marker {
  display: none;
}

.nav-link-more {
  user-select: none;
}

.desktop-more-panel {
  display: none;
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 210px;
  padding: 8px;
  border: 1px solid var(--thermal-orange);
  background: linear-gradient(180deg, var(--predator-bg) 0%, #1a0a0a 100%);
  box-shadow: 0 0 20px rgba(255, 107, 0, 0.4);
  z-index: 1200;
  flex-direction: column;
  gap: 6px;
}

.desktop-more-menu[open] .desktop-more-panel {
  display: flex;
}

.desktop-more-panel .nav-link {
  width: 100%;
  justify-content: flex-start;
  border: 1px solid var(--thermal-orange);
  background: rgba(255, 68, 68, 0.05);
}

.nav-link-priority {
  border-color: var(--thermal-orange);
  background: rgba(255, 107, 0, 0.12);
}

.nav-link-priority .nav-text {
  font-weight: 700;
}

/* HUD Data mobile */
.hud-data-mobile {
  display: none;
}

/* Mobile overlay */
.mobile-overlay {
  display: none;
}

@media (max-width: 1400px) {
  .desktop-nav-items {
    gap: 2px;
  }

  .nav-link {
    padding: 8px 9px;
    font-size: 0.7rem;
    gap: 4px;
  }

  .link-index {
    display: none;
  }

  .brand-link {
    gap: 10px;
    padding: 6px 10px;
  }

  .brand-title {
    font-size: 1.2rem;
    letter-spacing: 2px;
  }

  .system-status {
    font-size: 0.55rem;
  }
}

/* ═══════════════════════════════════════════
   RESPONSIVE - TABLET & MOBILE
   ═══════════════════════════════════════════ */

@media (max-width: 1024px) {
  .navbar-predator {
    padding: 10px 20px;
    padding-top: calc(10px + env(safe-area-inset-top));
  }

  .mobile-toggle {
    display: flex;
  }

  .nav-menu {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    height: 100dvh;
    background: linear-gradient(180deg, var(--predator-bg) 0%, #1a0a0a 100%);
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    padding-top: calc(100px + env(safe-area-inset-top));
    padding-right: 30px;
    padding-left: 30px;
    padding-bottom: 30px;
    overflow-y: auto;
    z-index: 999;
    flex-direction: column;
    justify-content: flex-start;
    border-right: 2px solid var(--thermal-orange);
    box-shadow: 5px 0 30px var(--hud-glow);
  }

  .nav-menu::before {
    content: '◢ NAVIGATION MATRIX ◣';
    position: absolute;
    top: calc(60px + env(safe-area-inset-top));
    left: 30px;
    font-family: 'Orbitron', sans-serif;
    font-size: 0.8rem;
    color: var(--thermal-yellow);
    letter-spacing: 2px;
    text-shadow: 0 0 10px var(--thermal-yellow);
  }

  .nav-menu.mobile-open {
    transform: translateX(0);
  }

  .desktop-nav-items {
    display: none;
  }

  .mobile-nav-items {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
  }

  .nav-link {
    width: 100%;
    padding: 15px 20px;
    font-size: 1rem;
    justify-content: flex-start;
    border: 1px solid var(--thermal-orange);
    background: rgba(255, 68, 68, 0.05);
  }

  .hud-data-mobile {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-top: auto;
    padding-top: 30px;
    border-top: 1px solid var(--thermal-orange);
    opacity: 0.6;
  }

  .hud-coord {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.8rem;
    color: var(--thermal-yellow);
  }

  .mobile-overlay {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    height: 100dvh;
    background: rgba(0, 0, 0, 0.7);
    z-index: 998;
  }
}

@media (max-width: 768px) {
  .brand-title {
    font-size: 1.3rem;
  }

  .targeting-reticle {
    width: 38px;
    height: 38px;
  }

  .alien-symbols {
    display: none;
  }

  .hud-corner {
    width: 15px;
    height: 15px;
  }
}

@media (max-width: 480px) {
  .navbar-predator {
    padding: 8px 15px;
    padding-top: calc(8px + env(safe-area-inset-top));
  }

  .brand-title {
    font-size: 1.1rem;
    letter-spacing: 2px;
  }

  .brand-link {
    padding: 6px 10px;
    gap: 10px;
  }

  .targeting-reticle {
    width: 32px;
    height: 32px;
  }

  .system-status {
    font-size: 0.55rem;
  }

  .nav-link {
    padding: 12px 15px;
    font-size: 0.9rem;
  }

  .link-index {
    display: none;
  }
}

/* Animations */
.navbar-predator {
  animation: hud-boot 0.8s ease-out;
}

@keyframes hud-boot {
  0% {
    opacity: 0;
    transform: translateY(-20px);
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .navbar-predator,
  .nav-link,
  .brand-link,
  .reticle-ring,
  .reticle-dot,
  .system-status {
    animation: none;
    transition: none;
  }
}
</style>