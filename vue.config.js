const OfflinePlugin = require('./build/OfflinePlugin');
const { ContextReplacementPlugin } = require('webpack');
const isElectron = process.env.VUE_APP_TARGET === 'electron';

// vue-loader 15 genera `import style0 from '...?vue&type=style'` en cada componente aunque solo
// lo usa con <style module> (aquí no hay). Webpack 5 avisa ~180 veces que ese import no tiene
// default; es inofensivo. Se quita solo ese aviso exacto (la pantalla de Vue CLI lee los avisos
// directo de la compilación, por eso no basta con `ignoreWarnings`).
const AVISO_STYLE_VUE_LOADER = /export 'default' \(imported as 'style\d+'\) was not found in '[^']+\?vue&type=style/;
class IgnorarAvisoStyleVueLoader {
  apply(compiler) {
    compiler.hooks.afterCompile.tap('IgnorarAvisoStyleVueLoader', compilation => {
      compilation.warnings = compilation.warnings.filter(aviso => !AVISO_STYLE_VUE_LOADER.test(aviso.message || ''));
    });
  }
}
const isAndroid = process.env.VUE_APP_TARGET === 'android';

module.exports = {
  outputDir: isElectron ? 'desktop-dist' : isAndroid ? 'android-dist' : 'dist',
  ...(isAndroid ? { pages: { index: { entry: 'src/mobile/main.js', template: 'public/android.html', title: 'ReyPez Inventarios', chunks: 'all' } } } : {}),
  // Configuración del servidor de desarrollo
  devServer: {
    // Permitir acceso desde cualquier IP (otros equipos de la red local)
    host: '0.0.0.0',
    port: 8080,
    allowedHosts: 'all',
    client: {
      logging: 'info',
      // El navegador se conecta al socket de recarga en localhost:8080
      webSocketURL: 'ws://localhost:8080/ws'
    },
    // Configuración de CORS
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
    },
    // Habilitar HMR
    hot: true
  },
  publicPath: isElectron || isAndroid ? './' : '/',
  // Transpilación para soporte de navegadores
  // jsPDF 4 (y html2pdf.js 0.14, que lo usa) traen sintaxis ES2022 (campos de
  // clase); Babel los transpila igual que la app para los navegadores de .browserslistrc.
  transpileDependencies: ['fast-png', 'iobuffer', 'html2pdf.js'],
  // Configuración para producción
  productionSourceMap: false,
  // Configuración de webpack para asegurar carga correcta de chunks
  configureWebpack: {
    // Revisar cambios cada segundo (antes devServer.watchOptions en webpack-dev-server 3)
    watchOptions: { poll: 1000 },
    plugins: [
      new IgnorarAvisoStyleVueLoader(),
      // moment trae ~130 idiomas (~60 KB comprimidos en el arranque); la app solo usa español.
      new ContextReplacementPlugin(/moment[/\\]locale$/, /^\.\/es$/),
      ...(process.env.NODE_ENV === 'production' && !isElectron && !isAndroid ? [new OfflinePlugin()] : [])
    ],
    optimization: {
      splitChunks: {
        chunks: 'all',
        automaticNameDelimiter: '.',
        maxSize: 244000,
        // Mejorar la estabilidad de los nombres de chunks
        name: false,
        cacheGroups: {
          // Vue CLI 5 llama "defaultVendors" a su grupo de node_modules; con Vue CLI 4 nuestro
          // grupo "vendors" lo reemplazaba y heredaba chunks: 'initial'. Se replica igual.
          defaultVendors: false,
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            chunks: 'initial',
            reuseExistingChunk: true,
            name(module) {
              // Obtener el nombre del paquete npm (en webpack 5 algunos módulos no tienen context)
              const ruta = module.context || (module.nameForCondition && module.nameForCondition()) || '';
              const coincidencia = ruta.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/);
              if (!coincidencia) return 'npm.vendors';
              const packageName = coincidencia[1];
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
    // Do not prefetch every module while the initial screen is opening.
    // The service worker owns offline preloading; desktop chunks are installed already.
    config.plugins.delete('prefetch');
    if (isAndroid) {
      config.plugins.delete('prefetch-index');
      // Android genera su index.html desde public/android.html; no copiar public/index.html encima
      // (Vue CLI 4 lo sobrescribía en silencio; webpack 5 lo marca como conflicto).
      config.plugin('copy').tap(([options]) => {
        options.patterns[0].globOptions.ignore.push('**/index.html');
        return [options];
      });
    }
    // IDs de módulo deterministas (equivalente en webpack 5 al antiguo 'hashed')
    config.optimization.set('moduleIds', 'deterministic');
    // Usar named chunk IDs para mejor depuración en desarrollo
    if (process.env.NODE_ENV === 'development') {
      config.optimization.set('chunkIds', 'named');
    } else {
      // En producción, usar natural para mejor caching
      config.optimization.set('chunkIds', 'natural');
    }
  }
}
