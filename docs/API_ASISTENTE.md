# API del Asistente - Rey Pez

Cloud Function HTTPS para que el asistente de Allan pueda registrar movimientos de limpios y crudos desde fuera de la interfaz web.

## Descripción

La función `asistente` expone nueve endpoints protegidos con autenticación por Bearer token:

**Limpios:**
- **POST /salida** - Registra una salida de producto limpio
- **POST /deshacer** - Deshace una salida de limpios registrada previamente
- **GET /existencias** - Consulta el inventario actual de limpios
- **GET /dia** - Obtiene las entradas y salidas de un día específico de limpios

**Crudos:**
- **POST /crudos/entrada** - Registra una entrada de producto crudo
- **POST /crudos/salida** - Registra una salida de producto crudo
- **POST /crudos/deshacer** - Deshace una entrada o salida de crudos registrada previamente
- **GET /crudos/existencias** - Consulta el inventario actual de crudos
- **GET /crudos/dia** - Obtiene las entradas y salidas de un día específico de crudos

Todos los endpoints requieren autenticación mediante el header `Authorization: Bearer <API_KEY>`.

La función NO habilita CORS (solo se accede desde servidores, no desde navegadores).

## Configuración

### 1. Definir la clave API secreta

La API se protege con una clave que vive como secreto de Firebase Functions:

```bash
# Generar una clave segura (ejemplo con openssl)
openssl rand -hex 32

# Guardar la clave como secreto
firebase functions:secrets:set ASISTENTE_API_KEY
# Pegar la clave cuando lo solicite
```

También puedes usar un archivo:

```bash
echo "tu-clave-secreta-aqui" > /tmp/api-key.txt
firebase functions:secrets:set ASISTENTE_API_KEY --data-file=/tmp/api-key.txt
rm /tmp/api-key.txt
```

### 2. Instalar dependencias

```bash
cd functions
npm install
```

### 3. Desplegar solo esta función

```bash
firebase deploy --only functions:asistente
```

El despliegue mostrará la URL de la función, algo como:
```
https://asistente-<hash>-uc.a.run.app
```

## Uso

### Autenticación

Todos los requests deben incluir el header de autorización:

```bash
Authorization: Bearer <tu-clave-secreta>
```

### POST /salida

Registra una salida de producto limpio. Valida que haya suficiente stock disponible (FIFO), actualiza el documento del día de manera transaccional, y registra un log de auditoría.

**URL:** `https://asistente-<hash>-uc.a.run.app/salida`

**Método:** `POST`

**Headers:**
```
Authorization: Bearer <ASISTENTE_API_KEY>
Content-Type: application/json
```

**Body (JSON):**

```json
{
  "fecha": "2027-01-15",
  "proveedor": "Proveedor A",
  "medida": "51/60",
  "precio": 120,
  "kilos": 50,
  "cuarto": "Cuarto 1",
  "idempotencyKey": "orden-123-item-456"
}
```

**Campos obligatorios:**
- `fecha` (string): Fecha en formato `YYYY-MM-DD` (día de calendario en zona `America/Mexico_City`)
- `proveedor` (string): Nombre del proveedor
- `medida` (string): Medida base del producto (ej. `51/60`, `41/50`)
- `kilos` o `cajas`: Cantidad a sacar. Si usas `cajas`, se convierte a kilos (1 caja = 20 kg)

**Campos opcionales:**
- `precio` (number): Precio por kilo. Si no se especifica o hay múltiples precios disponibles, la API puede rechazar la operación pidiendo que desambigües
- `cuarto` (string): Cuarto frío. Si no se especifica, usa `s/c` (sin cuarto)
- `dryRun` (boolean): Si es `true`, simula la operación sin escribir a Firestore (útil para validar)
- `idempotencyKey` (string): Clave única para evitar duplicados en caso de reintentos. Se guarda por 7 días

**Ejemplo de request con curl:**

```bash
curl -X POST https://asistente-<hash>-uc.a.run.app/salida \
  -H "Authorization: Bearer <tu-clave-secreta>" \
  -H "Content-Type: application/json" \
  -d '{
    "fecha": "2027-01-15",
    "proveedor": "Proveedor A",
    "medida": "51/60",
    "precio": 120,
    "kilos": 50,
    "cuarto": "Cuarto 1",
    "idempotencyKey": "orden-123"
  }'
```

**Respuesta exitosa (200 OK):**

```json
{
  "success": true,
  "fecha": "2027-01-15",
  "salida": {
    "tipo": "proveedor",
    "proveedor": "Proveedor A",
    "medida": "51/60",
    "precio": 120,
    "kilos": 50,
    "cajas": 2.5,
    "cuartoFrio": "Cuarto 1"
  },
  "totalSalidas": 150,
  "kilosDisponiblesAntes": 400,
  "kilosDisponiblesDespues": 350
}
```

