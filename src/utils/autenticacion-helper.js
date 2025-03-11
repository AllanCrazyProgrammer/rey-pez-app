// src/utils/autenticacion-helper.js

import { useAuthStore } from '@/stores/auth';
import Logger from '@/utils/logger';

/**
 * Utilidades para verificar y gestionar la autenticación de usuario
 */
const AutenticacionHelper = {
  /**
   * Verifica si hay un usuario autenticado y recupera los datos si es necesario
   * @returns {Boolean} - true si hay un usuario autenticado, false en caso contrario
   */
  verificarAutenticacion() {
    try {
      // Intentar obtener la store de autenticación
      const authStore = useAuthStore();
      
      // Verificar si ya está autenticado
      if (authStore.isAuthenticated && authStore.user && authStore.userId) {
        Logger.info('AutenticacionHelper', 'Usuario ya autenticado', { 
          username: authStore.user.username 
        });
        return true;
      }
      
      // Intentar recuperar información del localStorage
      const userData = localStorage.getItem('user');
      if (userData) {
        Logger.info('AutenticacionHelper', 'Recuperando usuario de localStorage');
        try {
          const parsedUser = JSON.parse(userData);
          
          // Verificar si los datos son válidos
          if (parsedUser && parsedUser.userId && parsedUser.username) {
            // Actualizar la store con los datos recuperados
            authStore.user = { username: parsedUser.username };
            authStore.userId = parsedUser.userId;
            authStore.isAuthenticated = true;
            
            Logger.info('AutenticacionHelper', 'Usuario restaurado correctamente', {
              username: parsedUser.username
            });
            
            return true;
          }
        } catch (error) {
          Logger.error('AutenticacionHelper', 'Error al procesar datos de usuario', {
            error: error.message
          });
          
          // Limpiar datos de usuario en caso de error
          localStorage.removeItem('user');
        }
      }
      
      Logger.warn('AutenticacionHelper', 'No hay sesión de usuario activa');
      return false;
    } catch (error) {
      Logger.error('AutenticacionHelper', 'Error al verificar autenticación', {
        error: error.message
      });
      return false;
    }
  },
  
  /**
   * Fuerza la redirección al login si no hay sesión activa
   * @returns {Boolean} - true si se redirigió, false si hay una sesión activa
   */
  redirigirSiNoAutenticado() {
    if (!this.verificarAutenticacion()) {
      // Redireccionar a la página de login
      window.location.href = '/#/login';
      return true;
    }
    return false;
  }
};

export default AutenticacionHelper; 