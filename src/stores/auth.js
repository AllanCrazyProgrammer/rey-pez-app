import { defineStore } from 'pinia'
import { handleUserPresence } from '../firebase'
import { nanoid } from 'nanoid'

// Lista de usuarios predefinidos
const USERS = [
  { username: 'allan', password: 'noseno' },
  { username: 'edgar', password: 'noseno' },
  // Agrega más usuarios según necesites
]

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    isAuthenticated: false,
    userId: null
  }),

  actions: {
    async login(username, password) {
      try {
        const user = USERS.find(
          u => u.username === username && u.password === password
        )

        if (user) {
          const userId = nanoid()
          this.userId = userId
          this.user = { username: user.username }
          this.isAuthenticated = true
          
          // Iniciar seguimiento de presencia
          handleUserPresence(userId, user.username)
          
          // Guardar en localStorage para persistencia
          localStorage.setItem('user', JSON.stringify({ ...this.user, userId }))
          return true
        }
        return false
      } catch (error) {
        console.error('Error en login:', error)
        return false
      }
    },

    logout() {
      this.user = null
      this.isAuthenticated = false
      this.userId = null
      localStorage.removeItem('user')
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