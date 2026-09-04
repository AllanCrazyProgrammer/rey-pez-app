// Terminal retro electrónica: bips cortos al escribir y dos notas ascendentes
// para confirmar botones y Enter. No requiere archivos ni red.
export function crearSonidosTerminal() {
  let contexto = null;
  let salida = null;
  let cerrado = false;
  let habilitado = true;
  let ultimoSonido = -Infinity;
  const muestras = {};

  function preparar() {
    if (cerrado || !habilitado) return null;
    try {
      if (!contexto) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return null;
        contexto = new AudioContext();
        salida = contexto.createGain();
        salida.gain.value = 0.22;
        salida.connect(contexto.destination);
      }
      if (contexto.state === 'suspended' || contexto.state === 'interrupted') {
        contexto.resume().catch(() => {});
      }
      return contexto;
    } catch (error) {
      // El audio es opcional: nunca debe interrumpir la edición del embarque.
      return null;
    }
  }

  function crearMuestra(tipo) {
    const esApertura = tipo === 'apertura';
    const esBoton = tipo === 'boton';
    const esBorrado = tipo === 'borrar';
    const esExplosion = tipo === 'explosion';
    const esMisionCumplida = tipo === 'mision-cumplida';
    const duracion = esApertura ? 4.65 : (esMisionCumplida ? 1.25 : (esExplosion ? 0.62 : (esBoton ? 0.13 : (esBorrado ? 0.075 : 0.038))));
    const buffer = contexto.createBuffer(1, Math.ceil(contexto.sampleRate * duracion), contexto.sampleRate);
    const datos = buffer.getChannelData(0);
    const iniciosPing = [0.12, 1.18, 2.38, 3.55, 4.18];
    const frecuenciasPing = [523.25, 659.25, 783.99, 880, 1046.5];
    let ruidoExplosionSuave = 0;
    for (let i = 0; i < datos.length; i++) {
      const t = i / contexto.sampleRate;

      if (esApertura) {
        // Firma de apertura: pulso grave de sonar, barrido acuático y cinco
        // confirmaciones ascendentes. Todo se sintetiza localmente.
        const entrada = Math.min(1, t / 0.045);
        const salidaLenta = Math.max(0, Math.min(1, (duracion - t) / 0.42));
        const frecuenciaBase = 72 + (t / duracion) * 34;
        const pulsoProfundo = Math.sin(2 * Math.PI * frecuenciaBase * t) * 0.09;
        const corriente = Math.sin(2 * Math.PI * (138 + Math.sin(t * 2.4) * 12) * t) * 0.025;
        const barrido = Math.sin(2 * Math.PI * (245 + t * 185) * t) * 0.028;

        let pings = 0;
        for (let indice = 0; indice < iniciosPing.length; indice++) {
          const tiempoPing = t - iniciosPing[indice];
          if (tiempoPing >= 0 && tiempoPing < 0.3) {
            const envolvente = Math.exp(-tiempoPing * 14) * Math.min(1, tiempoPing / 0.006);
            const frecuencia = frecuenciasPing[indice];
            pings += Math.sin(2 * Math.PI * frecuencia * tiempoPing) * envolvente * 0.19;
            pings += Math.sin(2 * Math.PI * frecuencia * 2.01 * tiempoPing) * envolvente * 0.035;
          }
        }

        datos[i] = (pulsoProfundo + corriente + barrido + pings) * entrada * salidaLenta;
        continue;
      }

      if (esExplosion) {
        // Explosión electrónica controlada: destello digital, impacto grave y
        // una cola de ruido filtrado para conservar el carácter de terminal.
        const ruido = Math.random() * 2 - 1;
        ruidoExplosionSuave += 0.13 * (ruido - ruidoExplosionSuave);
        const ataque = Math.min(1, t / 0.002);
        const cola = Math.exp(-t * 7.2);
        const faseGrave = 2 * Math.PI * (116 * t - 58 * t * t);
        const impacto = Math.sin(faseGrave) * Math.exp(-t * 10) * 0.36;
        const estruendo = ruidoExplosionSuave * cola * 0.42;
        const destello = t < 0.07
          ? Math.sin(2 * Math.PI * (1380 * t - 5200 * t * t)) * Math.exp(-t * 48) * 0.2
          : 0;
        const pulsoFinal = t > 0.17
          ? Math.sin(2 * Math.PI * 196 * (t - 0.17)) * Math.exp(-(t - 0.17) * 12) * 0.1
          : 0;
        const cierre = Math.min(1, (duracion - t) / 0.055);
        datos[i] = (impacto + estruendo + destello + pulsoFinal) * ataque * cierre;
        continue;
      }

      if (esMisionCumplida) {
        // Arpegio mayor ascendente y acorde final: una confirmación musical
        // breve que comunica logro sin necesidad de una voz grabada.
        const inicios = [0, 0.15, 0.3, 0.45];
        const frecuencias = [523.25, 659.25, 783.99, 1046.5];
        let fanfarria = 0;
        for (let indice = 0; indice < inicios.length; indice++) {
          const tiempoNota = t - inicios[indice];
          if (tiempoNota >= 0 && tiempoNota < 0.19) {
            const envolvente = Math.min(1, tiempoNota / 0.006) *
              Math.min(1, (0.19 - tiempoNota) / 0.045);
            const fase = 2 * Math.PI * frecuencias[indice] * tiempoNota;
            fanfarria += (Math.sin(fase) * 0.19 + Math.sin(fase * 2) * 0.035) * envolvente;
          }
        }

        const tiempoAcorde = t - 0.64;
        if (tiempoAcorde >= 0 && tiempoAcorde < 0.61) {
          const entrada = Math.min(1, tiempoAcorde / 0.012);
          const salida = Math.min(1, (0.61 - tiempoAcorde) / 0.13);
          const brillo = Math.exp(-tiempoAcorde * 1.4);
          const acorde = [523.25, 659.25, 783.99, 1046.5].reduce((suma, frecuencia, indice) => {
            const fase = 2 * Math.PI * frecuencia * tiempoAcorde;
            return suma + Math.sin(fase) * (indice === 3 ? 0.1 : 0.075);
          }, 0);
          fanfarria += acorde * entrada * salida * brillo;
        }
        datos[i] = fanfarria;
        continue;
      }

      // Los botones ascienden, borrar desciende y escribir produce un único bip.
      const segundaNota = (esBoton && t >= 0.065) || (esBorrado && t >= 0.036);
      const tiempoNota = segundaNota ? t - (esBoton ? 0.065 : 0.036) : t;
      const duracionNota = esBoton ? 0.055 : (esBorrado ? 0.032 : duracion);
      if (tiempoNota >= duracionNota) continue;
      const frecuencia = esBoton
        ? (segundaNota ? 1046.5 : 784)
        : (esBorrado ? (segundaNota ? 659.25 : 987.77) : 1174.7);
      const fase = 2 * Math.PI * frecuencia * tiempoNota;
      // Armónicos limitados dan un timbre digital sin un agudo estridente.
      const onda = Math.sin(fase) * 0.34 +
        Math.sin(fase * 3) * 0.065 + Math.sin(fase * 5) * 0.025;
      const ataque = Math.min(1, tiempoNota / 0.003);
      const cierre = Math.min(1, (duracionNota - tiempoNota) / 0.012);
      datos[i] = onda * ataque * cierre;
    }
    return buffer;
  }

  function reproducir(tipo = 'tecla') {
    const audio = preparar();
    if (!audio) return;
    try {
      // Evita acumular sonidos cuando se repiten eventos muy rápidamente.
      if (audio.currentTime - ultimoSonido < 0.025) return;
      ultimoSonido = audio.currentTime;
      // Cada acción conserva el tono estable de una terminal electrónica.
      if (!muestras[tipo]) muestras[tipo] = crearMuestra(tipo);
      const fuente = audio.createBufferSource();
      fuente.buffer = muestras[tipo];
      fuente.connect(salida);
      fuente.onended = () => fuente.disconnect();
      fuente.start();
    } catch (error) {
      // Navegadores sin audio disponible siguen funcionando normalmente.
    }
  }

  return {
    preparar,
    reproducir,
    habilitar(valor) {
      habilitado = valor;
      if (salida) salida.gain.value = valor ? 0.22 : 0;
    },
    cerrar() {
      cerrado = true;
      if (contexto && contexto.state !== 'closed') contexto.close().catch(() => {});
    }
  };
}