**Respuesta con dryRun:**

```json
{
  "success": true,
  "dryRun": true,
  "message": "Simulación exitosa (sin escribir a Firestore)",
  "fecha": "2027-01-15",
  "salida": { ... },
  "totalSalidas": 150,
  "kilosDisponiblesAntes": 400,
  "kilosDisponiblesDespues": 350
}
```

**Errores comunes:**

- **401 Unauthorized** - Falta el token o es inválido
  ```json
  {
    "error": "Token de autorización inválido"
  }
  ```

- **400 KILOS_INSUFICIENTES** - No hay suficiente stock
  ```json
  {
    "error": {
      "code": "KILOS_INSUFICIENTES",
      "message": "Kilos insuficientes. Solicitados: 600 kg, disponibles: 400 kg",
      "details": {
        "solicitados": 600,
        "disponibles": 400,
        "faltante": 200
      }
    }
  }
  ```

- **400 PRECIO_CUARTO_AMBIGUO** - Hay múltiples precios/cuartos disponibles
  ```json
  {
    "error": {
      "code": "PRECIO_CUARTO_AMBIGUO",
      "message": "Hay múltiples precios/cuartos disponibles para Proveedor A - 51/60. Especifica \"precio\" y/o \"cuarto\" para desambiguar",
      "details": {
        "opcionesDisponibles": [
          { "precio": 120, "cuarto": "Cuarto 1", "kilosDisponibles": 400 },
          { "precio": 125, "cuarto": "Cuarto 1", "kilosDisponibles": 300 }
        ]
      }
    }
  }
  ```

- **400 SIN_EXISTENCIAS** - No hay stock para ese proveedor+medida
  ```json
  {
    "error": {
      "code": "SIN_EXISTENCIAS",
      "message": "No hay existencias de Proveedor A - 51/60"
    }
  }
  ```

### GET /existencias

Consulta las existencias actuales de producto limpio, agrupadas por proveedor, medida, precio y cuarto frío.

**URL:** `https://asistente-<hash>-uc.a.run.app/existencias`

**Método:** `GET`

**Headers:**
```
Authorization: Bearer <ASISTENTE_API_KEY>
```

**Query params opcionales:**
- `proveedor` - Filtrar por proveedor específico
- `medida` - Filtrar por medida específica

**Ejemplo:**

```bash
curl -X GET "https://asistente-<hash>-uc.a.run.app/existencias?proveedor=Proveedor%20A" \
  -H "Authorization: Bearer <tu-clave-secreta>"
```

**Respuesta exitosa (200 OK):**

```json
{
  "success": true,
  "fecha": "2027-01-15",
  "existencias": [
    {
      "proveedor": "Proveedor A",
      "medida": "51/60",
      "precio": 120,
      "cuarto": "Cuarto 1",
      "kilos": 400,
      "cajas": 20
    },
    {
      "proveedor": "Proveedor A",
      "medida": "51/60",
      "precio": 125,
      "cuarto": "Cuarto 1",
      "kilos": 300,
      "cajas": 15
    },
    {
      "proveedor": "Proveedor B",
      "medida": "41/50",
      "precio": 150,
      "cuarto": "s/c",
      "kilos": 200,
      "cajas": 10
    }
  ],
  "total": 3
}
```

### GET /dia

Obtiene las entradas y salidas registradas para un día específico.

**URL:** `https://asistente-<hash>-uc.a.run.app/dia`

**Método:** `GET`

**Headers:**
```
Authorization: Bearer <ASISTENTE_API_KEY>
```

**Query params:**
- `fecha` (requerido) - Fecha en formato `YYYY-MM-DD`

**Ejemplo:**

```bash
curl -X GET "https://asistente-<hash>-uc.a.run.app/dia?fecha=2027-01-15" \
  -H "Authorization: Bearer <tu-clave-secreta>"
```

**Respuesta exitosa (200 OK):**

```json
{
  "success": true,
  "fecha": "2027-01-15",
  "encontrado": true,
  "sacadaId": "abc123",
  "entradas": [
    {
      "tipo": "proveedor",
      "proveedor": "Proveedor A",
      "medida": "51/60",
      "precio": 120,
      "kilos": 500,
      "cajas": 25,
      "cuartoFrio": "Cuarto 1"
    }
  ],
  "salidas": [
    {
      "tipo": "proveedor",
      "proveedor": "Proveedor A",
      "medida": "51/60",
      "precio": 120,
      "kilos": 100,
      "cajas": 5,
      "cuartoFrio": "Cuarto 1"
    }
  ],
  "totalEntradas": 500,
  "totalSalidas": 100,
  "version": 2,
  "actualizadoEn": { "_seconds": 1234567890, "_nanoseconds": 0 }
}
```

