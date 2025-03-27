export default {
  methods: {
    // Calcular el total de taras de un producto
    totalTaras(producto) {
      const tarasNormales = (producto.taras || []).reduce(
        (sum, tara) => sum + (tara || 0),
        0
      );
      const tarasExtra = (producto.tarasExtra || []).reduce(
        (sum, tara) => sum + (tara || 0),
        0
      );
      return tarasNormales + tarasExtra;
    },

    // Calcular el total de kilos de un producto
    totalKilos(producto) {
      const sumaKilos = (producto.kilos || []).reduce(
        (sum, kilo) => sum + (kilo || 0),
        0
      );
      const sumaTarasNormales = (producto.taras || []).reduce(
        (sum, tara) => sum + (tara || 0),
        0
      );
      // No incluimos las taras extra en el descuento
      const descuentoTaras = producto.restarTaras ? sumaTarasNormales * 3 : 0;
      const resultado = Number((sumaKilos - descuentoTaras).toFixed(1));
      return resultado;
    },

    // Calcular kilos para productos con agua (c/h20)
    calcularKilosProductoCH20(producto) {
      const reporteTaras = producto.reporteTaras || [];
      const reporteBolsas = producto.reporteBolsas || [];
      let sumaTotalKilos = 0;

      // Verificar si hay datos de reporteTaras y reporteBolsas
      if (reporteTaras.length > 0 && reporteBolsas.length > 0) {
        for (let i = 0; i < reporteTaras.length; i++) {
          const taras = parseInt(reporteTaras[i]) || 0;
          const bolsa = parseInt(reporteBolsas[i]) || 0;
          sumaTotalKilos += taras * bolsa;
        }

        // Asegurarnos de que camaronNeto no sea 0
        const valorNeto =
          producto.camaronNeto && producto.camaronNeto > 0
            ? producto.camaronNeto
            : 0.65;
        return sumaTotalKilos * valorNeto;
      } else {
        // Si no hay datos de reporteTaras o reporteBolsas, usar los kilos directamente
        const kilos = (producto.kilos || []).reduce(
          (sum, kilo) => sum + (Number(kilo) || 0),
          0
        );

        // Multiplicar por el valor neto
        const valorNeto =
          producto.camaronNeto && producto.camaronNeto > 0
            ? producto.camaronNeto
            : 0.65;
        return kilos * valorNeto;
      }
    },

    // Calcular kilos para productos crudos
    calcularKilosCrudos(item) {
      let kilosTotales = 0;

      // Procesar taras
      if (item.taras) {
        // Verificar si la tara tiene formato "5-19" o similar
        const formatoGuion = /^(\d+)-(\d+)$/.exec(item.taras);
        if (formatoGuion) {
          const cantidad = parseInt(formatoGuion[1]) || 0;
          let medida = parseInt(formatoGuion[2]) || 0;

          // Si la medida es 19, sustituirla por 20
          if (medida === 19) {
            medida = 20;
          }

          kilosTotales += cantidad * medida;
        } else {
          // Formato original si no coincide con el patrón
          const [cantidad, medida] = item.taras.split("-").map(Number);
          kilosTotales += cantidad * medida;
        }
      }

      // Procesar sobrante
      if (item.sobrante) {
        // Verificar si el sobrante tiene formato "5-19" o similar
        const formatoGuion = /^(\d+)-(\d+)$/.exec(item.sobrante);
        if (formatoGuion) {
          const cantidadSobrante = parseInt(formatoGuion[1]) || 0;
          let medidaSobrante = parseInt(formatoGuion[2]) || 0;

          // Si la medida es 19, sustituirla por 20
          if (medidaSobrante === 19) {
            medidaSobrante = 20;
          }

          kilosTotales += cantidadSobrante * medidaSobrante;
        } else {
          // Formato original si no coincide con el patrón
          const [cantidadSobrante, medidaSobrante] = item.sobrante
            .split("-")
            .map(Number);
          kilosTotales += cantidadSobrante * medidaSobrante;
        }
      }

      return kilosTotales;
    },

    // Calcular taras para productos crudos
    calcularTarasCrudos(item) {
      let totalTaras = 0;
      if (item.taras) {
        const [cantidad] = item.taras.split("-").map(Number);
        totalTaras += cantidad;
      }
      if (item.sobrante) {
        const [cantidadSobrante] = item.sobrante.split("-").map(Number);
        totalTaras += cantidadSobrante;
      }
      return totalTaras;
    },

    // Combinar taras y bolsas para reportes
    combinarTarasBolsas(taras, bolsas) {
      const combinado = {};

      taras.forEach((tara, index) => {
        const bolsa = bolsas[index] || "";
        const key = bolsa;
        combinado[key] = (combinado[key] || 0) + parseInt(tara || 1);
      });

      return Object.entries(combinado)
        .map(([bolsa, count]) => `(${count}-${bolsa})`)
        .join(" ");
    },

    // Calcular taras reportadas
    totalTarasReportadas(producto) {
      return (producto.reporteTaras || []).reduce((total, tara) => {
        return total + (parseInt(tara) || 0);
      }, 0);
    },

    // Calcular bolsas reportadas
    totalBolsasReportadas(producto) {
      return (producto.reporteTaras || []).reduce((total, tara, index) => {
        const taraNum = parseInt(tara) || 0;
        const bolsaNum = parseInt(producto.reporteBolsas[index]) || 0;
        return total + taraNum * bolsaNum;
      }, 0);
    },

    // Verificar si las taras coinciden
    coincideTaras(producto) {
      const totalReportadas = this.totalTarasReportadas(producto);
      const totalRegistradas = this.totalTaras(producto);
      return totalReportadas === totalRegistradas;
    },

    // Validar si coinciden taras y bolsas
    coincideTarasYBolsas(producto) {
      const totalTarasRegistradas = this.totalTaras(producto);
      const totalTarasReportadas = this.totalTarasReportadas(producto);

      // Si no hay taras registradas ni reportadas, retornar false
      if (totalTarasRegistradas === 0 && totalTarasReportadas === 0) {
        return false;
      }

      return totalTarasRegistradas === totalTarasReportadas;
    },

    // Verificar si un producto tiene algún reporte
    tieneAlgunReporte(producto) {
      return (
        (producto.reporteTaras || []).some((tara) => tara) ||
        (producto.reporteBolsas || []).some((bolsa) => bolsa)
      );
    },

    // Formatear kilos para mostrar
    formatearKilos(kilos) {
      return kilos.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      });
    },

    // Comparar medidas para ordenamiento
    compararMedidas(medidaA, medidaB) {
      // Si alguna medida es vacía o undefined, ponerla al final
      if (!medidaA) return 1;
      if (!medidaB) return -1;

      // Función auxiliar para extraer números de una medida
      const extraerNumeros = (medida) => {
        const numeros = medida.match(/\d+/g);
        if (!numeros) return [0, 0];
        if (numeros.length === 1)
          return [parseInt(numeros[0]), parseInt(numeros[0])];
        return [parseInt(numeros[0]), parseInt(numeros[1])];
      };

      // Extraer los números de las medidas
      const [minA, maxA] = extraerNumeros(medidaA);
      const [minB, maxB] = extraerNumeros(medidaB);

      // Si ambas medidas tienen números, comparar por el número menor
      if (minA && minB) {
        return minA - minB;
      }

      // Si no tienen números, comparar alfabéticamente
      return medidaA.localeCompare(medidaB);
    },

    // Formatear una talla de crudo
    formatearTallaCrudo(talla) {
      const abreviaturas = {
        "Med c/c": "Med",
        "Med-Esp c/c": "Esp",
        "Med-gde c/c": "M-G",
        "Gde c/c": "Gde",
        "Extra c/c": "Ext",
        "Jumbo c/c": "Jbo",
        Linea: "Lin",
        Rechazo: "Rch",
      };
      return abreviaturas[talla] || talla;
    },
  },
};
