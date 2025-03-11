<template>
  <div class="firebase-verificacion">
    <h3>Diagnóstico de Conexión con Firebase</h3>
    
    <div class="estado-conexion">
      <div class="estado-item">
        <span class="label">Estado de conexión:</span>
        <span class="valor" :class="{ 'online': online, 'offline': !online }">
          {{ online ? 'Conectado' : 'Desconectado' }}
        </span>
      </div>
      
      <div class="estado-item">
        <span class="label">Firestore:</span>
        <span class="valor" :class="{ 'success': firestoreOk, 'error': !firestoreOk }">
          {{ firestoreOk ? 'Funcionando' : 'Error' }}
        </span>
      </div>
      
      <div class="estado-item">
        <span class="label">Realtime Database:</span>
        <span class="valor" :class="{ 'success': rtdbOk, 'error': !rtdbOk }">
          {{ rtdbOk ? 'Funcionando' : 'Error' }}
        </span>
      </div>
    </div>
    
    <div class="acciones">
      <button @click="verificarConexion" class="btn btn-primary" :disabled="verificando">
        <i class="fas fa-sync-alt" :class="{ 'fa-spin': verificando }"></i>
        {{ verificando ? 'Verificando...' : 'Verificar Conexión' }}
      </button>
      
      <button @click="probarEscritura" class="btn btn-success" :disabled="verificando || !firestoreOk">
        <i class="fas fa-save"></i> Probar Escritura
      </button>
      
      <button @click="probarLectura" class="btn btn-info" :disabled="verificando || !firestoreOk">
        <i class="fas fa-book-open"></i> Probar Lectura
      </button>
    </div>
    
    <div v-if="resultado" class="resultado" :class="resultadoTipo">
      <h4>Resultado:</h4>
      <pre>{{ resultado }}</pre>
    </div>
    
    <div v-if="error" class="error">
      <h4>Error:</h4>
      <pre>{{ error }}</pre>
    </div>
  </div>
</template>

