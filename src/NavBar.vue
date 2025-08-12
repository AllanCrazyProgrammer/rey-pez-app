<template>
  <div>
    <div class="safe-area-top"></div>

    <nav class="navbar-modern" role="navigation" aria-label="Navegación principal">
      <!-- Brand Section -->
      <div class="navbar-brand-section">
        <router-link to="/" class="brand-link" aria-label="Ir al inicio - Rey Pez">
          <div class="logo-container">
            <img
              src="https://res.cloudinary.com/hwkcovsmr/image/upload/v1620946647/samples/REY_PEZ_LOGO_nsotww.png"
              alt="Logo de Rey Pez"
              class="logo-image"
              loading="lazy"
            >
          </div>
          <h1 class="brand-title">Rey Pez</h1>
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
        <span class="hamburger-line" :class="{ 'active': mobileMenuOpen }"></span>
        <span class="hamburger-line" :class="{ 'active': mobileMenuOpen }"></span>
        <span class="hamburger-line" :class="{ 'active': mobileMenuOpen }"></span>
      </button>

      <!-- Navigation Menu -->
      <div 
        class="nav-menu" 
        :class="{ 'mobile-open': mobileMenuOpen }"
        id="mobile-navigation"
      >
        <div class="nav-items">
          <router-link 
            to="/" 
            class="nav-link" 
            @click="closeMobileMenu"
            aria-label="Ir a la página de inicio"
          >
            <i class="nav-icon">🏠</i>
            <span class="nav-text">Home</span>
          </router-link>
          
          <router-link 
            to="/noteMenu" 
            class="nav-link"
            @click="closeMobileMenu"
            aria-label="Gestionar notas"
          >
            <i class="nav-icon">📝</i>
            <span class="nav-text">Notas</span>
          </router-link>
          
          <router-link 
            to="/sacadas" 
            class="nav-link"
            @click="closeMobileMenu"
            aria-label="Ver entradas y salidas"
          >
            <i class="nav-icon">📦</i>
            <span class="nav-text">Entradas/Salidas</span>
          </router-link>
          
          <router-link 
            to="/existencias" 
            class="nav-link"
            @click="closeMobileMenu"
            aria-label="Ver existencias"
          >
            <i class="nav-icon">📊</i>
            <span class="nav-text">Existencias</span>
          </router-link>
          
          <router-link 
            to="/existencias-crudos" 
            class="nav-link"
            @click="closeMobileMenu"
            aria-label="Ver existencias de productos crudos"
          >
            <i class="nav-icon">🦐</i>
            <span class="nav-text">Existencias Crudos</span>
          </router-link>
          
          <router-link 
            to="/cuentas-mexico" 
            class="nav-link"
            @click="closeMobileMenu"
            aria-label="Ver cuentas de México"
          >
            <i class="nav-icon">🇲🇽</i>
            <span class="nav-text">Cuentas México</span>
          </router-link>
          
          <router-link 
            to="/embarques-menu" 
            class="nav-link"
            @click="closeMobileMenu"
            aria-label="Gestionar embarques"
          >
            <i class="nav-icon">🚢</i>
            <span class="nav-text">Embarques</span>
          </router-link>
          
          <router-link 
            to="/procesos" 
            class="nav-link"
            @click="closeMobileMenu"
            aria-label="Ver procesos"
          >
            <i class="nav-icon">⚙️</i>
            <span class="nav-text">Procesos</span>
          </router-link>
          

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
      } else {
        document.body.style.overflow = '';
      }
    },
    closeMobileMenu() {
      this.mobileMenuOpen = false;
      document.body.style.overflow = '';
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
  }
};
</script>

<style scoped>
/* Safe area para dispositivos móviles */
.safe-area-top {
  height: env(safe-area-inset-top);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Navbar principal moderna */
.navbar-modern {
  position: relative;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding: 15px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  padding-top: calc(15px + env(safe-area-inset-top));
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
  transition: all 0.3s ease;
  padding: 8px 12px;
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.brand-link:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  text-decoration: none;
}

.logo-container {
  margin-right: 15px;
}

.logo-image {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  background-color: white;
  padding: 2px;
}

.brand-link:hover .logo-image {
  transform: scale(1.05);
  border-color: rgba(255, 255, 255, 0.5);
}

.brand-title {
  color: white;
  font-size: 1.8rem;
  font-family: 'Sail', cursive;
  font-weight: 700;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  background: linear-gradient(45deg, #fff, #f0f0f0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Mobile toggle button */
.mobile-toggle {
  display: none;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 1001;
}

.mobile-toggle:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}

.mobile-toggle:focus {
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: 2px;
}

.hamburger-line {
  width: 25px;
  height: 3px;
  background: white;
  margin: 2px 0;
  transition: all 0.3s ease;
  border-radius: 2px;
}

.hamburger-line.active:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}

.hamburger-line.active:nth-child(2) {
  opacity: 0;
}

.hamburger-line.active:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

/* Navigation menu */
.nav-menu {
  display: flex;
  align-items: center;
}

.nav-items {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* Navigation links */
.nav-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 18px;
  text-decoration: none;
  color: white;
  font-weight: 600;
  font-size: 0.95rem;
  border-radius: 12px;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}

.nav-link::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.nav-link:hover::before {
  left: 100%;
}

.nav-link:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  text-decoration: none;
  color: white;
}

