# 🎮 Guía de Estilos Retro - Matrix/Predator Vision

Esta guía documenta el sistema de diseño retro implementado en Rey Pez App, inspirado en la estética Matrix y el visor térmico de Predator.

---

## 📦 Importar Fuentes

Agregar al inicio de cada `<style scoped>`:

```css
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=VT323&family=Share+Tech+Mono&display=swap');
```

---

## 🎨 Variables de Color

Copiar estas variables CSS en el contenedor principal del componente:

```css
.mi-componente {
  /* Colores Matrix */
  --matrix-green: #00ff41;
  --matrix-green-glow: #00ff4180;
  
  /* Colores Térmicos (Predator) */
  --thermal-red: #ff2a2a;
  --thermal-orange: #ff6b00;
  --thermal-yellow: #ffcc00;
  --amber: #ffb000;
  
  /* Colores Secundarios */
  --cyan: #00d4ff;
  
  /* Fondos */
  --bg-dark: #0a0808;
  --bg-panel: rgba(10, 8, 8, 0.95);
  --bg-green-dark: rgba(0, 20, 0, 0.8);
  --bg-green-medium: rgba(0, 40, 0, 0.6);
}
```

### Uso de Colores

| Color | Variable | Uso |
|-------|----------|-----|
| 💚 Verde | `--matrix-green` | Valores principales, datos numéricos, éxito |
| 🟠 Naranja | `--thermal-orange` | Labels, títulos secundarios, denominaciones |
| 🟡 Amarillo | `--thermal-yellow` | Fechas, brackets, información complementaria |
| 🔴 Rojo | `--thermal-red` | Alertas, errores, botones de eliminar |
| 🔵 Cyan | `--cyan` | Botones de acción secundaria (imprimir, etc.) |
| 🟤 Ámbar | `--amber` | Variantes alternativas (ej: botón $2 vs $1) |

---

## 🔤 Tipografías

### Orbitron (Títulos HUD)
```css
font-family: 'Orbitron', sans-serif;
letter-spacing: 2-5px;
```
**Usar en:** Headers de sección, títulos principales, labels importantes

### VT323 (Datos/Terminal)
```css
font-family: 'VT323', monospace;
font-size: 1.2-2.5rem; /* Generalmente más grande */
```
**Usar en:** Valores numéricos, totales, contenido de botones, datos principales

### Share Tech Mono (Texto técnico)
```css
font-family: 'Share Tech Mono', monospace;
font-size: 0.85-1rem;
```
**Usar en:** Descripciones, mensajes de estado, información secundaria

---

## 🖼️ Componentes Base

### 1. Contenedor Principal (Fondo oscuro)

```css
.contenedor-principal {
  min-height: 100vh;
  background: linear-gradient(180deg, #0a0505 0%, #120808 50%, #0a0505 100%);
  padding: 20px 0;
  position: relative;
}
```

### 2. Efecto Scanlines CRT

```html
<div class="scanlines"></div>
```

```css
.scanlines {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.03),
    rgba(0, 0, 0, 0.03) 1px,
    transparent 1px,
    transparent 2px
  );
}
```

### 3. Marco HUD con Corners

```html
<div class="hud-frame">
  <div class="hud-corner hud-tl"></div>
  <div class="hud-corner hud-tr"></div>
  <div class="hud-corner hud-bl"></div>
  <div class="hud-corner hud-br"></div>
  <!-- Contenido aquí -->
</div>
```

```css
.hud-frame {
  position: relative;
  background: var(--bg-panel);
  border: 2px solid var(--thermal-orange);
  padding: 25px;
  box-shadow: 
    0 0 30px rgba(255, 107, 0, 0.3),
    inset 0 0 60px rgba(255, 68, 68, 0.05);
}

.hud-corner {
  position: absolute;
  width: 25px;
  height: 25px;
  border-color: var(--thermal-orange);
  border-style: solid;
}

.hud-tl { top: 5px; left: 5px; border-width: 3px 0 0 3px; }
.hud-tr { top: 5px; right: 5px; border-width: 3px 3px 0 0; }
.hud-bl { bottom: 5px; left: 5px; border-width: 0 0 3px 3px; }
.hud-br { bottom: 5px; right: 5px; border-width: 0 3px 3px 0; }
```

### 4. Panel Terminal (Verde)