**Respuesta cuando no hay registro para esa fecha:**

```json
{
  "success": true,
  "fecha": "2027-01-16",
  "encontrado": false,
  "message": "No hay registro para esta fecha"
}
```

### POST /deshacer

Deshace una salida de limpios registrada previamente por el asistente. Solo se pueden deshacer operaciones creadas por el asistente (que tienen identificador `_asistenteId`).

**URL:** `https://asistente-<hash>-uc.a.run.app/deshacer`

**Método:** `POST`

**Headers:**
```
Authorization: Bearer <ASISTENTE_API_KEY>
Content-Type: application/json
```

**Body (JSON):**

```json
{
  "idempotencyKey": "orden-123-item-456",
  "idempotencyKey": "undo-orden-123"
}
```

O bien:

```json
{
  "logId": "abc123xyz",
  "dryRun": false
}
```

**Campos requeridos (uno de):**
- `idempotencyKey` (string): La clave de idempotencia de la operación original que quieres deshacer
- `logId` (string): El ID del documento en `asistenteLog` de la operación original

**Campos opcionales:**
- `dryRun` (boolean): Si es `true`, simula la operación sin escribir a Firestore
- `idempotencyKey` (string, segundo parámetro): Clave de idempotencia para la operación de deshacer (para evitar duplicados)

**Ejemplo de request con curl:**

```bash
curl -X POST https://asistente-<hash>-uc.a.run.app/deshacer \
  -H "Authorization: Bearer <tu-clave-secreta>" \
  -H "Content-Type: application/json" \
  -d '{
    "idempotencyKey": "orden-123",
    "idempotencyKey": "undo-orden-123"
  }'
```

**Respuesta exitosa (200 OK):**

```json
{
  "success": true,
  "fecha": "2027-01-15",
  "originalLogId": "log-abc123",
  "filaEliminada": {
    "tipo": "proveedor",
    "proveedor": "Proveedor A",
    "medida": "51/60",
    "precio": 120,
    "kilos": 50,
    "cajas": 2.5,
    "cuartoFrio": "Cuarto 1",
    "_asistenteId": "uuid-xxx"
  },
  "metodoEncontrado": "asistenteId",
  "totalSalidasAntes": 150,
  "totalSalidasDespues": 100
}
```

**Respuesta cuando ya fue deshecha (200 OK):**

```json
{
  "success": true,
  "alreadyUndone": true,
  "message": "Esta operación ya fue deshecha anteriormente",
  "data": {
    "fecha": "2027-01-15",
    "originalLogId": "log-abc123",
    "undoTimestamp": { "_seconds": 1234567890, "_nanoseconds": 0 },
    "row": { ... }
  }
}
```

**Respuesta con dryRun:**

```json
{
  "success": true,
  "dryRun": true,
  "message": "Simulación exitosa (sin escribir a Firestore)",
  "fecha": "2027-01-15",
  "filaEliminada": { ... },
  "totalSalidasDespues": 100
}
```

**Errores comunes:**

- **404 OPERACION_NO_ENCONTRADA** - No se encontró la operación con ese idempotencyKey o logId
  ```json
  {
    "error": {
      "code": "OPERACION_NO_ENCONTRADA",
      "message": "No se encontró ninguna operación de salida con ese idempotencyKey. Solo se pueden deshacer operaciones creadas por el asistente."
    }
  }
  ```

- **400 NO_DESHACIBLE** - La operación es demasiado antigua (antes de tener soporte para deshacer)
  ```json
  {
    "error": {
      "code": "NO_DESHACIBLE",
      "message": "Esta operación fue creada antes de que existiera soporte para deshacer. Solo se pueden deshacer operaciones con identificador de asistente."
    }
  }
  ```

- **404 FILA_NO_ENCONTRADA** - La fila ya no existe en el día (fue eliminada o editada manualmente)
  ```json
  {
    "error": {
      "code": "FILA_NO_ENCONTRADA",
      "message": "No se encontró la fila en el documento del día. Es posible que ya haya sido eliminada o editada manualmente.",
      "details": {
        "busquedaPor": "asistenteId y contenido exacto",
        "filaOriginal": { ... },
        "salidasActuales": 5
      }
    }
  }
  ```

- **409 FILA_MODIFICADA** - La fila fue editada manualmente después de ser registrada
  ```json
  {
    "error": {
      "code": "FILA_MODIFICADA",
      "message": "La fila fue modificada manualmente después de ser registrada. No se puede deshacer.",
      "details": {
        "filaOriginal": { ... },
        "filaActual": { ... }
      }
    }
  }
  ```

**Notas importantes:**

