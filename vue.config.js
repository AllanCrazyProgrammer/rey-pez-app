module.exports = {
  // Configuración del servidor de desarrollo
  devServer: {
    // Configuración para permitir acceso desde cualquier IP
    host: '0.0.0.0',
    port: 8080,
    // Parámetros para versiones antiguas de webpack-dev-server
    disableHostCheck: true,
    // Configuración para cliente
    clientLogLevel: 'info',
    // Configurar socket
    sockHost: 'localhost',
    sockPort: 8080,
    // Configuración de CORS
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
    },
    // Habilitar HMR
    hot: true,
    // Configuración de websockets
    watchOptions: {
      poll: 1000 // Encuestar cada segundo
    },
    // Forzar publicPath
    public: 'localhost:8080'
  },
  publicPath: '/',
  // Transpilación para soporte de navegadores
  transpileDependencies: [],
  // Configuración para producción
  productionSourceMap: false
} 