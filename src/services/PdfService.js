/**
 * Servicio para manejar la generación de PDFs
 * Utiliza importaciones dinámicas para cargar las dependencias solo cuando se necesitan
 */
export default {
  /**
   * Genera una nota de venta en PDF
   * @param {Object} datos - Datos para generar la nota de venta
   * @returns {Promise<Blob>} - Blob del PDF generado
   */
  async generarNotaVentaPDF(datos) {
    try {
      // Importar dinámicamente las dependencias
      const { generarNotaVentaPDF } = await import('@/utils/pdfGenerator');
      const jsPDFModule = await import('jspdf');
      await import('jspdf-autotable');
      
      // Generar el PDF
      return await generarNotaVentaPDF(datos, jsPDFModule);
    } catch (error) {
      console.error("Error al generar nota de venta PDF:", error);
      throw error;
    }
  },
  
  /**
   * Genera un resumen de taras en PDF
   * @param {Object} datos - Datos para generar el resumen de taras
   * @returns {Promise<Blob>} - Blob del PDF generado
   */
  async generarResumenTarasPDF(datos) {
    try {
      // Importar dinámicamente las dependencias
      const { generarResumenTarasPDF } = await import('@/utils/resumenTarasPdf');
      const jsPDFModule = await import('jspdf');
      await import('jspdf-autotable');
      
      // Generar el PDF
      return await generarResumenTarasPDF(datos, jsPDFModule);
    } catch (error) {
      console.error("Error al generar resumen de taras PDF:", error);
      throw error;
    }
  },
  
  /**
   * Genera un resumen de embarque en PDF
   * @param {Object} datos - Datos para generar el resumen de embarque
   * @returns {Promise<Blob>} - Blob del PDF generado
   */
  async generarResumenEmbarquePDF(datos) {
    try {
      // Importar dinámicamente las dependencias
      const { generarResumenEmbarquePDF } = await import('@/utils/resumenEmbarque2');
      const jsPDFModule = await import('jspdf');
      await import('jspdf-autotable');
      
      // Generar el PDF
      return await generarResumenEmbarquePDF(datos, jsPDFModule);
    } catch (error) {
      console.error("Error al generar resumen de embarque PDF:", error);
      throw error;
    }
  }
}; 