- Solo se pueden deshacer operaciones creadas por el asistente (que tienen `_asistenteId`)
- Si intentas deshacer la misma operación dos veces, la segunda vez retorna éxito con `alreadyUndone: true`
- La operación de deshacer es transaccional: o se completa totalmente o falla sin cambios
- Se crea un log de auditoría tipo `deshacer` en `asistenteLog` para cada operación deshecha
- El campo `metodoEncontrado` indica si la fila se encontró por `asistenteId` o por `contenido` exacto
- Si la fila fue modificada manualmente en la UI, el deshacer será rechazado para evitar inconsistencias

## Concurrencia y seguridad

### Control de versión

Cada documento de día tiene un campo `version` que se incrementa en cada escritura. La UI verifica que la versión no haya cambiado antes de guardar, evitando que se sobrescriban cambios externos.

Si el asistente llama a POST /salida y un usuario edita el día al mismo tiempo en la UI, una de las dos escrituras fallará con un error de versión.

### Idempotencia

Usa el campo `idempotencyKey` en POST /salida para evitar duplicados. Si reenvías un request con la misma clave dentro de 7 días, la API responde con el resultado original sin volver a escribir.

### Auditoría

Cada salida registrada por la API crea un documento en la colección `asistenteLog` con:
- Timestamp de la operación
- Request completo (proveedor, medida, precio, kilos, etc.)
- Estado antes y después (totalSalidas, número de salidas)
- ID del documento modificado

### Logs de idempotencia

Los requests exitosos con `idempotencyKey` se guardan en la colección `asistenteIdem` por 7 días.

## Validación FIFO

La API calcula los kilos disponibles usando el mismo algoritmo FIFO que la UI:

1. Agrupa las entradas por proveedor + medida + precio + cuarto
2. Ordena los lotes por fecha (primero en entrar, primero en salir)
3. Al registrar una salida, descuenta de los lotes más antiguos primero
4. Rechaza la operación si no hay suficiente stock

Si hay múltiples precios o cuartos disponibles para una medida y no especificas cuál usar, la API rechaza el request y te muestra las opciones disponibles.

## Troubleshooting

### Error: "Token de autorización inválido"

Verifica que:
1. El secreto `ASISTENTE_API_KEY` esté configurado en Firebase: `firebase functions:secrets:access ASISTENTE_API_KEY`
2. Estés usando la clave correcta en el header `Authorization: Bearer <clave>`
3. No haya espacios extra ni saltos de línea en la clave

### Error: "Este día fue modificado desde otro lugar"

Alguien editó el día en la UI mientras intentabas registrar la salida. Recarga el día con GET /dia y reintenta.

### La función no responde / timeout

Verifica:
1. Que la función esté desplegada: `firebase functions:list`
2. Los logs de la función: `firebase functions:log --only asistente`
3. Que tengas conectividad a Firebase

### Ver logs en tiempo real

```bash
firebase functions:log --only asistente --follow
```

## Ejemplo completo en Node.js

```javascript
const axios = require('axios');

const API_URL = 'https://asistente-<hash>-uc.a.run.app';
const API_KEY = process.env.ASISTENTE_API_KEY;

async function registrarSalida(fecha, proveedor, medida, kilos, opciones = {}) {
  try {
    const response = await axios.post(`${API_URL}/salida`, {
      fecha,
      proveedor,
      medida,
      kilos,
      ...opciones
    }, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✓ Salida registrada:', response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('Error de la API:', error.response.data);
    } else {
      console.error('Error de red:', error.message);
    }
    throw error;
  }
}

async function consultarExistencias(proveedor = null) {
  try {
    const params = proveedor ? { proveedor } : {};
    const response = await axios.get(`${API_URL}/existencias`, {
      params,
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });
    
    console.log('✓ Existencias:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error al consultar existencias:', error.response?.data || error.message);
    throw error;
  }
}

// Uso
(async () => {
  // Ver existencias disponibles
  await consultarExistencias('Proveedor A');
  
  // Registrar una salida
  await registrarSalida('2027-01-15', 'Proveedor A', '51/60', 50, {
    precio: 120,
    cuarto: 'Cuarto 1',
    idempotencyKey: `salida-${Date.now()}`
  });
})();
```

## Desarrollo local

Para probar la función localmente con el emulador:

```bash
# En una terminal: iniciar emuladores
firebase emulators:start

# En otra terminal: ejecutar tests
node scripts/test-asistente-api.cjs
```

Los tests validan:
- Lógica FIFO de disponibles
- Creación de días nuevos
- Validación de kilos insuficientes
- Idempotencia
- Control de versión
- Auditoría

## API de Crudos

Los endpoints de crudos funcionan de manera similar a los de limpios, pero operan sobre la colección `existenciasCrudos`.

### POST /crudos/entrada

