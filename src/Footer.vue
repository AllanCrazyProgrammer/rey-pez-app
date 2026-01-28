<template>
  <footer class="footer">
    <div class="footer-content">
      <p>© 2026 Rey Pez - Allan Reyes</p>
     
    </div>
  </footer>
</template>

<script>
export default {
  name: 'Footer'
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');

.footer {
  --thermal-red: #ff2a2a;
  --thermal-orange: #ff6b00;
  --thermal-yellow: #ffcc00;
  --predator-bg: #0a0505;
  --predator-dark: #120808;
  --hud-glow: rgba(255, 100, 0, 0.6);
  --scanline-opacity: 0.05;
  position: relative;
  background: linear-gradient(180deg, var(--predator-dark) 0%, var(--predator-bg) 100%);
  border-top: 2px solid var(--thermal-orange);
  box-shadow: 
    0 -10px 30px rgba(255, 107, 0, 0.25),
    inset 0 1px 0 rgba(255, 68, 68, 0.15);
  padding: 16px 20px;
  text-align: center;
  width: 100%;
  flex-shrink: 0;
  overflow: hidden;
}

.footer-content {
  max-width: 800px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.footer p {
  color: var(--thermal-orange);
  font-size: 0.9rem;
  margin: 0;
  font-family: 'Share Tech Mono', monospace;
  letter-spacing: 2px;
  text-transform: uppercase;
  text-shadow: 0 0 10px rgba(255, 107, 0, 0.5);
}

.footer::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, var(--scanline-opacity)),
    rgba(0, 0, 0, var(--scanline-opacity)) 1px,
    transparent 1px,
    transparent 2px
  );
}

.footer-nav {
  margin-top: 10px;
}

.footer-link {
  color: #2a4a87;
  margin: 0 15px;
  text-decoration: none;
  font-weight: bold;
  transition: color 0.3s;
}

.footer-link:hover {
  color: var(--thermal-yellow);
}

@media (max-width: 768px) {
  .footer-content {
    padding: 0 20px;
  }

  .footer p {
    font-size: 0.8rem;
    letter-spacing: 1px;
  }

  .footer-link {
    display: block;
    margin: 10px 0;
  }
}
</style>