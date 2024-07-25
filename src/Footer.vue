<template>
  <footer class="footer">
    <div class="footer-content">
      <p>© 2024 Rey Pez - Allan Reyes</p>
      <nav class="footer-nav">
        <router-link to="/" class="footer-link">Home</router-link>
        <router-link to="/noteMenu" class="footer-link">Notas</router-link>
      </nav>
    </div>
  </footer>
</template>

<script>
export default {
  name: 'Footer'
};
</script>

<style scoped>
.footer {
  background-color: #e8f0fe;
  border-top: 5px solid #3760b0;
  box-shadow: 0 -4px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  text-align: center;
  width: 100%;
  flex-shrink: 0;
}

.footer-content {
  max-width: 800px;
  margin: 0 auto;
}

.footer p {
  color: #3760b0;
  font-size: 1.2em;
  margin: 0;
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
  color: #3760b0;
}

@media (max-width: 768px) {
  .footer-content {
    padding: 0 20px;
  }

  .footer-link {
    display: block;
    margin: 10px 0;
  }
}
</style>