Registra una entrada de producto crudo. Las entradas pueden incluir precio y piezas de forma opcional.

**URL:** `https://asistente-<hash>-uc.a.run.app/crudos/entrada`

**Método:** `POST`

**Headers:**
```
Authorization: Bearer <ASISTENTE_API_KEY>
Content-Type: application/json
```

**Body (JSON):**

```json
{
  "fecha": "2026-10-10",
  "proveedor": "Maria Guadalupe",
  "producto": "Pac Ch",
  "kilos": 500,
  "precio": 120,
  "piezas": "100",
  "cuarto": "Cuarto 1",
  "idempotencyKey": "entrada-123"
}
```

**Campos obligatorios:**
- `fecha` (string): Fecha en formato `YYYY-MM-DD` (día de calendario en zona `America/Mexico_City`)
- `proveedor` (string): Nombre del proveedor
- `producto` (string): Nombre del producto o medida (ej. `Pac Ch`, `Cam 51/60`)
- `kilos` (number): Cantidad en kilogramos

**Campos opcionales:**
- `precio` (number): Precio por kilo. Puede ser null o no especificarse
- `piezas` (string): Número de piezas. Puede ser vacío o no especificarse
- `cuarto` (string): Cuarto frío. Si no se especifica, usa `s/c` (sin cuarto)
- `dryRun` (boolean): Si es `true`, simula la operación sin escribir a Firestore
- `idempotencyKey` (string): Clave única para evitar duplicados en caso de reintentos

**Ejemplo de request con curl:**

```bash
curl -X POST https://asistente-<hash>-uc.a.run.app/crudos/entrada \
  -H "Authorization: Bearer <tu-clave-secreta>" \
  -H "Content-Type: application/json" \
  -d '{
    "fecha": "2026-10-10",
    "proveedor": "Galileo",
    "producto": "Pac Ch",
    "kilos": 300,
    "precio": 120,
    "piezas": "100",
    "cuarto": "Cuarto 1",
    "idempotencyKey": "entrada-galileo-123"
  }'
```

**Respuesta exitosa (200 OK):**

```json
{
  "success": true,
  "fecha": "2026-10-10",
  "entrada": {
    "proveedor": "Galileo",
    "producto": "Pac Ch",
    "kilos": 300,
    "precio": 120,
    "piezas": "100",
    "cuartoFrio": "Cuarto 1"
  },
  "totalEntradas": 800
}
```

**Respuesta con dryRun:**

```json
{
  "success": true,
  "dryRun": true,
  "message": "Simulación exitosa (sin escribir a Firestore)",
  "fecha": "2026-10-10",
  "entrada": { ... },
  "totalEntradas": 800
}
```

**Errores comunes:**

- **401 Unauthorized** - Token inválido o falta el header de autorización
- **409 DIA_DUPLICADO** - Ya existe un registro para esa fecha
- **400 PARAMETRO_INVALIDO** - Falta un campo requerido o el formato es incorrecto

### POST /crudos/salida

Registra una salida de producto crudo con validación FIFO y actualización transaccional. Verifica que haya suficiente stock disponible antes de registrar la salida.

**URL:** `https://asistente-<hash>-uc.a.run.app/crudos/salida`

**Método:** `POST`

**Headers:**
```
Authorization: Bearer <ASISTENTE_API_KEY>
Content-Type: application/json
```

**Body (JSON):**

```json
{
  "fecha": "2026-10-11",
  "proveedor": "Galileo",
  "producto": "Pac Ch",
  "kilos": 113,
  "precio": 120,
  "cuarto": "Cuarto 1",
  "idempotencyKey": "salida-123"
}
```

**Campos obligatorios:**
- `fecha` (string): Fecha en formato `YYYY-MM-DD`
- `proveedor` (string): Nombre del proveedor
- `producto` (string): Nombre del producto
- `kilos` (number): Cantidad a sacar

**Campos opcionales:**
- `precio` (number): Precio por kilo. Si no se especifica o hay múltiples precios disponibles, la API puede rechazar la operación pidiendo que desambigües
- `cuarto` (string): Cuarto frío. Si no se especifica, usa `s/c`. Puede usar `"Todos los cuartos"` para descontar de cualquier cuarto disponible
- `dryRun` (boolean): Si es `true`, simula la operación sin escribir
- `idempotencyKey` (string): Clave única para idempotencia

**Ejemplo de request con curl:**

```bash
curl -X POST https://asistente-<hash>-uc.a.run.app/crudos/salida \
  -H "Authorization: Bearer <tu-clave-secreta>" \
  -H "Content-Type: application/json" \
  -d '{
    "fecha": "2026-10-11",
    "proveedor": "Galileo",
    "producto": "Pac Ch",
    "kilos": 113,
    "cuarto": "Cuarto 1",
    "idempotencyKey": "salida-galileo-456"
  }'
```

