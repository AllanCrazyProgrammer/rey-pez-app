// Punto de entrada único para toda la generación de PDF.
// Nuevos componentes deben importar desde aquí en lugar de acceder a utils/ directamente.

export { generarNotaVentaPDF, generarNotaVentaSinPreciosPDF } from '@/utils/pdfGenerator';
export { generarResumenEmbarquePDF } from '@/utils/pdf/resumenEmbarque';
export { generarResumenTarasPDF } from '@/utils/pdf/resumenTaras';
export {
  generarResumenMedidasSacadaPDF,
  normalizarGruposListaMedidasParaPdf,
  buildResumenMedidasSacadaContent,
  estilosResumenMedidasSacada,
  TITULO_RESUMEN_MEDIDAS_SACADA_DEFAULT,
  TITULO_RESUMEN_MEDIDAS_DESDE_RENDIMIENTOS,
} from '@/utils/pdf/sacadas';
export { generarPDFRendimientos } from '@/utils/pdf/index';
export { generarReporteCuentasVeronica } from '@/utils/pdf/generarReporteCuentasVeronica';
