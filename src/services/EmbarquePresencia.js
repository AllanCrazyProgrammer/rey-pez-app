import { ref, onValue, onDisconnect, set, remove, serverTimestamp } from 'firebase/database';
import { v4 as uuid } from 'uuid';
import { claveCampo, normalizarCampo, editoresVigentes } from '@/utils/embarquePresencia';

// Una instancia pertenece a una vista/ventana. Ningún cierre puede retirar
// otra ventana de la misma cuenta. Nunca transporta valores de los inputs.
export function crearPresenciaEmbarque({ db, embarqueId, userId, username, alCambiar, alEstado }) {
  const sesionId = uuid();
  const sala = ref(db, `presenciaEmbarques/${embarqueId}/sesiones`);
  const propia = ref(db, `presenciaEmbarques/${embarqueId}/sesiones/${sesionId}`);
  let cerrada = false, conectado = false, preparada = false, generacion = 0;
  let valores = {}, desfase = 0, campo = null, escribiendo = false;
  let pendiente = false, publicando = false, timerEntrada = null, timerPublicacion = null;
  let limpieza = null;
  let ultimaPublicacion = 0;
  const desconexion = onDisconnect(propia);
  const estado = valor => { if (!cerrada) alEstado(valor); };
  const mostrar = () => { if (!cerrada) alCambiar(conectado ? editoresVigentes(valores, sesionId, Date.now() + desfase) : []); };
  const publicar = async () => {
    if (cerrada || !conectado || !preparada || publicando) return;
    publicando = true;
    pendiente = false;
    ultimaPublicacion = Date.now();
    try {
      await set(propia, { userId, username, campo, escribiendo, actualizadoEn: serverTimestamp() });
      if (conectado) estado('conectado');
    } catch (_) { estado('error'); }
    finally {
      publicando = false;
      if (pendiente) programar();
    }
  };
  const programar = () => {
    pendiente = true;
    if (cerrada || !conectado || !preparada || timerPublicacion || publicando) return;
    // Coalescer cambios rápidos de foco; una sola escritura pendiente.
    timerPublicacion = setTimeout(() => { timerPublicacion = null; publicar(); }, 100);
  };
  const retirar = () => {
    // Conservar onDisconnect hasta confirmar remove, incluso al estar offline.
    // Una inscripción que termine tarde vuelve a retirar esta misma sesión.
    const intento = remove(propia).then(() => desconexion.cancel());
    limpieza = intento.catch(() => { limpieza = null; });
    return limpieza;
  };
  const bajas = [
    onValue(ref(db, '.info/serverTimeOffset'), snap => { desfase = Number(snap.val()) || 0; mostrar(); }),
    onValue(sala, snap => { valores = snap.val() || {}; mostrar(); }, () => estado('error')),
    onValue(ref(db, '.info/connected'), async snap => {
      conectado = snap.val() === true;
      preparada = false;
      const turno = ++generacion;
      estado(conectado ? 'conectando' : 'desconectado');
      mostrar();
      if (!conectado) return;
      try {
        // Registrar limpieza ANTES de publicar y renovarla en cada conexión.
        await desconexion.remove();
        if (cerrada) { retirar(); return; }
        if (turno !== generacion || !conectado) return;
        preparada = true;
        programar();
      } catch (_) { estado('error'); }
    }),
  ];
  const heartbeat = setInterval(() => { mostrar(); programar(); }, 30000);
  const expiracion = setInterval(mostrar, 1000);
  return {
    sesionId,
    enfocar(destino, entrada = false) {
      if (cerrada) return;
      const siguiente = normalizarCampo(destino);
      const cambio = claveCampo(campo) !== claveCampo(siguiente);
      campo = siguiente;
      if (timerEntrada) clearTimeout(timerEntrada);
      timerEntrada = null;
      const antes = escribiendo;
      escribiendo = Boolean(entrada && campo);
      if (escribiendo) timerEntrada = setTimeout(() => {
        timerEntrada = null; escribiendo = false; programar();
      }, 1500);
      if (cambio || antes !== escribiendo || (entrada && Date.now() - ultimaPublicacion >= 1000)) programar();
    },
    detener() {
      if (cerrada) return limpieza || retirar();
      cerrada = true; generacion++;
      bajas.forEach(baja => baja());
      clearInterval(heartbeat); clearInterval(expiracion);
      clearTimeout(timerEntrada); clearTimeout(timerPublicacion);
      alCambiar([]);
      return retirar();
    },
  };
}