**Respuesta exitosa (200 OK):**

```json
{
  "success": true,
  "fecha": "2026-10-11",
  "salida": {
    "proveedor": "Galileo",
    "producto": "Pac Ch",
    "kilos": 113,
    "cuartoFrio": "Cuarto 1"
  },
  "totalSalidas": 113,
  "kilosDisponiblesAntes": 300,
  "kilosDisponiblesDespues": 187
}
```

**Errores comunes:**

- **400 SIN_EXISTENCIAS** - No hay stock para ese proveedor+producto
  ```json
  {
    "error": {
      "code": "SIN_EXISTENCIAS",
      "message": "No hay existencias de Galileo - Pac Ch"
    }
  }
  ```

- **400 KILOS_INSUFICIENTES** - No hay suficiente stock
  ```json
  {
    "error": {
      "code": "KILOS_INSUFICIENTES",
      "message": "Kilos insuficientes. Solicitados: 400 kg, disponibles: 300 kg",
      "details": {
        "solicitados": 400,
        "disponibles": 300,
        "faltante": 100
      }
    }
  }
  ```

- **400 PRECIO_CUARTO_AMBIGUO** - Hay múltiples precios/cuartos disponibles
  ```json
  {
    "error": {
      "code": "PRECIO_CUARTO_AMBIGUO",
      "message": "Hay múltiples precios/cuartos disponibles para Galileo - Pac Ch. Especifica \"precio\" y/o \"cuarto\" para desambiguar",
      "details": {
        "opcionesDisponibles": [
          { "precio": 120, "cuarto": "Cuarto 1", "kilosDisponibles": 300 },
          { "precio": null, "cuarto": "s/c", "kilosDisponibles": 200 }
        ]
      }
    }
  }
  ```

### GET /crudos/existencias

Consulta las existencias actuales de crudos, agrupadas por proveedor, producto, precio y cuarto frío.

**URL:** `https://asistente-<hash>-uc.a.run.app/crudos/existencias`

**Método:** `GET`

**Headers:**
```
Authorization: Bearer <ASISTENTE_API_KEY>
```

**Query params opcionales:**
- `proveedor` - Filtrar por proveedor específico
- `producto` - Filtrar por producto específico

**Ejemplo:**

```bash
curl -X GET "https://asistente-<hash>-uc.a.run.app/crudos/existencias?proveedor=Galileo" \
  -H "Authorization: Bearer <tu-clave-secreta>"
```

**Respuesta exitosa (200 OK):**

```json
{
  "success": true,
  "fecha": "2026-10-11",
  "existencias": [
    {
      "proveedor": "Galileo",
      "producto": "Pac Ch",
      "precio": 120,
      "cuarto": "Cuarto 1",
      "kilos": 187,
      "taras": 9.8,
      "valor": 22440
    },
    {
      "proveedor": "Maria Guadalupe",
      "producto": "Pac Ch",
      "precio": null,
      "cuarto": "s/c",
      "kilos": 500,
      "taras": 26.3,
      "valor": 0
    },
    {
      "proveedor": "Memo",
      "producto": "Cam 51/60",
      "precio": 150,
      "cuarto": "s/c",
      "kilos": 200,
      "taras": 10.5,
      "valor": 30000
    }
  ],
  "total": 3
}
```

**Notas:**
- `taras` se calcula como `kilos / 19` (peso estándar de una tara de crudos)
- `valor` es `kilos * precio`, o 0 si no hay precio
- Los resultados están ordenados por proveedor, producto, precio y cuarto

### GET /crudos/dia

Obtiene las entradas y salidas registradas para un día específico de crudos.

**URL:** `https://asistente-<hash>-uc.a.run.app/crudos/dia`

**Método:** `GET`

**Headers:**
```
Authorization: Bearer <ASISTENTE_API_KEY>
```

**Query params:**
- `fecha` (requerido) - Fecha en formato `YYYY-MM-DD`

**Ejemplo:**

```bash
curl -X GET "https://asistente-<hash>-uc.a.run.app/crudos/dia?fecha=2026-10-11" \
  -H "Authorization: Bearer <tu-clave-secreta>"
```

**Respuesta exitosa (200 OK):**

```json
{
  "success": true,
  "fecha": "2026-10-11",
  "encontrado": true,
  "crudoId": "abc123",
  "entradas": [
    {
      "proveedor": "Memo",
      "producto": "Cam 51/60",
      "kilos": 200,
      "precio": 150,
      "piezas": "",
      "cuartoFrio": "s/c"
    }
  ],
  "salidas": [
    {
      "proveedor": "Galileo",
      "producto": "Pac Ch",
      "kilos": 113,
      "cuartoFrio": "Cuarto 1"
    }
  ],
  "totalEntradas": 200,
  "totalSalidas": 113,
  "version": 2,
  "actualizadoEn": { "_seconds": 1234567890, "_nanoseconds": 0 }
}
```

