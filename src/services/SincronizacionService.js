import { db, rtdb } from '@/firebase';
import { doc, updateDoc, collection, getDocs, addDoc, serverTimestamp, getDoc, onSnapshot } from 'firebase/firestore';
import { ref, onValue, set, update, onDisconnect, serverTimestamp as rtdbServerTimestamp, get, remove } from 'firebase/database';
import { debounce } from 'lodash';
import Logger from '@/utils/logger';
import FirestoreHelper from '@/utils/firestore-helper';

// Constantes para persistencia
const LOCAL_STORAGE_PREFIX = 'rey_pez_app_';
const CACHE_DURACION_MAXIMA = 24 * 60 * 60 * 1000; // 24 horas en milisegundos

/**
 * Servicio para manejar la sincronización de embarques,
 * incluyendo guardado automático, edición colaborativa y soporte offline
 */
export default {
  /**
   * Clientes activos editando el mismo embarque
   */
  usuariosActivos: {},
  
  /**
   * Referencia a la suscripción del embarque actual
   */
  embarqueUnsubscribe: null,
  
  /**
   * Referencia a la suscripción de cambios en tiempo real
   */
  cambiosUnsubscribe: null,
  
  /**
   * Cola de cambios pendientes para sincronizar cuando se recupere la conexión
   */
  cambiosPendientes: [],
  
  /**
   * Estado de la conexión a internet
   */
  online: navigator.onLine,
  
  /**
   * ID del usuario actual
   */
  usuarioActualId: null,
  
  /**
   * Información del usuario actual
   */
  usuarioActual: null,
  
  /**
   * ID del embarque actual
   */
  embarqueActualId: null,
  
  /**
   * Bloqueos activos en documentos
   */
  bloqueos: {},
  
  /**
   * Indica si hay guardado automático activo
   */
  guardadoAutomaticoActivo: true,
  
  /**
   * Copia de seguridad local del último embarque válido
   */
  ultimoEmbarqueValido: null,
  
  /**
   * Timestamp de la última vez que se utilizó el servicio
   */
  ultimaActividad: Date.now(),
  
  /**
   * Número de intentos de reconexión realizados
   */
  intentosReconexion: 0,
  
  /**
   * Inicializa el servicio de sincronización
   * @param {String} userId - ID del usuario actual
   * @param {Object} userData - Datos del usuario actual
   */
  init(userId, userData) {
    // Intentar recuperar usuario si no está definido
    if (!userId || !userData) {
      try {
        const localUser = localStorage.getItem('user');
        if (localUser) {
          const parsedUser = JSON.parse(localUser);
          if (parsedUser && parsedUser.userId) {
            userId = parsedUser.userId;
            userData = { username: parsedUser.username };
            Logger.info('SincronizacionService', 'Recuperado usuario desde localStorage durante inicialización');
          }
        }
      } catch (error) {
        Logger.error('SincronizacionService', 'Error al recuperar usuario de localStorage', { error: error.message });
      }
    }
    
    this.usuarioActualId = userId;
    this.usuarioActual = userData;
    
    // Escuchar eventos de conexión/desconexión
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Comprobar el estado inicial
    this.online = navigator.onLine;
    
    // Establecer nivel de log según entorno
    if (process.env.NODE_ENV !== 'production') {
      Logger.setLogLevel('DEBUG');
    }
    
    Logger.info('SincronizacionService', 'Inicializado', { 
      userId, 
      online: this.online,
      userData: { username: userData?.username }
    });
    
    // Iniciar limpieza periódica de caché antigua
    this.iniciarLimpiezaPeriodicaCache();
  },
  
  /**
   * Inicia una limpieza periódica de caché antigua
   */
  iniciarLimpiezaPeriodicaCache() {
    // Ejecutar limpieza cada 12 horas
    setInterval(() => {
      this.limpiarCacheAntigua();
    }, 12 * 60 * 60 * 1000);
    
    // Ejecutar una vez al inicio
    this.limpiarCacheAntigua();
  },
  
  /**
   * Limpia la caché local que tenga más de 24 horas
   */
  limpiarCacheAntigua() {
    const ahora = Date.now();
    Logger.debug('SincronizacionService', 'Iniciando limpieza de caché antigua');
    
    try {
      // Recorrer todos los elementos de localStorage con nuestro prefijo
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(LOCAL_STORAGE_PREFIX)) {
          try {
            // Obtener el valor y verificar si tiene timestamp
            const valor = JSON.parse(localStorage.getItem(key));
            
            if (valor && valor._timestamp) {
              const edad = ahora - valor._timestamp;
              
              if (edad > CACHE_DURACION_MAXIMA) {
                // Eliminar elementos antiguos
                localStorage.removeItem(key);
                Logger.debug('SincronizacionService', `Caché eliminada por antigüedad: ${key}`);
              }
            }
          } catch (error) {
            // Si hay error al parsear, probablemente no es un objeto JSON válido
            Logger.warn('SincronizacionService', `Error al procesar caché: ${key}`, { error: error.message });
          }
        }
      });
      
      Logger.info('SincronizacionService', 'Limpieza de caché completada');
    } catch (error) {
      Logger.error('SincronizacionService', 'Error durante limpieza de caché', { error: error.message });
    }
  },
  
  /**
   * Maneja el evento de conexión recuperada
   */
  async handleOnline() {
    Logger.info('SincronizacionService', 'Conexión recuperada');
    this.online = true;
    
    // Resetear contador de intentos
    this.intentosReconexion = 0;
    
    // Sincronizar cambios pendientes
    await this.sincronizarCambiosPendientes();
    
    // Reactivar presencia
    if (this.usuarioActualId && this.embarqueActualId) {
      this.activarPresenciaEnEmbarque(this.embarqueActualId);
    }
    
    // Notificar a la UI
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('sincronizacion:online'));
    }
  },
  
  /**
   * Maneja el evento de pérdida de conexión
   */
  handleOffline() {
    Logger.info('SincronizacionService', 'Conexión perdida');
    this.online = false;
    
    // Notificar a la UI
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('sincronizacion:offline'));
    }
  },
  
  /**
   * Carga cambios pendientes desde localStorage
   */
  cargarCambiosPendientes() {
    try {
      const cambiosPendientesStr = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}cambios_pendientes`);
      if (cambiosPendientesStr) {
        this.cambiosPendientes = JSON.parse(cambiosPendientesStr);
        Logger.info('SincronizacionService', `Cambios pendientes cargados: ${this.cambiosPendientes.length}`);
      }
    } catch (error) {
      Logger.error('SincronizacionService', 'Error al cargar cambios pendientes', { error: error.message });
      this.cambiosPendientes = [];
    }
  },
  
  /**
   * Guarda cambios pendientes en localStorage
   */
  guardarCambiosPendientes() {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}cambios_pendientes`, JSON.stringify(this.cambiosPendientes));
      Logger.debug('SincronizacionService', `Cambios pendientes guardados: ${this.cambiosPendientes.length}`);
    } catch (error) {
      Logger.error('SincronizacionService', 'Error al guardar cambios pendientes', { error: error.message });
    }
  },
  
  /**
   * Sincroniza cambios pendientes cuando se recupera la conexión
   */
  async sincronizarCambiosPendientes() {
    if (this.cambiosPendientes.length === 0) {
      Logger.debug('SincronizacionService', 'No hay cambios pendientes para sincronizar');
      return;
    }
    
    Logger.info('SincronizacionService', `Sincronizando ${this.cambiosPendientes.length} cambios pendientes`);
    
    // Crear una copia de los cambios pendientes para trabajar con ellos
    const cambiosParaProcesar = [...this.cambiosPendientes];
    
    // Limpiar la lista original para evitar duplicados si ocurren nuevos cambios durante el proceso
    this.cambiosPendientes = [];
    this.guardarCambiosPendientes();
    
    // Contador de cambios aplicados y fallidos
    let cambiosAplicados = 0;
    let cambiosFallidos = 0;
    
    // Procesar cada cambio pendiente
    for (const cambio of cambiosParaProcesar) {
      try {
        await this.aplicarCambio(cambio);
        cambiosAplicados++;
        Logger.debug('SincronizacionService', `Cambio aplicado correctamente: ${cambio.tipo}`, { 
          embarqueId: cambio.embarqueId,
          productoId: cambio.productoId
        });
      } catch (error) {
        cambiosFallidos++;
        Logger.error('SincronizacionService', `Error al aplicar cambio: ${cambio.tipo}`, { 
          error: error.message,
          embarqueId: cambio.embarqueId,
          productoId: cambio.productoId
        });
        
        // Volver a agregar el cambio fallido a la lista de pendientes
        this.cambiosPendientes.push(cambio);
      }
    }
    
    // Guardar los cambios que no se pudieron aplicar
    if (this.cambiosPendientes.length > 0) {
      this.guardarCambiosPendientes();
    }
    
    // Notificar resultado
    Logger.info('SincronizacionService', 'Sincronización completada', {
      cambiosAplicados,
      cambiosFallidos,
      pendientesRestantes: this.cambiosPendientes.length
    });
    
    // Notificar a la UI
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('sincronizacion:cambios-sincronizados', {
        detail: {
          cambiosAplicados,
          cambiosFallidos,
          pendientesRestantes: this.cambiosPendientes.length
        }
      }));
    }
    
    return {
      cambiosAplicados,
      cambiosFallidos,
      pendientesRestantes: this.cambiosPendientes.length
    };
  },
  
  /**
   * Aplica un cambio pendiente a Firestore
   * @param {Object} cambio - Cambio a aplicar
   */
  async aplicarCambio(cambio) {
    if (!cambio || !cambio.tipo) {
      throw new Error('Cambio inválido o sin tipo definido');
    }
    
    Logger.debug('SincronizacionService', `Aplicando cambio: ${cambio.tipo}`, { 
      embarqueId: cambio.embarqueId,
      productoId: cambio.productoId || 'N/A'
    });
    
    switch (cambio.tipo) {
      case 'agregar_producto':
        if (!cambio.embarqueId || !cambio.producto) {
          throw new Error('Datos insuficientes para agregar producto');
        }
        await this.actualizarProductoEnFirestore(cambio.embarqueId, cambio.producto);
        break;
        
      case 'actualizar_producto':
        if (!cambio.embarqueId || !cambio.producto || !cambio.producto.id) {
          throw new Error('Datos insuficientes para actualizar producto');
        }
        await this.actualizarProductoEnFirestore(cambio.embarqueId, cambio.producto);
        break;
        
      case 'eliminar_producto':
        if (!cambio.embarqueId || !cambio.productoId) {
          throw new Error('Datos insuficientes para eliminar producto');
        }
        await this.eliminarProductoEnFirestore(cambio.embarqueId, cambio.productoId);
        break;
        
      case 'actualizar_embarque':
        if (!cambio.embarqueId || !cambio.datos) {
          throw new Error('Datos insuficientes para actualizar embarque');
        }
        
        const embarqueRef = doc(db, 'embarques', cambio.embarqueId);
        await updateDoc(embarqueRef, {
          ...cambio.datos,
          ultimaActualizacion: serverTimestamp()
        });
        break;
        
      case 'bloquear_producto':
        if (!cambio.embarqueId || !cambio.productoId) {
          throw new Error('Datos insuficientes para bloquear producto');
        }
        await this.bloquearProducto(cambio.embarqueId, cambio.productoId);
        break;
        
      case 'desbloquear_producto':
        if (!cambio.embarqueId || !cambio.productoId) {
          throw new Error('Datos insuficientes para desbloquear producto');
        }
        await this.desbloquearProducto(cambio.embarqueId, cambio.productoId);
        break;
        
      default:
        throw new Error(`Tipo de cambio no soportado: ${cambio.tipo}`);
    }
    
    return true;
  },
  
  /**
   * Observa un embarque en Firestore y notifica cambios
   * @param {String} embarqueId - ID del embarque a observar
   * @param {Function} callback - Función a llamar cuando hay cambios
   */
  observarEmbarque(embarqueId, callback) {
    // Limpiar suscripción anterior si existe
    this.dejarDeObservarEmbarque();
    
    // Guardar ID del embarque actual
    this.embarqueActualId = embarqueId;
    
    // Verificar si hay conexión
    if (!this.online) {
      Logger.warn('SincronizacionService', 'Intentando observar embarque sin conexión, cargando desde caché local');
      this.cargarEmbarqueCacheLocal(embarqueId, callback);
      return;
    }
    
    try {
      Logger.info('SincronizacionService', `Iniciando observación del embarque ${embarqueId}`);
      
      // Referencia al documento en Firestore
      const embarqueRef = doc(db, 'embarques', embarqueId);
      
      // Configurar suscripción a cambios
      this.embarqueUnsubscribe = onSnapshot(
        embarqueRef,
        { includeMetadataChanges: true },
        (snapshot) => {
          // Procesar datos del embarque
          const datos = snapshot.data();
          const metadatos = snapshot.metadata;
          
          // Procesar y validar el embarque
          this.procesarYValidarEmbarque(datos, metadatos, callback);
        },
        (error) => {
          Logger.error('SincronizacionService', `Error al observar embarque: ${error.message}`);
          console.error('Error al observar embarque:', error);
          
          // Intentar cargar desde caché local si hay error
          this.cargarEmbarqueCacheLocal(embarqueId, callback);
        }
      );
      
      // Observar bloqueos en tiempo real
      this.observarBloqueos(embarqueId);
      
      // Activar presencia en el embarque
      this.activarPresenciaEnEmbarque(embarqueId);
    } catch (error) {
      Logger.error('SincronizacionService', `Error al configurar observación: ${error.message}`);
      console.error('Error al configurar observación del embarque:', error);
      
      // Intentar cargar desde caché local si hay error
      this.cargarEmbarqueCacheLocal(embarqueId, callback);
    }
  },
  
  /**
   * Observa un embarque en la colección embarques2 en Firestore y notifica cambios
   * @param {String} embarqueId - ID del embarque a observar
   * @param {Function} callback - Función a llamar cuando hay cambios
   */
  observarEmbarque2(embarqueId, callback) {
    // Limpiar suscripción anterior si existe
    this.dejarDeObservarEmbarque();
    
    // Guardar ID del embarque actual con prefijo para identificar que es de embarques2
    this.embarqueActualId = `emb2_${embarqueId}`;
    
    // Verificar si hay conexión
    if (!this.online) {
      Logger.warn('SincronizacionService', 'Intentando observar embarque sin conexión, cargando desde caché local');
      this.cargarEmbarqueCacheLocal(this.embarqueActualId, callback);
      return;
    }
    
    try {
      Logger.info('SincronizacionService', `Iniciando observación del embarque ${embarqueId} en embarques2`);
      
      // Referencia al documento en Firestore
      const embarqueRef = doc(db, 'embarques2', embarqueId);
      
      // Configurar suscripción a cambios
      this.embarqueUnsubscribe = onSnapshot(
        embarqueRef,
        { includeMetadataChanges: true },
        (snapshot) => {
          // Procesar datos del embarque
          const datos = snapshot.data();
          const metadatos = snapshot.metadata;
          
          // Procesar y validar el embarque
          this.procesarYValidarEmbarque(datos, metadatos, callback);
        },
        (error) => {
          Logger.error('SincronizacionService', `Error al observar embarque en embarques2: ${error.message}`);
          console.error('Error al observar embarque en embarques2:', error);
          
          // Intentar cargar desde caché local si hay error
          this.cargarEmbarqueCacheLocal(this.embarqueActualId, callback);
        }
      );
      
      // Observar bloqueos en tiempo real
      this.observarBloqueos(embarqueId, true);
      
      // Activar presencia en el embarque
      this.activarPresenciaEnEmbarque(embarqueId, true);
    } catch (error) {
      Logger.error('SincronizacionService', `Error al configurar observación en embarques2: ${error.message}`);
      console.error('Error al configurar observación del embarque en embarques2:', error);
      
      // Intentar cargar desde caché local si hay error
      this.cargarEmbarqueCacheLocal(this.embarqueActualId, callback);
    }
  },
  
  /**
   * Activa la presencia del usuario en un embarque
   * @param {String} embarqueId - ID del embarque
   * @param {Boolean} esEmbarques2 - Indica si el embarque está en la colección embarques2
   */
  activarPresenciaEnEmbarque(embarqueId, esEmbarques2 = false) {
    if (!this.usuarioActualId || !this.usuarioActual) {
      Logger.warn('SincronizacionService', 'No se puede activar presencia sin usuario');
      return;
    }
    
    try {
      // Referencia a la lista de usuarios activos en el embarque
      const usuariosActivosRef = ref(rtdb, `usuarios_activos/${embarqueId}`);
      const miPresenciaRef = ref(rtdb, `usuarios_activos/${embarqueId}/${this.usuarioActualId}`);
      
      // Configurar limpieza al desconectar
      onDisconnect(miPresenciaRef).remove();
      
      // Establecer presencia
      set(miPresenciaRef, {
        username: this.usuarioActual.username,
        timestamp: rtdbServerTimestamp(),
        coleccion: esEmbarques2 ? 'embarques2' : 'embarques'
      });
      
      // Observar usuarios activos
      onValue(usuariosActivosRef, (snapshot) => {
        const usuarios = snapshot.val() || {};
        
        // Actualizar lista de usuarios activos
        this.usuariosActivos = Object.entries(usuarios).map(([id, data]) => ({
          id,
          username: data.username,
          timestamp: data.timestamp,
          coleccion: data.coleccion || 'embarques'
        }));
        
        Logger.info('SincronizacionService', `Usuarios activos en embarque ${embarqueId}: ${this.usuariosActivos.length}`);
      });
      
      Logger.info('SincronizacionService', `Presencia activada en embarque ${embarqueId}`);
    } catch (error) {
      Logger.error('SincronizacionService', `Error al activar presencia: ${error.message}`);
      console.error('Error al activar presencia en embarque:', error);
    }
  },
  
  /**
   * Desactiva la presencia del usuario en la base de datos en tiempo real
   */
  desactivarPresencia() {
    if (!this.usuarioActualId || !this.embarqueActualId) {
      Logger.debug('SincronizacionService', 'No hay presencia activa para desactivar');
      return;
    }
    
    Logger.info('SincronizacionService', 'Desactivando presencia');
    
    try {
      // Detener actualizaciones periódicas
      if (this.actividadInterval) {
        clearInterval(this.actividadInterval);
        this.actividadInterval = null;
      }
      
      // Eliminar referencia de presencia
      const presenceRef = ref(rtdb, `embarques/${this.embarqueActualId}/usuariosActivos/${this.usuarioActualId}`);
      remove(presenceRef);
      
      // Limpiar ID de embarque actual
      this.embarqueActualId = null;
      
      Logger.debug('SincronizacionService', 'Presencia desactivada correctamente');
    } catch (error) {
      Logger.error('SincronizacionService', 'Error al desactivar presencia', { error: error.message });
    }
  },
  
  /**
   * Procesa y valida un embarque asegurando que tenga la estructura correcta
   * @param {Object} datosEmbarque - Datos del embarque a procesar
   * @returns {Object} - Embarque con estructura válida
   */
  procesarYValidarEmbarque(datosEmbarque) {
    if (!datosEmbarque) {
      Logger.warn('SincronizacionService', 'Procesando embarque nulo, creando estructura básica');
      return {
        fecha: new Date().toISOString().split('T')[0],
        items: [],
        cargaCon: '',
        clienteActivo: '',
        bloqueado: false,
        ultimaActualizacion: new Date().toISOString()
      };
    }
    
    // Asegurarse de que tiene propiedades básicas
    const embarqueProcesado = { ...datosEmbarque };
    
    // Validar items
    if (!embarqueProcesado.items || !Array.isArray(embarqueProcesado.items)) {
      embarqueProcesado.items = [];
    }
    
    // Validar fecha
    if (!embarqueProcesado.fecha) {
      embarqueProcesado.fecha = new Date().toISOString().split('T')[0];
    }
    
    // Validar cargaCon
    if (!embarqueProcesado.cargaCon && embarqueProcesado.cargaCon !== '') {
      embarqueProcesado.cargaCon = '';
    }
    
    // Validar cliente activo
    if (!embarqueProcesado.clienteActivo && embarqueProcesado.clienteActivo !== '') {
      embarqueProcesado.clienteActivo = '';
    }
    
    // Validar estado de bloqueo
    if (embarqueProcesado.bloqueado === undefined) {
      embarqueProcesado.bloqueado = false;
    }
    
    return embarqueProcesado;
  },
  
  /**
   * Observa los bloqueos de productos en tiempo real
   * @param {String} embarqueId - ID del embarque
   * @param {Boolean} esEmbarques2 - Indica si el embarque está en la colección embarques2
   */
  observarBloqueos(embarqueId, esEmbarques2 = false) {
    try {
      // Referencia a los bloqueos del embarque
      const bloqueosRef = ref(rtdb, `bloqueos/${embarqueId}`);
      
      // Observar cambios en bloqueos
      onValue(bloqueosRef, (snapshot) => {
        const bloqueos = snapshot.val() || {};
        
        // Actualizar bloqueos locales
        this.bloqueos = bloqueos;
        
        Logger.info('SincronizacionService', `Bloqueos actualizados para embarque ${embarqueId} (${Object.keys(bloqueos).length} bloqueos)`);
      });
      
      Logger.info('SincronizacionService', `Observación de bloqueos iniciada para embarque ${embarqueId} en ${esEmbarques2 ? 'embarques2' : 'embarques'}`);
    } catch (error) {
      Logger.error('SincronizacionService', `Error al observar bloqueos: ${error.message}`);
      console.error('Error al observar bloqueos:', error);
    }
  },
  
  /**
   * Recarga un embarque desde Firestore
   * @param {String} embarqueId - ID del embarque a recargar
   * @param {Function} callback - Función a llamar con los datos recargados
   */
  async recargarEmbarque(embarqueId, callback) {
    try {
      Logger.info('SincronizacionService', `Recargando embarque ${embarqueId} desde Firestore`);
      
      // Determinar si es de la colección embarques2
      const esEmbarques2 = embarqueId.startsWith('emb2_');
      const idReal = esEmbarques2 ? embarqueId.replace('emb2_', '') : embarqueId;
      const coleccion = esEmbarques2 ? 'embarques2' : 'embarques';
      
      // Obtener referencia al documento
      const embarqueRef = doc(db, coleccion, idReal);
      
      // Obtener datos actualizados
      const docSnap = await getDoc(embarqueRef);
      
      if (docSnap.exists()) {
        // Procesar datos
        const datos = docSnap.data();
        
        // Guardar en caché local
        this.guardarEmbarqueCacheLocal(embarqueId, datos);
        
        // Procesar y validar el embarque
        this.procesarYValidarEmbarque(datos, null, callback);
        
        Logger.info('SincronizacionService', `Embarque ${embarqueId} recargado correctamente`);
        return true;
      } else {
        Logger.warn('SincronizacionService', `El embarque ${embarqueId} no existe en Firestore`);
        callback(null);
        return false;
      }
    } catch (error) {
      Logger.error('SincronizacionService', `Error al recargar embarque: ${error.message}`);
      console.error('Error al recargar embarque:', error);
      
      // Intentar cargar desde caché local si hay error
      this.cargarEmbarqueCacheLocal(embarqueId, callback);
      return false;
    }
  },
  
  /**
   * Guarda los datos de un embarque en la caché local
   * @param {String} embarqueId - ID del embarque a guardar
   * @param {Object} datosEmbarque - Datos del embarque
   */
  guardarEmbarqueCacheLocal(embarqueId, datosEmbarque) {
    if (!embarqueId || !datosEmbarque) {
      Logger.debug('SincronizacionService', 'No se puede guardar en caché: datos incompletos');
      return;
    }
    
    // Añadir timestamp para control de caché
    const embarqueParaCache = {
      ...datosEmbarque,
      _timestamp: Date.now()
    };
    
    // Guardar en localStorage
    try {
      const cacheKey = `${LOCAL_STORAGE_PREFIX}embarque_${embarqueId}`;
      localStorage.setItem(cacheKey, JSON.stringify(embarqueParaCache));
      Logger.debug('SincronizacionService', 'Caché local actualizada', {
        items: datosEmbarque.items?.length || 0
      });
    } catch (error) {
      Logger.error('SincronizacionService', 'Error al guardar en caché local', { error: error.message });
    }
  },
  
  /**
   * Deja de observar cambios en el embarque y libera recursos
   */
  dejarDeObservarEmbarque() {
    Logger.info('SincronizacionService', 'Deteniendo observación de embarque');
    
    // Cancelar suscripciones
    if (this.embarqueUnsubscribe) {
      this.embarqueUnsubscribe();
      this.embarqueUnsubscribe = null;
    }
    
    if (this.bloqueosUnsubscribe) {
      this.bloqueosUnsubscribe();
      this.bloqueosUnsubscribe = null;
    }
    
    // Remover listener de reconexión
    if (this.recargarDatosOnline) {
      window.removeEventListener('online', this.recargarDatosOnline);
      this.recargarDatosOnline = null;
    }
    
    // Desactivar presencia
    this.desactivarPresencia();
    
    // Limpiar ID de embarque actual
    this.embarqueActualId = null;
    
    // Resetear contador de intentos
    this.intentosReconexion = 0;
  },
  
  /**
   * Guarda cambios en el embarque (con manejo offline)
   * @param {String} embarqueId - ID del embarque
   * @param {Object} datosEmbarque - Datos actualizados del embarque
   */
  guardarCambiosEmbarque: debounce(async function(embarqueId, datosEmbarque) {
    // Si no está activo el guardado automático, no hacer nada
    if (!this.guardadoAutomaticoActivo) return;
    
    // Guardar en caché local
    try {
      localStorage.setItem(`embarque_${embarqueId}`, JSON.stringify({
        id: embarqueId,
        ...datosEmbarque
      }));
    } catch (error) {
      console.error("Error al guardar embarque en caché local:", error);
    }
    
    // Si estamos offline, agregar a la cola de cambios pendientes
    if (!this.online) {
      this.cambiosPendientes.push({
        tipo: 'actualizarMetadata',
        metadata: datosEmbarque,
        timestamp: new Date().toISOString()
      });
      this.guardarCambiosPendientes();
      return;
    }
    
    // Si estamos online, intentar actualizar directamente
    try {
      const embarqueRef = doc(db, "embarques", embarqueId);
      await updateDoc(embarqueRef, {
        ...datosEmbarque,
        ultimaActualizacion: serverTimestamp(),
        ultimoUsuario: this.usuarioActual.username
      });
      
      console.log('Cambios guardados automáticamente:', new Date().toLocaleString());
    } catch (error) {
      console.error("Error al guardar cambios:", error);
      // Si hay error, agregar a cambios pendientes
      this.cambiosPendientes.push({
        tipo: 'actualizarMetadata',
        metadata: datosEmbarque,
        timestamp: new Date().toISOString()
      });
      this.guardarCambiosPendientes();
    }
  }, 2000),
  
  /**
   * Agrega un producto a un embarque
   * @param {String} embarqueId - ID del embarque
   * @param {Object} producto - Datos del producto a agregar
   * @returns {Object} - Producto agregado con ID generado
   */
  agregarProducto(embarqueId, producto) {
    try {
      // Verificar si el embarqueId tiene el prefijo emb2_
      const esEmbarques2 = embarqueId.startsWith('emb2_');
      const idReal = esEmbarques2 ? embarqueId.replace('emb2_', '') : embarqueId;
      
      // Generar ID único para el producto
      const productoId = `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // Crear copia del producto con ID
      const productoConId = {
        ...producto,
        id: productoId,
        timestamp: new Date().toISOString()
      };
      
      // Agregar a la cola de cambios pendientes
      this.cambiosPendientes.push({
        tipo: 'agregar_producto',
        embarqueId: idReal,
        coleccion: esEmbarques2 ? 'embarques2' : 'embarques',
        producto: productoConId,
        timestamp: new Date().toISOString()
      });
      
      // Guardar cambios pendientes
      this.guardarCambiosPendientes();
      
      // Intentar sincronizar si hay conexión
      if (this.online) {
        this.sincronizarCambiosPendientes();
      }
      
      return productoConId;
    } catch (error) {
      Logger.error('SincronizacionService', `Error al agregar producto: ${error.message}`);
      console.error('Error al agregar producto:', error);
      return producto;
    }
  },
  
  /**
   * Actualiza un producto en un embarque
   * @param {String} embarqueId - ID del embarque
   * @param {Object} producto - Datos actualizados del producto
   * @returns {Promise<Boolean>} - true si se actualizó correctamente
   */
  async actualizarProducto(embarqueId, producto) {
    try {
      // Verificar si el embarqueId tiene el prefijo emb2_
      const esEmbarques2 = embarqueId.startsWith('emb2_');
      const idReal = esEmbarques2 ? embarqueId.replace('emb2_', '') : embarqueId;
      
      // Agregar a la cola de cambios pendientes
      this.cambiosPendientes.push({
        tipo: 'actualizar_producto',
        embarqueId: idReal,
        coleccion: esEmbarques2 ? 'embarques2' : 'embarques',
        producto: {
          ...producto,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
      
      // Guardar cambios pendientes
      this.guardarCambiosPendientes();
      
      // Intentar sincronizar si hay conexión
      if (this.online) {
        await this.sincronizarCambiosPendientes();
      }
      
      return true;
    } catch (error) {
      Logger.error('SincronizacionService', `Error al actualizar producto: ${error.message}`);
      console.error('Error al actualizar producto:', error);
      return false;
    }
  },
  
  /**
   * Actualiza un producto en Firestore
   * @param {String} embarqueId - ID del embarque
   * @param {Object} producto - Datos actualizados del producto
   * @returns {Promise<Boolean>} - true si se actualizó correctamente
   */
  async actualizarProductoEnFirestore(embarqueId, producto) {
    try {
      // Verificar si el embarqueId tiene el prefijo emb2_
      const esEmbarques2 = embarqueId.startsWith('emb2_');
      const idReal = esEmbarques2 ? embarqueId.replace('emb2_', '') : embarqueId;
      const coleccion = esEmbarques2 ? 'embarques2' : 'embarques';
      
      // Obtener referencia al documento
      const embarqueRef = doc(db, coleccion, idReal);
      
      // Verificar que el documento existe
      const docSnap = await getDoc(embarqueRef);
      
      if (!docSnap.exists()) {
        Logger.warn('SincronizacionService', `El embarque ${embarqueId} no existe en Firestore`);
        return false;
      }
      
      // Obtener datos actuales
      const embarqueData = docSnap.data();
      const items = embarqueData.items || [];
      
      // Buscar índice del producto
      const index = items.findIndex(item => item.id === producto.id);
      
      if (index === -1) {
        // Si no existe, agregarlo
        await updateDoc(embarqueRef, {
          items: [...items, producto],
          ultimaActualizacion: new Date().toISOString()
        });
      } else {
        // Si existe, actualizarlo
        const nuevosItems = [...items];
        nuevosItems[index] = producto;
        
        await updateDoc(embarqueRef, {
          items: nuevosItems,
          ultimaActualizacion: new Date().toISOString()
        });
      }
      
      Logger.info('SincronizacionService', `Producto ${producto.id} actualizado en Firestore`);
      return true;
    } catch (error) {
      Logger.error('SincronizacionService', `Error al actualizar producto en Firestore: ${error.message}`);
      console.error('Error al actualizar producto en Firestore:', error);
      return false;
    }
  },
  
  /**
   * Elimina un producto de un embarque
   * @param {String} embarqueId - ID del embarque
   * @param {String} productoId - ID del producto a eliminar
   * @returns {Promise<Boolean>} - true si se eliminó correctamente
   */
  async eliminarProducto(embarqueId, productoId) {
    try {
      // Verificar si el embarqueId tiene el prefijo emb2_
      const esEmbarques2 = embarqueId.startsWith('emb2_');
      const idReal = esEmbarques2 ? embarqueId.replace('emb2_', '') : embarqueId;
      
      // Agregar a la cola de cambios pendientes
      this.cambiosPendientes.push({
        tipo: 'eliminar_producto',
        embarqueId: idReal,
        coleccion: esEmbarques2 ? 'embarques2' : 'embarques',
        productoId,
        timestamp: new Date().toISOString()
      });
      
      // Guardar cambios pendientes
      this.guardarCambiosPendientes();
      
      // Intentar sincronizar si hay conexión
      if (this.online) {
        await this.sincronizarCambiosPendientes();
      }
      
      return true;
    } catch (error) {
      Logger.error('SincronizacionService', `Error al eliminar producto: ${error.message}`);
      console.error('Error al eliminar producto:', error);
      return false;
    }
  },
  
  /**
   * Elimina un producto en Firestore
   * @param {String} embarqueId - ID del embarque
   * @param {String} productoId - ID del producto a eliminar
   * @returns {Promise<Boolean>} - true si se eliminó correctamente
   */
  async eliminarProductoEnFirestore(embarqueId, productoId) {
    try {
      // Verificar si el embarqueId tiene el prefijo emb2_
      const esEmbarques2 = embarqueId.startsWith('emb2_');
      const idReal = esEmbarques2 ? embarqueId.replace('emb2_', '') : embarqueId;
      const coleccion = esEmbarques2 ? 'embarques2' : 'embarques';
      
      // Obtener referencia al documento
      const embarqueRef = doc(db, coleccion, idReal);
      
      // Verificar que el documento existe
      const docSnap = await getDoc(embarqueRef);
      
      if (!docSnap.exists()) {
        Logger.warn('SincronizacionService', `El embarque ${embarqueId} no existe en Firestore`);
        return false;
      }
      
      // Obtener datos actuales
      const embarqueData = docSnap.data();
      const items = embarqueData.items || [];
      
      // Filtrar el producto a eliminar
      const nuevosItems = items.filter(item => item.id !== productoId);
      
      // Actualizar documento
      await updateDoc(embarqueRef, {
        items: nuevosItems,
        ultimaActualizacion: new Date().toISOString()
      });
      
      Logger.info('SincronizacionService', `Producto ${productoId} eliminado de Firestore`);
      return true;
    } catch (error) {
      Logger.error('SincronizacionService', `Error al eliminar producto en Firestore: ${error.message}`);
      console.error('Error al eliminar producto en Firestore:', error);
      return false;
    }
  },
  
  /**
   * Bloquea un producto para edición
   * @param {String} embarqueId - ID del embarque
   * @param {String} productoId - ID del producto a bloquear
   * @returns {Promise<Boolean>} - true si se bloqueó correctamente
   */
  async bloquearProducto(embarqueId, productoId) {
    if (!this.usuarioActualId || !this.usuarioActual) {
      Logger.warn('SincronizacionService', 'No se puede bloquear sin usuario');
      return false;
    }
    
    try {
      // Verificar si el embarqueId tiene el prefijo emb2_
      const idReal = embarqueId.startsWith('emb2_') ? embarqueId.replace('emb2_', '') : embarqueId;
      
      // Verificar si ya está bloqueado por otro usuario
      const bloqueoExistente = this.obtenerBloqueo(embarqueId, productoId);
      if (bloqueoExistente && bloqueoExistente.userId !== this.usuarioActualId) {
        Logger.warn('SincronizacionService', `Producto ya bloqueado por ${bloqueoExistente.username}`);
        return false;
      }
      
      // Referencia al bloqueo
      const bloqueoRef = ref(rtdb, `bloqueos/${idReal}/${productoId}`);
      
      // Configurar limpieza al desconectar
      onDisconnect(bloqueoRef).remove();
      
      // Establecer bloqueo
      await set(bloqueoRef, {
        userId: this.usuarioActualId,
        username: this.usuarioActual.username,
        timestamp: rtdbServerTimestamp()
      });
      
      Logger.info('SincronizacionService', `Producto ${productoId} bloqueado correctamente`);
      return true;
    } catch (error) {
      Logger.error('SincronizacionService', `Error al bloquear producto: ${error.message}`);
      console.error('Error al bloquear producto:', error);
      return false;
    }
  },
  
  /**
   * Desbloquea un producto
   * @param {String} embarqueId - ID del embarque
   * @param {String} productoId - ID del producto a desbloquear
   * @returns {Promise<Boolean>} - true si se desbloqueó correctamente
   */
  async desbloquearProducto(embarqueId, productoId) {
    try {
      // Verificar si el embarqueId tiene el prefijo emb2_
      const idReal = embarqueId.startsWith('emb2_') ? embarqueId.replace('emb2_', '') : embarqueId;
      
      // Referencia al bloqueo
      const bloqueoRef = ref(rtdb, `bloqueos/${idReal}/${productoId}`);
      
      // Eliminar bloqueo
      await remove(bloqueoRef);
      
      Logger.info('SincronizacionService', `Producto ${productoId} desbloqueado correctamente`);
      return true;
    } catch (error) {
      Logger.error('SincronizacionService', `Error al desbloquear producto: ${error.message}`);
      console.error('Error al desbloquear producto:', error);
      return false;
    }
  },
  
  /**
   * Obtiene información de bloqueo de un producto
   * @param {String} embarqueId - ID del embarque
   * @param {String} productoId - ID del producto
   * @returns {Object|null} - Información del bloqueo o null si no está bloqueado
   */
  obtenerBloqueo(embarqueId, productoId) {
    // Verificar si el embarqueId tiene el prefijo emb2_
    const idReal = embarqueId.startsWith('emb2_') ? embarqueId.replace('emb2_', '') : embarqueId;
    
    // Verificar si hay bloqueos para este embarque
    if (!this.bloqueos || !this.bloqueos[productoId]) {
      return null;
    }
    
    // Retornar información del bloqueo
    return this.bloqueos[productoId];
  },
  
  /**
   * Utilidad para crear un arrayUnion de Firebase
   * @param {*} item - Item a agregar al array
   * @returns {*} - FieldValue.arrayUnion o el item original
   */
  firebaseArrayUnion(item) {
    return window.firebase?.firestore?.FieldValue?.arrayUnion(item) || item;
  },
  
  /**
   * Carga un embarque desde caché local
   * @param {String} embarqueId - ID del embarque
   * @param {Function} callback - Función a llamar con los datos
   */
  cargarEmbarqueCacheLocal(embarqueId, callback) {
    try {
      // Primero intentar usar la caché en memoria
      if (this.ultimoEmbarqueValido && this.ultimoEmbarqueValido.id === embarqueId) {
        Logger.info('SincronizacionService', 'Usando caché en memoria', {
          id: embarqueId,
          items: this.ultimoEmbarqueValido.items?.length || 0
        });
        
        callback(this.ultimoEmbarqueValido);
        return;
      }
      
      // Si no hay caché en memoria, intentar cargar desde localStorage
      const cacheKey = `${LOCAL_STORAGE_PREFIX}embarque_${embarqueId}`;
      const embarqueCacheStr = localStorage.getItem(cacheKey);
      
      if (embarqueCacheStr) {
        try {
          const datosCache = JSON.parse(embarqueCacheStr);
          
          // Validar que los datos de caché sean válidos
          if (!datosCache || typeof datosCache !== 'object') {
            Logger.warn('SincronizacionService', 'Datos de caché inválidos');
            callback(null);
            return;
          }
          
          // Validar y actualizar timestamp
          const timestamp = datosCache._timestamp || 0;
          const ahora = Date.now();
          const edad = ahora - timestamp;
          
          // Si la caché es demasiado antigua (más de 24 horas), no usarla
          if (edad > CACHE_DURACION_MAXIMA) {
            Logger.warn('SincronizacionService', 'Caché demasiado antigua, ignorando', { 
              edad: Math.round(edad / 3600000) + ' horas'
            });
            callback(null);
            return;
          }
          
          // Asegurarse de que tenga el ID correcto
          datosCache.id = embarqueId;
          
          Logger.info('SincronizacionService', 'Usando datos de caché local', {
            id: embarqueId,
            items: datosCache.items?.length || 0,
            edad: Math.round(edad / 60000) + ' minutos'
          });
          
          // Guardar en memoria también
          this.ultimoEmbarqueValido = datosCache;
          
          // Entregar datos
          callback(datosCache);
        } catch (parseError) {
          Logger.error('SincronizacionService', 'Error al analizar datos de caché', { 
            error: parseError.message 
          });
          callback(null);
        }
      } else {
        Logger.warn('SincronizacionService', 'No se encontraron datos en caché', { embarqueId });
        callback(null);
      }
    } catch (error) {
      Logger.error('SincronizacionService', 'Error al cargar embarque desde caché', { 
        error: error.message 
      });
      callback(null);
    }
  }
}; 