import { defineStore } from 'pinia'

// Lista de usuarios predefinidos
const USERS = [
  { username: 'allan', password: 'noseno' },
  { username: 'edgar', password: 'noseno' },
  // Agrega más usuarios según necesites
]

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    isAuthenticated: false
  }),

  actions: {
    async login(username, password) {
      try {
        // Simular una llamada asíncrona
        const user = USERS.find(
          u => u.username === username && u.password === password
        )

        if (user) {
          this.user = { username: user.username }
          this.isAuthenticated = true
          // Guardar en localStorage para persistencia
          localStorage.setItem('user', JSON.stringify(this.user))
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
      localStorage.removeItem('user')
    },

    checkAuth() {
      try {
        const user = localStorage.getItem('user')
        if (user) {
          this.user = JSON.parse(user)
          this.isAuthenticated = true
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