**Respuesta cuando no hay registro para esa fecha:**

```json
{
  "success": true,
  "fecha": "2026-10-16",
  "encontrado": false,
  "message": "No hay registro para esta fecha"
}
```

### POST /crudos/deshacer

Deshace una entrada o salida de crudos registrada previamente por el asistente. Solo se pueden deshacer operaciones creadas por el asistente (que tienen identificador `_asistenteId`).

**URL:** `https://asistente-<hash>-uc.a.run.app/crudos/deshacer`

**Método:** `POST`

**Headers:**
```
Authorization: Bearer <ASISTENTE_API_KEY>
Content-Type: application/json
```

**Body (JSON):**

```json
{
  "idempotencyKey": "entrada-123",
  "idempotencyKey": "undo-entrada-123"
}
```

O bien:

```json
{
  "logId": "abc123xyz",
  "dryRun": false
}
```

**Campos requeridos (uno de):**
- `idempotencyKey` (string): La clave de idempotencia de la operación original que quieres deshacer
- `logId` (string): El ID del documento en `asistenteLog` de la operación original

**Campos opcionales:**
- `dryRun` (boolean): Si es `true`, simula la operación sin escribir a Firestore
- `idempotencyKey` (string, segundo parámetro): Clave de idempotencia para la operación de deshacer (para evitar duplicados)

**Ejemplo de request con curl:**

```bash
curl -X POST https://asistente-<hash>-uc.a.run.app/crudos/deshacer \
  -H "Authorization: Bearer <tu-clave-secreta>" \
  -H "Content-Type: application/json" \
  -d '{
    "idempotencyKey": "entrada-galileo-123",
    "idempotencyKey": "undo-entrada-galileo-123"
  }'
```

**Respuesta exitosa para entrada (200 OK):**

```json
{
  "success": true,
  "fecha": "2026-10-10",
  "originalLogId": "log-abc123",
  "tipoOriginal": "entrada-crudo",
  "filaEliminada": {
    "proveedor": "Galileo",
    "producto": "Pac Ch",
    "kilos": 300,
    "precio": 120,
    "piezas": "100",
    "cuartoFrio": "Cuarto 1",
    "_asistenteId": "uuid-xxx"
  },
  "metodoEncontrado": "asistenteId",
  "totalEntradasAntes": 800,
  "totalEntradasDespues": 500
}
```

**Respuesta exitosa para salida (200 OK):**

```json
{
  "success": true,
  "fecha": "2026-10-11",
  "originalLogId": "log-xyz789",
  "tipoOriginal": "salida-crudo",
  "filaEliminada": {
    "proveedor": "Galileo",
    "producto": "Pac Ch",
    "kilos": 113,
    "cuartoFrio": "Cuarto 1",
    "_asistenteId": "uuid-yyy"
  },
  "metodoEncontrado": "asistenteId",
  "totalSalidasAntes": 113,
  "totalSalidasDespues": 0
}
```

**Respuesta cuando ya fue deshecha (200 OK):**

```json
{
  "success": true,
  "alreadyUndone": true,
  "message": "Esta operación ya fue deshecha anteriormente",
  "data": {
    "fecha": "2026-10-10",
    "originalLogId": "log-abc123",
    "undoTimestamp": { "_seconds": 1234567890, "_nanoseconds": 0 },
    "row": { ... },
    "tipoOriginal": "entrada-crudo"
  }
}
```

**Respuesta con dryRun:**

```json
{
  "success": true,
  "dryRun": true,
  "message": "Simulación exitosa (sin escribir a Firestore)",
  "fecha": "2026-10-10",
  "tipoOriginal": "entrada-crudo",
  "filaEliminada": { ... },
  "totalEntradasDespues": 500
}
```

**Errores comunes:**

- **404 OPERACION_NO_ENCONTRADA** - No se encontró la operación con ese idempotencyKey o logId
  ```json
  {
    "error": {
      "code": "OPERACION_NO_ENCONTRADA",
      "message": "No se encontró ninguna operación de crudos con ese idempotencyKey. Solo se pueden deshacer operaciones creadas por el asistente."
    }
  }
  ```

- **400 TIPO_INVALIDO** - El logId corresponde a una operación de limpios, no de crudos
  ```json
  {
    "error": {
      "code": "TIPO_INVALIDO",
      "message": "El log especificado no es una entrada/salida de crudos. Usa /deshacer para limpios."
    }
  }
  ```

