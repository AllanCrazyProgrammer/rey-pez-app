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
  productionSourceMap: false,
  // Configuración de webpack para asegurar carga correcta de chunks
  configureWebpack: {
    optimization: {
      splitChunks: {
        chunks: 'all',
        automaticNameDelimiter: '.',
        maxSize: 244000,
        // Mejorar la estabilidad de los nombres de chunks
        name: false,
        cacheGroups: {
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            reuseExistingChunk: true,
            name(module) {
              // Obtener el nombre del paquete npm
              const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
              // Normalizar algunos nombres específicos
              if (packageName.includes('pdfmake')) {
                return 'pdfmake-chunk';
              }
              return `npm.${packageName.replace('@', '')}`;
            }
          },
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true
          }
        }
      }
    },
    output: {
      chunkFilename: 'js/[name].[contenthash].js'
    }
  },
  chainWebpack: config => {
    // Usar hashed para una generación más estable de los hashes en producción
    config.optimization.set('moduleIds', 'hashed');
    // Usar named chunk IDs para mejor depuración en desarrollo
    if (process.env.NODE_ENV === 'development') {
      config.optimization.set('chunkIds', 'named');
    } else {
      // En producción, usar natural para mejor caching
      config.optimization.set('chunkIds', 'natural');
    }
  }
} 