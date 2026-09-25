import { getFirestore, collection, doc, getDoc, getDocs, onSnapshot } from 'firebase/firestore';
import { normalizarFechaISO } from '@/utils/dateUtils';
import { compararPreciosMasAntiguosPrimero } from '@/utils/preciosHistoricos';

export const embarqueDatosMixin = {
  data() {
    return {
      unsubscribePreciosActuales: null,
    };
  },

  methods: {
    async guardarClientesPersonalizados() {
      localStorage.setItem('clientesPersonalizados', JSON.stringify(this.clientesPersonalizados));

      if (!this.embarqueId) return;

      await this.guardarCambiosEnTiempoReal(true);
    },

    async cargarClientesPersonalizados() {
      if (this.embarqueId) return; // The shipment snapshot is authoritative, even offline.
      if (this.embarqueId && !this.hasPendingChanges && navigator.onLine) {
        try {
          const db = getFirestore();
          const embarqueDoc = await getDoc(doc(db, 'embarques', this.embarqueId));
          if (embarqueDoc.exists()) {
            const data = embarqueDoc.data();
            if (data.clientesPersonalizados && Array.isArray(data.clientesPersonalizados)) {
              this.clientesPersonalizados = data.clientesPersonalizados;
              localStorage.setItem('clientesPersonalizados', JSON.stringify(this.clientesPersonalizados));
              return;
            }
          }
        } catch (error) {
          console.error('[cargarClientesPersonalizados] Error al cargar desde Firebase:', error);
        }
      }

      const clientesGuardados = localStorage.getItem('clientesPersonalizados');
      if (clientesGuardados) {
        try {
          this.clientesPersonalizados = JSON.parse(clientesGuardados);
        } catch (error) {
          console.error('[cargarClientesPersonalizados] Error al parsear localStorage:', error);
          this.clientesPersonalizados = [];
        }
      }
    },

    aplicarSnapshotPrecios(preciosSnapshot) {
      const precios = preciosSnapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        timestamp: d.data().timestamp || 0,
        fecha: normalizarFechaISO(d.data().fecha),
      }));

      // Firestore excluye documentos que no tienen un campo usado en
      // orderBy. Ordenar aquí permite incluir también todo el historial
      // legado sin timestamp.
      this.preciosActuales = precios.sort((a, b) => compararPreciosMasAntiguosPrimero(b, a));

      const sinTimestamp = this.preciosActuales.filter(p => !p.timestamp || p.timestamp === 0);
      if (sinTimestamp.length > 0) {
        console.warn(`[cargarPreciosActuales] ${sinTimestamp.length} precios sin timestamp`);
      }
    },

    async cargarPreciosActuales() {
      try {
        const db = getFirestore();
        const preciosRef = collection(db, 'precios');
        const preciosSnapshot = await getDocs(preciosRef);
        this.aplicarSnapshotPrecios(preciosSnapshot);
      } catch (error) {
        console.error('[cargarPreciosActuales] Error:', error);
        // Conservar el último catálogo conocido (incluido el snapshot offline)
        // en vez de vaciarlo y dejar productos sin referencia de precio.
      }
    },

    iniciarEscuchaPreciosActuales() {
      if (this.unsubscribePreciosActuales) return Promise.resolve();

      const db = getFirestore();
      const preciosRef = collection(db, 'precios');

      return new Promise((resolve) => {
        let primeraRespuesta = true;
        this.unsubscribePreciosActuales = onSnapshot(preciosRef, (snapshot) => {
          // Si estamos sin conexión y no existe caché de precios, conservar el
          // catálogo que venía en el snapshot offline del embarque.
          const conservarCatalogoOffline = snapshot.empty &&
            snapshot.metadata.fromCache &&
            this.preciosActuales.length > 0;
          if (!conservarCatalogoOffline) {
            this.aplicarSnapshotPrecios(snapshot);
          }
          if (primeraRespuesta) {
            primeraRespuesta = false;
            resolve();
          }
        }, (error) => {
          console.error('[escucharPreciosActuales] Error:', error);
          if (primeraRespuesta) {
            primeraRespuesta = false;
            resolve();
          }
        });
      });
    },

    detenerEscuchaPreciosActuales() {
      if (this.unsubscribePreciosActuales) {
        this.unsubscribePreciosActuales();
        this.unsubscribePreciosActuales = null;
      }
    },

    async onPrecioAgregado(nuevoPrecio) {
      await this.cargarPreciosActuales();
    },
  },
};