.nav-link:focus {
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: 2px;
}

.nav-link.router-link-active {
  background: linear-gradient(45deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.2));
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.nav-icon {
  font-size: 1.2rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.nav-text {
  white-space: nowrap;
}

/* Mobile overlay */
.mobile-overlay {
  display: none;
}

/* Tablet (iPad) y móviles grandes: usar menú lateral igual que en móvil */
@media (max-width: 1024px) {
  .navbar-modern {
    padding: 12px 22px;
    padding-top: calc(12px + env(safe-area-inset-top));
  }

  .brand-title {
    font-size: 1.6rem;
  }

  .logo-image {
    width: 44px;
    height: 44px;
  }

  .mobile-toggle { display: flex; }

  .nav-menu {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh; /* fallback */
    height: 100dvh;
    height: 100svh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    backdrop-filter: blur(20px);
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    padding-top: calc(90px + env(safe-area-inset-top));
    padding-right: 34px;
    padding-left: 34px;
    padding-bottom: max(28px, calc(28px + env(safe-area-inset-bottom)));
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    z-index: 999;
  }

  .nav-menu.mobile-open { transform: translateX(0); }

  .nav-items {
    flex-direction: column;
    gap: 14px;
    width: 100%;
  }

  .nav-link {
    width: 100%;
    padding: 16px 18px;
    font-size: 1.08rem;
    justify-content: flex-start;
  }

  .mobile-overlay {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh; /* fallback */
    height: 100dvh;
    height: 100svh;
    background: rgba(0, 0, 0, 0.5);
    z-index: 998;
  }
}

/* Responsive design */
@media (max-width: 768px) {
  .navbar-modern {
    padding: 10px 20px;
    padding-top: calc(10px + env(safe-area-inset-top));
  }

  .brand-title {
    font-size: 1.4rem;
  }

  .logo-image {
    width: 40px;
    height: 40px;
  }

  .mobile-toggle {
    display: flex;
  }

  .nav-menu {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    /* Altura responsiva que considera barras del navegador en móviles */
    height: 100vh;           /* Fallback */
    height: 100dvh;          /* Navegadores modernos */
    height: 100svh;          /* iOS/Android dinámico */
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    backdrop-filter: blur(20px);
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    /* Respetar notch y barras del sistema */
    padding-top: calc(80px + env(safe-area-inset-top));
    padding-right: 30px;
    padding-left: 30px;
    padding-bottom: max(24px, calc(24px + env(safe-area-inset-bottom)));
    /* Scroll interno para que no se tapen elementos inferiores */
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    z-index: 999;
  }

  .nav-menu.mobile-open {
    transform: translateX(0);
  }

  .nav-items {
    flex-direction: column;
    gap: 12px;
    width: 100%;
  }

  .nav-link {
    width: 100%;
    padding: 14px 16px;
    font-size: 1.05rem;
    justify-content: flex-start;
  }

  .mobile-overlay {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;  /* Fallback */
    height: 100dvh;
    height: 100svh;
    background: rgba(0, 0, 0, 0.5);
    z-index: 998;
  }
}

/* Ajustes extra para dispositivos con poca altura (ej. Galaxy Fold cerrado) */
@media (max-height: 700px) {
  .nav-menu {
    padding-top: calc(64px + env(safe-area-inset-top));
    padding-bottom: max(16px, calc(16px + env(safe-area-inset-bottom)));
  }
  .nav-items {
    gap: 10px;
  }
  .nav-link {
    padding: 12px 14px;
    font-size: 0.98rem;
  }
  .nav-icon {
    font-size: 1.05rem;
  }
}

/* Scrollbar discreto en el menú móvil */
@media (max-width: 768px) {
  .nav-menu::-webkit-scrollbar { width: 6px; }
  .nav-menu::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.35);
    border-radius: 3px;
  }
  .nav-menu::-webkit-scrollbar-track {
    background: transparent;
  }
}

@media (max-width: 480px) {
  .navbar-modern {
    padding: 8px 15px;
    padding-top: calc(8px + env(safe-area-inset-top));
  }

  .brand-title {
    font-size: 1.2rem;
  }

  .brand-link {
    padding: 6px 10px;
  }

  .nav-menu {
    padding: 80px 20px 20px;
  }

  .nav-link {
    padding: 12px 16px;
    font-size: 1rem;
  }
}

/* Fallback para navegadores que no soportan env() */
@supports not (padding: env(safe-area-inset-top)) {
  .safe-area-top {
    height: 20px;
  }
  
  .navbar-modern {
    padding-top: 35px;
  }
  
  @media (max-width: 768px) {
    .navbar-modern {
      padding-top: 30px;
    }
  }
  
  @media (max-width: 480px) {
    .navbar-modern {
      padding-top: 28px;
    }
  }
}

/* Animaciones suaves para carga */
.navbar-modern {
  animation: slideDown 0.5s ease-out;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Mejoras de accesibilidad */
@media (prefers-reduced-motion: reduce) {
  .nav-link,
  .brand-link,
  .mobile-toggle,
  .navbar-modern,
  .nav-menu {
    transition: none;
  }
  
  .navbar-modern {
    animation: none;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .nav-link {
    border: 2px solid white;
  }
  
  .nav-link:focus {
    outline: 3px solid yellow;
  }
}
</style>