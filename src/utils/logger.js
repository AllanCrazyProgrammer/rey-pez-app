/**
 * Sistema de registro avanzado para depurar problemas de sincronización y carga de datos
 */

// Niveles de registro
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  SILENT: 4
};

// Configuración inicial
let currentLevel = LOG_LEVELS.INFO; // Nivel predeterminado
let logHistory = [];
const MAX_HISTORY = 1000; // Máximo número de entradas en la historia

// Habilitar envío de registros al servidor (desactivado por defecto)
let remoteLoggingEnabled = false;
let remoteLoggingEndpoint = null;

/**
 * Configura el nivel de log
 * @param {string} level - Nivel de log (DEBUG, INFO, WARN, ERROR, SILENT)
 */
function setLogLevel(level) {
  if (LOG_LEVELS[level] !== undefined) {
    currentLevel = LOG_LEVELS[level];
    console.log(`Nivel de log establecido a: ${level}`);
  } else {
    console.error(`Nivel de log inválido: ${level}`);
  }
}

/**
 * Habilita el envío de logs a un servidor remoto
 * @param {string} endpoint - URL del endpoint para enviar logs
 */
function enableRemoteLogging(endpoint) {
  remoteLoggingEnabled = true;
  remoteLoggingEndpoint = endpoint;
  console.log(`Logging remoto habilitado: ${endpoint}`);
}

/**
 * Deshabilita el envío de logs a un servidor remoto
 */
function disableRemoteLogging() {
  remoteLoggingEnabled = false;
  remoteLoggingEndpoint = null;
  console.log('Logging remoto deshabilitado');
}

/**
 * Registra un mensaje con timestamp y contexto
 * @param {string} level - Nivel del mensaje
 * @param {string} component - Componente que genera el mensaje
 * @param {string} message - Mensaje a registrar
 * @param {Object} data - Datos adicionales para incluir en el registro
 */
function log(level, component, message, data = null) {
  if (LOG_LEVELS[level] < currentLevel) return;
  
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    component,
    message,
    data: data ? JSON.parse(JSON.stringify(data)) : null
  };
  
  // Añadir a la historia
  logHistory.unshift(logEntry);
  if (logHistory.length > MAX_HISTORY) {
    logHistory.pop();
  }
  
  // Formatear para consola
  const consoleMessage = `[${timestamp}] [${level}] [${component}] ${message}`;
  
  // Mostrar en consola con el color apropiado
  switch(level) {
    case 'DEBUG':
      console.debug(consoleMessage, data);
      break;
    case 'INFO':
      console.info(consoleMessage, data);
      break;
    case 'WARN':
      console.warn(consoleMessage, data);
      break;
    case 'ERROR':
      console.error(consoleMessage, data);
      break;
  }
  
  // Enviar a servidor remoto si está habilitado
  if (remoteLoggingEnabled && remoteLoggingEndpoint) {
    try {
      fetch(remoteLoggingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(logEntry)
      }).catch(err => {
        console.error('Error enviando log al servidor:', err);
      });
    } catch (error) {
      console.error('Error enviando log al servidor:', error);
    }
  }
  
  return logEntry;
}

/**
 * Registra un mensaje de nivel DEBUG
 */
function debug(component, message, data = null) {
  return log('DEBUG', component, message, data);
}

/**
 * Registra un mensaje de nivel INFO
 */
function info(component, message, data = null) {
  return log('INFO', component, message, data);
}

/**
 * Registra un mensaje de nivel WARN
 */
function warn(component, message, data = null) {
  return log('WARN', component, message, data);
}

/**
 * Registra un mensaje de nivel ERROR
 */
function error(component, message, data = null) {
  return log('ERROR', component, message, data);
}

/**
 * Obtiene el historial de logs
 * @param {string} level - Filtrar por nivel (opcional)
 * @param {string} component - Filtrar por componente (opcional)
 * @param {number} limit - Número máximo de entradas a devolver (opcional)
 * @returns {Array} - Historia de logs filtrada
 */
function getLogHistory(level = null, component = null, limit = MAX_HISTORY) {
  let filtered = [...logHistory];
  
  if (level) {
    filtered = filtered.filter(entry => entry.level === level);
  }
  
  if (component) {
    filtered = filtered.filter(entry => entry.component === component);
  }
  
  return filtered.slice(0, limit);
}

/**
 * Limpia el historial de logs
 */
function clearLogHistory() {
  logHistory = [];
  console.log('Historial de logs limpiado');
}

/**
 * Descarga el historial de logs como un archivo JSON
 */
function downloadLogs() {
  const json = JSON.stringify(logHistory, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `rey-pez-app-logs-${new Date().toISOString()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default {
  setLogLevel,
  enableRemoteLogging,
  disableRemoteLogging,
  debug,
  info,
  warn,
  error,
  getLogHistory,
  clearLogHistory,
  downloadLogs,
  LOG_LEVELS
}; 