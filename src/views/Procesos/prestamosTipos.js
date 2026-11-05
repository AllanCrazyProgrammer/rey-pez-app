// Lo que cambia entre las pantallas de préstamos (PrestamosCuentas.vue). Las colecciones y los
// nombres de campo son los de Firestore: no cambiarlos o se dejarían de leer los datos existentes.
//   campo: prefijo de los campos del préstamo (`${campo}Id`, `${campo}Nombre`).
//   extra: el tercer dato que se guarda al registrar una persona.
export const TIPOS_PRESTAMO = {
  despicadoras: {
    coleccionPrestamos: 'prestamosDespicadoras',
    coleccionPersonas: 'despicadoras',
    campo: 'despicadora',
    titulo: 'Préstamos a Despicadoras',
    singular: 'Despicadora',
    plural: 'Despicadoras',
    todas: 'Todas',
    seleccionar: 'Seleccionar despicadora',
    nueva: 'Nueva Despicadora',
    icono: 'fas fa-building',
    tituloNuevoPrestamo: 'Nuevo Préstamo a Despicadora',
    placeholderNombre: 'Nombre de la despicadora',
    guardar: 'Guardar Despicadora',
    extra: { clave: 'direccion', etiqueta: 'Dirección:', placeholder: 'Dirección (opcional)', multilinea: true },
    placeholderAbono: 'Ej: Pago parcial, Transferencia, etc.',
    pedirNombre: 'Por favor ingrese el nombre de la despicadora',
    registrada: 'Despicadora registrada correctamente',
    errorCargar: 'Error al cargar despicadoras: ',
    errorGuardar: 'Error al guardar despicadora: ',
    sigueDisponible: 'La despicadora seguirá disponible.',
    colores: { acento: '#e74c3c', acentoOscuro: '#c0392b', alCorriente: '#2ecc71' }
  },
  trabajadores: {
    coleccionPrestamos: 'prestamosTrabajadores',
    coleccionPersonas: 'trabajadores',
    campo: 'trabajador',
    titulo: 'Préstamos a Trabajadores',
    singular: 'Trabajador',
    plural: 'Trabajadores',
    todas: 'Todos',
    seleccionar: 'Seleccionar trabajador',
    nueva: 'Nuevo Trabajador',
    icono: 'fas fa-user-plus',
    tituloNuevoPrestamo: 'Nuevo Préstamo a Trabajador',
    placeholderNombre: 'Nombre completo del trabajador',
    guardar: 'Guardar Trabajador',
    extra: { clave: 'puesto', etiqueta: 'Puesto:', placeholder: 'Puesto de trabajo (opcional)', multilinea: false },
    placeholderAbono: 'Ej: Descuento de nómina, Pago efectivo, etc.',
    pedirNombre: 'Por favor ingrese el nombre del trabajador',
    registrada: 'Trabajador registrado correctamente',
    errorCargar: 'Error al cargar trabajadores: ',
    errorGuardar: 'Error al guardar trabajador: ',
    sigueDisponible: 'El trabajador seguirá disponible.',
    colores: { acento: '#2ecc71', acentoOscuro: '#27ae60', alCorriente: '#95a5a6' }
  }
};
