/**
 * Utilidad de diagnóstico para problemas de autenticación
 * Ayuda a identificar y resolver problemas comunes de autenticación
 */

export const authDiagnostic = {
  /**
   * Verifica el estado completo de autenticación
   */
  checkAuthState() {
    const results = {
      localStorage: this.checkLocalStorage(),
      authStore: this.checkAuthStore(),
      recommendations: []
    };

    // Generar recomendaciones basadas en los resultados
    this.generateRecommendations(results);
    
    return results;
  },

  /**
   * Verifica el estado del localStorage
   */
  checkLocalStorage() {
    try {
      const userData = localStorage.getItem('user');
      
      if (!userData) {
        return {
          status: 'error',
          message: 'No hay datos de usuario en localStorage',
          data: null
        };
      }

      const parsedUser = JSON.parse(userData);
      
      const hasUsername = !!(parsedUser.username);
      const hasUserId = !!(parsedUser.userId);
      
      return {
        status: hasUsername && hasUserId ? 'ok' : 'warning',
        message: hasUsername && hasUserId ? 
          'Datos de localStorage válidos' : 
          'Datos de localStorage incompletos',
        data: {
          hasUsername,
          hasUserId,
          username: parsedUser.username,
          userId: parsedUser.userId
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Error al leer localStorage: ' + error.message,
        data: null
      };
    }
  },

  /**
   * Verifica el estado del store de autenticación
   */
  checkAuthStore() {
    try {
      // Intentar importar el store de autenticación
      import('@/stores/auth').then(({ useAuthStore }) => {
        const authStore = useAuthStore();
        
        return {
          status: authStore.isAuthenticated ? 'ok' : 'error',
          message: authStore.isAuthenticated ? 
            'Usuario autenticado correctamente' : 
            'Usuario no autenticado en el store',
          data: {
            isAuthenticated: authStore.isAuthenticated,
            userId: authStore.userId,
            username: authStore.user?.username
          }
        };
      });
    } catch (error) {
      return {
        status: 'error',
        message: 'Error al acceder al store de autenticación: ' + error.message,
        data: null
      };
    }
  },

  /**
   * Genera recomendaciones basadas en los resultados del diagnóstico
   */
  generateRecommendations(results) {
    if (results.localStorage.status === 'error') {
      results.recommendations.push({
        type: 'critical',
        message: 'Limpie el localStorage y vuelva a iniciar sesión',
        action: () => this.clearAuthData()
      });
    }

    if (results.localStorage.status === 'warning') {
      results.recommendations.push({
        type: 'warning',
        message: 'Los datos de usuario están incompletos, reinicie la sesión',
        action: () => this.clearAuthData()
      });
    }

    if (results.authStore && results.authStore.status === 'error') {
      results.recommendations.push({
        type: 'warning',
        message: 'Ejecute checkAuth() para restaurar la sesión',
        action: () => this.restoreAuth()
      });
    }
  },

  /**
   * Limpia todos los datos de autenticación
   */
  clearAuthData() {
    try {
      localStorage.removeItem('user');
      console.log('Datos de autenticación limpiados del localStorage');
      return true;
    } catch (error) {
      console.error('Error al limpiar datos de autenticación:', error);
      return false;
    }
  },

  /**
   * Intenta restaurar la autenticación
   */
  async restoreAuth() {
    try {
      const { useAuthStore } = await import('@/stores/auth');
      const authStore = useAuthStore();
      authStore.checkAuth();
      console.log('Intento de restauración de autenticación completado');
      return authStore.isAuthenticated;
    } catch (error) {
      console.error('Error al restaurar autenticación:', error);
      return false;
    }
  },

  /**
   * Ejecuta diagnóstico completo y muestra resultados en consola
   */
  async runFullDiagnostic() {
    console.group('🔍 Diagnóstico de Autenticación');
    
    const results = this.checkAuthState();
    
    console.log('📊 Resultados del diagnóstico:');
    console.table(results);
    
    if (results.recommendations.length > 0) {
      console.log('💡 Recomendaciones:');
      results.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.type.toUpperCase()}] ${rec.message}`);
      });
    } else {
      console.log('✅ No se encontraron problemas de autenticación');
    }
    
    console.groupEnd();
    
    return results;
  },

  /**
   * Agrega monitoreo de errores de autenticación
   */
  enableAuthErrorMonitoring() {
    // Interceptar errores de Firebase relacionados con autenticación
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const errorMessage = args.join(' ');
      
      if (errorMessage.includes('Unsupported field value: undefined') && 
          errorMessage.includes('userId')) {
        console.warn('🚨 Error de autenticación detectado automáticamente');
        this.runFullDiagnostic();
      }
      
      originalConsoleError.apply(console, args);
    };
    
    console.log('🔧 Monitoreo de errores de autenticación activado');
  }
};

// Hacer disponible globalmente para debugging
if (typeof window !== 'undefined') {
  window.authDiagnostic = authDiagnostic;
}

export default authDiagnostic;
