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

    checkAuth() {
      try {
        const userData = localStorage.getItem('user')
        if (userData) {
          const parsedUser = JSON.parse(userData)
          this.user = { username: parsedUser.username }
          this.userId = parsedUser.userId
          this.isAuthenticated = true
          
          // Reiniciar seguimiento de presencia
          if (this.userId) {
            handleUserPresence(this.userId, parsedUser.username)
          }
        }
      } catch (error) {
        console.error('Error al verificar autenticación:', error)
        this.logout()
      }
    }
  },

  getters: {
    isLoggedIn: (state) => state.isAuthenticated,
    currentUser: (state) => state.user
  }
}) 