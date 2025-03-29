// Colores predeterminados para clientes
export const CLIENTE_COLORS = {
  JOSELITO: "#3498db",
  CATARRO: "#e74c3c",
  OTILIO: "#f1c40f",
  OZUNA: "#2ecc71",
  CANELO: "#9b59b6",
  DEFAULT: "#95a5a6",
};

// Clientes predefinidos
export const CLIENTES_PREDEFINIDOS = [
  {
    id: 1,
    nombre: "Joselito",
    color: CLIENTE_COLORS.JOSELITO,
    textColor: "white",
  },
  {
    id: 2,
    nombre: "Catarro",
    color: CLIENTE_COLORS.CATARRO,
    textColor: "white",
  },
  { id: 3, nombre: "Otilio", color: CLIENTE_COLORS.OTILIO, textColor: "black" },
  { id: 4, nombre: "Ozuna", color: CLIENTE_COLORS.OZUNA, textColor: "white" },
  { id: 5, nombre: "Canelo", color: CLIENTE_COLORS.CANELO, textColor: "white" },
];

// Estructura para un nuevo producto
export function crearNuevoProducto(clienteId) {
  return {
    id: Date.now(),
    clienteId: clienteId,
    medida: "",
    tipo: "",
    tipoPersonalizado: "",
    taras: [],
    kilos: [],
    reporteTaras: [],
    reporteBolsas: [],
    tarasExtra: [],
    restarTaras: true,
    camaronNeto: 0.65,
    multiplicadorBolsas: 1,
    showSuggestions: false,
    esVenta: false,
    isEditing: true,
    isNew: true,
    noSumarKilos: false,
  };
}

// Estructura para un nuevo crudo item
export function crearNuevoCrudoItem() {
  return {
    talla: "",
    barco: "",
    taras: null,
    sobrante: null,
    mostrarSobrante: false,
  };
}

// Tiposs predefinidos para productos
export const TIPOS_PRODUCTO = [
  { id: "c/h20", nombre: "Con agua (c/h20)" },
  { id: "s/h20", nombre: "Sin agua (s/h20)" },
  { id: "otro", nombre: "Otro" },
];

// Tallas de camarón
export const TALLAS_CAMARON = [
  { id: "Med c/c", nombre: "Mediano c/c" },
  { id: "Med-Esp c/c", nombre: "Mediano-Especial c/c" },
  { id: "Med-gde c/c", nombre: "Mediano-Grande c/c" },
  { id: "Gde c/c", nombre: "Grande c/c" },
  { id: "Extra c/c", nombre: "Extra c/c" },
  { id: "Jumbo c/c", nombre: "Jumbo c/c" },
  { id: "Linea", nombre: "Línea" },
  { id: "Rechazo", nombre: "Rechazo" },
];

// Formatos para las tallas en crudos
export const FORMATO_TALLAS = {
  "Med c/c": "Med",
  "Med-Esp c/c": "Esp",
  "Med-gde c/c": "M-G",
  "Gde c/c": "Gde",
  "Extra c/c": "Ext",
  "Jumbo c/c": "Jbo",
  Linea: "Lin",
  Rechazo: "Rch",
};
