import { defineStore } from 'pinia'
import { handleUserPresence } from '../firebase'
import { nanoid } from 'nanoid'

// Transición a Firebase Auth (docs/SEGURIDAD_Y_RESPALDOS.md):
// - VUE_APP_LOGIN_LOCAL sin definir (o distinto de "off"): si Firebase rechaza el inicio de sesión,
//   se acepta todavía el login anterior para que nadie quede fuera mientras se crean las cuentas.
// - VUE_APP_LOGIN_LOCAL=off: solo Firebase Auth. El login anterior (y sus contraseñas) ya no
//   entra al build, y las sesiones viejas sin cuenta de Firebase deben iniciar sesión otra vez.
const LOGIN_LOCAL = process.env.VUE_APP_LOGIN_LOCAL !== 'off'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    isAuthenticated: false,
    userId: null,
    errorLogin: ''
  }),

  actions: {
    async login(username, password) {
      this.errorLogin = ''
      let nombre = null
      let conFirebase = false
      try {
        const { iniciarSesionFirebase, usuarioDeCorreo } = await import('@/firebaseAuth')
        const usuarioFirebase = await iniciarSesionFirebase(username, password)
        nombre = usuarioDeCorreo(usuarioFirebase.email) || String(username || '').trim()
        conFirebase = true
      } catch (error) {
        // Condición literal (no la constante LOGIN_LOCAL) para que webpack la evalúe al compilar
        // y, con VUE_APP_LOGIN_LOCAL=off, no incluya loginLocal.js en el build.
        if (process.env.VUE_APP_LOGIN_LOCAL !== 'off') {
          const { validarLoginLocal } = await import('@/services/loginLocal')
          if (validarLoginLocal(username, password)) nombre = username
        }
        if (!nombre) {
          const { mensajeErrorLogin } = await import('@/firebaseAuth')
          this.errorLogin = mensajeErrorLogin(error)
          return false
        }
      }

      const userId = nanoid()
      this.userId = userId
      this.user = { username: nombre }
      this.isAuthenticated = true

      // Iniciar seguimiento de presencia
      handleUserPresence(userId, nombre)

      // Guardar en localStorage para persistencia (lo usan las guardas de ruta)
      localStorage.setItem('user', JSON.stringify({ ...this.user, userId, firebase: conFirebase }))
      return true
    },

    // Con VUE_APP_LOGIN_LOCAL=off, una sesión guardada sin cuenta de Firebase Auth ya no sirve
    // (las reglas de Firebase la rechazarían): se cierra y se pide iniciar sesión otra vez.
    // Lee la sesión guardada en el equipo, así que funciona sin internet.
    async exigirSesionFirebase(router) {
      if (LOGIN_LOCAL || !localStorage.getItem('user')) return true
      try {
        const { esperarUsuarioFirebase } = await import('@/firebaseAuth')
        if (await esperarUsuarioFirebase()) return true
      } catch (error) {
        console.error('No se pudo verificar la sesión de Firebase:', error)
      }
      this.logout()
      if (router && router.currentRoute.path !== '/login') router.replace('/login').catch(() => {})
      return false
    },

    logout() {
      this.user = null
      this.isAuthenticated = false
      this.userId = null
      localStorage.removeItem('user')
      // Cerrar también la sesión de Firebase Auth si se llegó a cargar (sin bloquear).
      import('@/firebaseAuth').then(m => m.cerrarSesionFirebase()).catch(() => {})
    },

    // Método para verificar y asegurar autenticación válida
    ensureAuthenticated() {
      if (!this.isAuthenticated || !this.userId || !this.user) {
        console.warn('Usuario no autenticado, intentando verificar autenticación...')
        this.checkAuth()
        
        if (!this.isAuthenticated || !this.userId || !this.user) {
          throw new Error('Usuario no autenticado. Por favor, vuelva a iniciar sesión.')
        }
      }
      return true
    },

    checkAuth() {
      try {
        const userData = localStorage.getItem('user')
        if (userData) {
          const parsedUser = JSON.parse(userData)
          
          // Validar que los datos necesarios existan
          if (parsedUser.username && parsedUser.userId) {
            this.user = { username: parsedUser.username }
            this.userId = parsedUser.userId
            this.isAuthenticated = true
            
            // Reiniciar seguimiento de presencia
            handleUserPresence(this.userId, parsedUser.username)
          } else {
            console.warn('Datos de usuario incompletos en localStorage')
            this.logout()
          }
        } else {
          console.log('No hay datos de usuario en localStorage')
          this.logout()
        }
      } catch (error) {
        console.error('Error al verificar autenticación:', error)
        console.error('Datos corruptos en localStorage, limpiando...')
        this.logout()
      }
    }
  },

  getters: {
    isLoggedIn: (state) => state.isAuthenticated,
    currentUser: (state) => state.user
  }
})
