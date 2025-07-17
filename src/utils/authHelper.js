// Helper para autenticación desde consola del navegador
// Usar desde la consola: window.authHelper.quickLogin('allan')

const quickLogin = (username = 'allan') => {
  const user = {
    username: username,
    userId: `dev-${Date.now()}`
  };
  
  localStorage.setItem('user', JSON.stringify(user));
  console.log('Usuario logueado:', user);
  console.log('Recarga la página para aplicar la autenticación');
  
  return user;
};

const logout = () => {
  localStorage.removeItem('user');
  console.log('Usuario deslogueado');
  console.log('Recarga la página para aplicar los cambios');
};

const checkAuthStatus = () => {
  const userString = localStorage.getItem('user');
  if (userString) {
    try {
      const user = JSON.parse(userString);
      console.log('Usuario autenticado:', user);
      return user;
    } catch (e) {
      console.log('Error en datos de usuario:', e);
      return null;
    }
  } else {
    console.log('No hay usuario autenticado');
    return null;
  }
};

// Hacer disponible globalmente en desarrollo
if (typeof window !== 'undefined') {
  window.authHelper = {
    quickLogin,
    logout,
    checkAuthStatus
  };
}

export { quickLogin, logout, checkAuthStatus }; 