<script>
import { db, rtdb } from '@/firebase';
import { collection, addDoc, getDocs, query, limit, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { ref, set, get, remove } from 'firebase/database';

export default {
  name: 'FirebaseVerificacion',
  data() {
    return {
      online: navigator.onLine,
      firestoreOk: false,
      rtdbOk: false,
      verificando: false,
      resultado: '',
      resultadoTipo: 'info',
      error: '',
      testDocId: null
    };
  },
  mounted() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Verificar estado inicial
    this.online = navigator.onLine;
    
    // Verificar conexión automáticamente al montar
    this.verificarConexion();
  },
  beforeDestroy() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    // Limpiar documento de prueba si existe
    this.limpiarDocumentoPrueba();
  },
  methods: {
    handleOnline() {
      this.online = true;
    },
    handleOffline() {
      this.online = false;
    },
    async verificarConexion() {
      this.verificando = true;
      this.resultado = '';
      this.error = '';
      this.resultadoTipo = 'info';
      
      try {
        // Verificar Firestore
        await this.verificarFirestore();
        
        // Verificar Realtime Database
        await this.verificarRTDB();
        
        this.resultado = 'Verificación completada. Firebase está correctamente configurado.';
        this.resultadoTipo = 'success';
      } catch (error) {
        this.error = `Error durante la verificación: ${error.message}`;
        console.error('Error durante la verificación:', error);
      } finally {
        this.verificando = false;
      }
    },
    async verificarFirestore() {
      try {
        // Intentar obtener documentos de una colección
        const querySnapshot = await getDocs(query(collection(db, 'embarques'), limit(1)));
        
        // Si llegamos aquí, Firestore está funcionando
        this.firestoreOk = true;
        return true;
      } catch (error) {
        console.error('Error al verificar Firestore:', error);
        this.firestoreOk = false;
        throw new Error(`Firestore no está disponible: ${error.message}`);
      }
    },
    async verificarRTDB() {
      try {
        // Intentar leer un nodo de la base de datos en tiempo real
        const statusRef = ref(rtdb, 'status');
        await get(statusRef);
        
        // Si llegamos aquí, RTDB está funcionando
        this.rtdbOk = true;
        return true;
      } catch (error) {
        console.error('Error al verificar Realtime Database:', error);
        this.rtdbOk = false;
        throw new Error(`Realtime Database no está disponible: ${error.message}`);
      }
    },
    async probarEscritura() {
      this.verificando = true;
      this.resultado = '';
      this.error = '';
      this.resultadoTipo = 'info';
      
      try {
        // Limpiar documento de prueba anterior si existe
        await this.limpiarDocumentoPrueba();
        
        // Crear un documento de prueba
        const docRef = await addDoc(collection(db, 'pruebas_conexion'), {
          mensaje: 'Prueba de escritura',
          timestamp: new Date().toISOString(),
          navegador: navigator.userAgent
        });
        
        this.testDocId = docRef.id;
        
        // Verificar que se creó correctamente
        const docSnap = await getDoc(doc(db, 'pruebas_conexion', docRef.id));
        
        if (docSnap.exists()) {
          this.resultado = `Escritura exitosa. Documento creado con ID: ${docRef.id}`;
          this.resultadoTipo = 'success';
        } else {
          throw new Error('El documento se creó pero no se pudo verificar su existencia');
        }
      } catch (error) {
        this.error = `Error al probar escritura: ${error.message}`;
        console.error('Error al probar escritura:', error);
      } finally {
        this.verificando = false;
      }
    },
    async probarLectura() {
      this.verificando = true;
      this.resultado = '';
      this.error = '';
      this.resultadoTipo = 'info';
      
      try {
        // Intentar leer los últimos 5 embarques
        const querySnapshot = await getDocs(query(collection(db, 'embarques'), limit(5)));
        
        const embarques = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          embarques.push({
            id: doc.id,
            fecha: data.fecha,
            items: data.items?.length || 0
          });
        });
        
        if (embarques.length > 0) {
          this.resultado = `Lectura exitosa. Se encontraron ${embarques.length} embarques:\n${JSON.stringify(embarques, null, 2)}`;
          this.resultadoTipo = 'success';
        } else {
          this.resultado = 'Lectura exitosa, pero no se encontraron embarques.';
          this.resultadoTipo = 'warning';
        }
      } catch (error) {
        this.error = `Error al probar lectura: ${error.message}`;
        console.error('Error al probar lectura:', error);
      } finally {
        this.verificando = false;
      }
    },
    async limpiarDocumentoPrueba() {
      if (this.testDocId) {
        try {
          await deleteDoc(doc(db, 'pruebas_conexion', this.testDocId));
          this.testDocId = null;
        } catch (error) {
          console.error('Error al limpiar documento de prueba:', error);
        }
      }
    }
  }
};
</script>

<style scoped>
.firebase-verificacion {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #343a40;
  font-size: 1.25rem;
  border-bottom: 1px solid #dee2e6;
  padding-bottom: 10px;
}

.estado-conexion {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.estado-item {
  background-color: white;
  padding: 10px;
  border-radius: 5px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.label {
  font-weight: 500;
  color: #495057;
  margin-bottom: 5px;
}

.valor {
  font-weight: 600;
  font-size: 1.1rem;
}

.online, .success {
  color: #28a745;
}

.offline, .error {
  color: #dc3545;
}

.acciones {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.btn {
  padding: 8px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 5px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-success {
  background-color: #28a745;
  color: white;
}

.btn-info {
  background-color: #17a2b8;
  color: white;
}

.resultado, .error {
  background-color: white;
  padding: 15px;
  border-radius: 5px;
  margin-top: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.resultado.success {
  border-left: 4px solid #28a745;
  color: #155724;
}

.resultado.warning {
  border-left: 4px solid #ffc107;
  color: #856404;
}

.resultado.info {
  border-left: 4px solid #17a2b8;
  color: #0c5460;
}

.error {
  border-left: 4px solid #dc3545;
  color: #721c24;
}

pre {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: monospace;
  font-size: 0.9rem;
  margin: 10px 0 0;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .estado-conexion {
    grid-template-columns: 1fr;
  }
  
  .acciones {
    flex-direction: column;
  }
}
</style> 