```css
.panel-terminal {
  background: var(--bg-green-dark);
  border: 1px solid var(--matrix-green);
  padding: 20px;
  box-shadow: 0 0 20px var(--matrix-green-glow);
}
```

### 5. Header de Sección

```html
<div class="section-header">
  <span class="header-icon">◈</span>
  <span class="header-text">NOMBRE_SECCION</span>
</div>
```

```css
.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--matrix-green);
}

.header-icon {
  color: var(--matrix-green);
  font-size: 1.2rem;
  text-shadow: 0 0 10px var(--matrix-green);
}

.header-text {
  font-family: 'Orbitron', sans-serif;
  color: var(--matrix-green);
  font-size: 1.1rem;
  letter-spacing: 3px;
  text-shadow: 0 0 10px var(--matrix-green-glow);
}
```

---

## 🔘 Botones

### Botón Primario (Verde)

```html
<button class="btn-terminal">
  <span class="btn-bracket">[</span>
  <span class="btn-text">ACCION</span>
  <span class="btn-bracket">]</span>
</button>
```

```css
.btn-terminal {
  background: transparent;
  border: 2px solid var(--matrix-green);
  color: var(--matrix-green);
  font-family: 'VT323', monospace;
  font-size: 1.2rem;
  padding: 12px 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-terminal:hover:not(:disabled) {
  background: var(--matrix-green);
  color: var(--bg-dark);
  box-shadow: 0 0 20px var(--matrix-green-glow);
}

.btn-terminal:disabled {
  opacity: 0.4;
  border-color: #444;
  color: #444;
  cursor: not-allowed;
}

.btn-bracket {
  color: var(--thermal-yellow);
}
```

### Botón Peligro (Rojo)

```css
.btn-danger {
  border-color: var(--thermal-red);
  color: var(--thermal-red);
}

.btn-danger:hover:not(:disabled) {
  background: var(--thermal-red);
  box-shadow: 0 0 20px rgba(255, 42, 42, 0.5);
}
```

### Botón Secundario (Cyan)

```css
.btn-secondary {
  border-color: var(--cyan);
  color: var(--cyan);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--cyan);
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
}
```

---

## 📝 Inputs

### Textarea/Input Terminal

```css
.input-terminal {
  background: var(--bg-green-medium);
  border: 2px solid var(--matrix-green);
  border-radius: 0;
  padding: 15px;
  font-family: 'VT323', monospace;
  font-size: 1.3rem;
  color: var(--matrix-green);
  transition: all 0.3s ease;
}

.input-terminal::placeholder {
  color: rgba(0, 255, 65, 0.4);
}

.input-terminal:focus {
  border-color: var(--thermal-yellow);
  box-shadow: 0 0 20px var(--matrix-green-glow);
  outline: none;
}

/* Estados de validación */
.input-terminal.is-invalid {
  border-color: var(--thermal-red);
  box-shadow: 0 0 15px rgba(255, 42, 42, 0.3);
}

.input-terminal.is-valid {
  border-color: var(--matrix-green);
  box-shadow: 0 0 15px var(--matrix-green-glow);
}
```

---

## 📊 Mostrar Datos

### Valor con Glow

```css
.valor-destacado {
  font-family: 'VT323', monospace;
  font-size: 2rem;
  color: var(--matrix-green);
  text-shadow: 
    0 0 10px var(--matrix-green),
    0 0 20px var(--matrix-green-glow);
}
```

### Label + Valor

```html
<div class="dato-item">
  <span class="dato-label">ETIQUETA:</span>
  <span class="dato-valor">$1,234.00</span>
</div>
```

```css
.dato-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 5px;
  border-bottom: 1px solid rgba(0, 255, 65, 0.2);
}

.dato-label {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.9rem;
  color: var(--thermal-orange);
  letter-spacing: 1px;
}

.dato-valor {
  font-family: 'VT323', monospace;
  font-size: 1.4rem;
  color: var(--matrix-green);
  text-shadow: 0 0 8px var(--matrix-green-glow);
}
```

---

## ⚠️ Alertas y Mensajes

### Alerta de Error

```css
.alerta-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
  background: rgba(255, 42, 42, 0.1);
  border: 1px solid var(--thermal-red);
  color: var(--thermal-red);
  font-family: 'Share Tech Mono', monospace;
}
```

