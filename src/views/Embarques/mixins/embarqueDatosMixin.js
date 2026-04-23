import { getFirestore, collection, doc, getDoc, updateDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { normalizarFechaISO } from '@/utils/dateUtils';

export const embarqueDatosMixin = {
  methods: {
    async guardarClientesPersonalizados() {
      localStorage.setItem('clientesPersonalizados', JSON.stringify(this.clientesPersonalizados));

      if (!this.embarqueId) return;

      try {
        const operacionGuardado = async () => {
          const db = getFirestore();
          await updateDoc(doc(db, 'embarques', this.embarqueId), {
            clientesPersonalizados: this.clientesPersonalizados,
            ultimaActualizacionClientes: serverTimestamp(),
          });
        };

        if (this.saveManager) {
          await this.saveManager.scheduleSave(
            `clientes-personalizados-${this.embarqueId}`,
            operacionGuardado,
            { priority: 'high', merge: false, immediate: true }
          );
        } else {
          await operacionGuardado();
        }
      } catch (error) {
        console.error('[guardarClientesPersonalizados] Error:', error);
      }
    },

    async cargarClientesPersonalizados() {
      if (this.embarqueId) {
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

    async cargarPreciosActuales() {
      try {
        const db = getFirestore();
        const preciosRef = collection(db, 'precios');

        const preciosSnapshotSimple = await getDocs(preciosRef);
        if (preciosSnapshotSimple.size === 0) {
          this.preciosActuales = [];
          return;
        }

        let preciosSnapshot;
        try {
          preciosSnapshot = await getDocs(
            query(preciosRef, orderBy('fecha', 'desc'), orderBy('timestamp', 'desc'))
          );
        } catch {
          preciosSnapshot = await getDocs(query(preciosRef, orderBy('fecha', 'desc')));
        }

        this.preciosActuales = preciosSnapshot.docs.map(d => ({
          id: d.id,
          ...d.data(),
          timestamp: d.data().timestamp || 0,
          fecha: normalizarFechaISO(d.data().fecha),
        }));

        const sinTimestamp = this.preciosActuales.filter(p => !p.timestamp || p.timestamp === 0);
        if (sinTimestamp.length > 0) {
          console.warn(`[cargarPreciosActuales] ${sinTimestamp.length} precios sin timestamp`);
        }
      } catch (error) {
        console.error('[cargarPreciosActuales] Error:', error);
        this.preciosActuales = [];
      }
    },

    async onPrecioAgregado(nuevoPrecio) {
      await this.cargarPreciosActuales();
    },
  },
};