- **400 NO_DESHACIBLE** - La operación es demasiado antigua (antes de tener soporte para deshacer)
  ```json
  {
    "error": {
      "code": "NO_DESHACIBLE",
      "message": "Esta operación fue creada antes de que existiera soporte para deshacer. Solo se pueden deshacer operaciones con identificador de asistente."
    }
  }
  ```

- **404 FILA_NO_ENCONTRADA** - La fila ya no existe en el día
  ```json
  {
    "error": {
      "code": "FILA_NO_ENCONTRADA",
      "message": "No se encontró la fila en el documento del día. Es posible que ya haya sido eliminada o editada manualmente.",
      "details": {
        "busquedaPor": "asistenteId y contenido exacto",
        "tipoOperacion": "entrada-crudo",
        "filaOriginal": { ... },
        "registrosActuales": 5
      }
    }
  }
  ```

- **409 FILA_MODIFICADA** - La fila fue editada manualmente después de ser registrada
  ```json
  {
    "error": {
      "code": "FILA_MODIFICADA",
      "message": "La fila fue modificada manualmente después de ser registrada. No se puede deshacer.",
      "details": {
        "filaOriginal": { ... },
        "filaActual": { ... }
      }
    }
  }
  ```

**Notas importantes:**

- Funciona tanto para entradas como para salidas de crudos
- Solo se pueden deshacer operaciones creadas por el asistente (que tienen `_asistenteId`)
- Si intentas deshacer la misma operación dos veces, la segunda vez retorna éxito con `alreadyUndone: true`
- La operación de deshacer es transaccional: o se completa totalmente o falla sin cambios
- Se crea un log de auditoría tipo `deshacer-crudo` en `asistenteLog` para cada operación deshecha
- El campo `tipoOriginal` indica si era una `entrada-crudo` o `salida-crudo`
- El campo `metodoEncontrado` indica si la fila se encontró por `asistenteId` o por `contenido` exacto
- Si la fila fue modificada manualmente en la UI, el deshacer será rechazado para evitar inconsistencias

## Diferencias entre Limpios y Crudos

### Estructura de datos

**Limpios (sacadas):**
- Entradas y salidas tienen: `proveedor`, `medida`, `precio`, `kilos`, `cajas`, `cuartoFrio`
- Colección: `sacadas`
- Índice separado: `sacadasDias`

**Crudos (existenciasCrudos):**
- Entradas tienen: `proveedor`, `producto`, `kilos`, `precio` (opcional), `piezas` (opcional), `cuartoFrio`
- Salidas tienen: `proveedor`, `producto`, `kilos`, `cuartoFrio`
- Colección: `existenciasCrudos`
- Sin índice separado (búsqueda directa en la colección)

### Cálculo de taras

- **Limpios:** 1 caja = 20 kg
- **Crudos:** 1 tara = 19 kg

## Concurrencia y seguridad (aplica a limpios y crudos)

### Control de versión

Cada documento de día tiene un campo `version` que se incrementa en cada escritura. La UI verifica que la versión no haya cambiado antes de guardar, evitando que se sobrescriban cambios externos.

Si el asistente llama a POST /salida o POST /crudos/entrada y un usuario edita el día al mismo tiempo en la UI, una de las dos escrituras fallará con un error de versión.

### Idempotencia

Usa el campo `idempotencyKey` en POST /salida, POST /crudos/entrada y POST /crudos/salida para evitar duplicados. Si reenvías un request con la misma clave dentro de 7 días, la API responde con el resultado original sin volver a escribir.

### Auditoría

Cada operación registrada por la API crea un documento en la colección `asistenteLog` con:
- Timestamp de la operación
- Request completo
- Estado antes y después
- ID del documento modificado
- Tipo de operación: `salida`, `entrada-crudo`, `salida-crudo`

### Logs de idempotencia

Los requests exitosos con `idempotencyKey` se guardan en la colección `asistenteIdem` por 7 días.

## Validación FIFO

La API calcula los kilos disponibles usando el mismo algoritmo FIFO que la UI:

1. Agrupa las entradas por proveedor + producto + precio + cuarto
2. Ordena los lotes por fecha (primero en entrar, primero en salir)
3. Al registrar una salida, descuenta de los lotes más antiguos primero
4. Rechaza la operación si no hay suficiente stock

Si hay múltiples precios o cuartos disponibles para un producto y no especificas cuál usar, la API rechaza el request y te muestra las opciones disponibles.

## Seguridad

⚠️ **IMPORTANTE:**
- Nunca comitas la clave `ASISTENTE_API_KEY` en el código
- Usa variables de entorno o secretos seguros
- La clave da acceso completo de escritura al inventario (limpios Y crudos)
- Rota la clave si se filtra: `firebase functions:secrets:set ASISTENTE_API_KEY` y redespliega

## Contacto

Para dudas o problemas, contacta a Allan (propietario de Rey Pez).