### Mensaje de Éxito

```css
.mensaje-exito {
  background: rgba(0, 255, 65, 0.1);
  border: 1px solid var(--matrix-green);
  color: var(--matrix-green);
}
```

### Mensaje de Advertencia

```css
.mensaje-warning {
  background: rgba(255, 176, 0, 0.1);
  border: 1px solid var(--amber);
  color: var(--amber);
}
```

---

## ✨ Efectos y Animaciones

### Glow Pulsante

```css
@keyframes pulse-glow {
  0%, 100% { 
    opacity: 1; 
    box-shadow: 0 0 10px var(--matrix-green); 
  }
  50% { 
    opacity: 0.7; 
    box-shadow: 0 0 20px var(--matrix-green); 
  }
}

.elemento-pulsante {
  animation: pulse-glow 2s ease-in-out infinite;
}
```

### Indicador de Estado (Dot)

```css
.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--matrix-green);
  box-shadow: 0 0 8px var(--matrix-green);
  animation: pulse-dot 1.5s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}
```

### Efecto de Barrido (Hover)

```css
.boton-barrido {
  position: relative;
  overflow: hidden;
}

.boton-barrido::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(0, 255, 65, 0.1), transparent);
  transition: left 0.5s ease;
}

.boton-barrido:hover::before {
  left: 100%;
}
```

---

## 📱 Responsive

### Breakpoints Recomendados

```css
/* Tablet */
@media (max-width: 768px) {
  .header-text { font-size: 0.9rem; letter-spacing: 1px; }
  .valor-destacado { font-size: 1.8rem; }
  .btn-terminal { font-size: 1rem; padding: 10px 15px; }
  .hud-corner { width: 20px; height: 20px; }
}

/* Mobile */
@media (max-width: 576px) {
  .header-text { font-size: 0.8rem; }
  .valor-destacado { font-size: 1.5rem; }
  .hud-corner { width: 15px; height: 15px; }
  .input-terminal { font-size: 1.1rem; padding: 12px; }
}
```

---

## 🖨️ Impresión

```css
@media print {
  .contenedor {
    background: white;
    border: 1px solid #000;
    box-shadow: none;
  }
  
  .valor-destacado,
  .header-text,
  .dato-valor {
    color: #000 !important;
    text-shadow: none !important;
  }
  
  .btn-terminal,
  .scanlines {
    display: none;
  }
}
```

---

## 🎯 Símbolos Útiles

| Símbolo | Uso |
|---------|-----|
| `◈` | Headers de sección |
| `◢` | Prefijos (DATE:, ID:) |
| `▸` | Indicadores de estado |
| `◬◭◮◯` | Símbolos alienígenas (NavBar) |
| `╔═ ═╗` | Títulos con brackets ASCII |
| `────` | Separadores |
| `⚠` | Alertas |
| `✕` | Cerrar/Eliminar |
| `⎙` | Imprimir |
| `●` | Estado activo |
| `◉` | Estado bloqueado |
| `⊘` | Estado inactivo |

---

## 📋 Checklist de Implementación

Al aplicar el estilo a un nuevo componente:

- [ ] Importar fuentes Google (Orbitron, VT323, Share Tech Mono)
- [ ] Definir variables CSS en el contenedor principal
- [ ] Eliminar `border-radius` (usar bordes rectos)
- [ ] Cambiar fondos claros por oscuros (`--bg-dark`, `--bg-panel`)
- [ ] Aplicar tipografía apropiada según contenido
- [ ] Agregar efectos glow a elementos destacados
- [ ] Convertir botones al estilo terminal con brackets
- [ ] Agregar responsive para tablet/mobile
- [ ] Incluir estilos de impresión
- [ ] Probar en modo oscuro del sistema

---

## 📁 Archivos de Referencia

Consultar estos archivos para ejemplos completos:

- `src/NavBar.vue` - Estilo Predator Vision completo
- `src/datos.vue` - HUD Frame + inputs
- `src/Cuentas.vue` - Listas y totales
- `src/Calcular.vue` - Botones con variantes
- `src/views/Home.vue` - Contenedor con scanlines
- `src/views/Embarques/ListaEmbarques.vue` - Cards estilo terminal
- `src/views/Embarques/EmbarquesMenu.vue` - Menú con ASCII art

---

*Última actualización: Noviembre 2025*
