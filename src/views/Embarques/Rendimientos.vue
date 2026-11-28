<template>
  <div class="rendimientos-container">
    <div class="header-container">
      <div class="rendimientos-title-block">
        <span class="rendimientos-title-icon"><i class="fas fa-chart-line"></i></span>
        <div>
          <span class="rendimientos-eyebrow">Control de producción</span>
          <h2>Rendimientos por medida</h2>
        </div>
        <span class="medidas-counter">{{ medidasUnicas.length }} medidas</span>
      </div>
      <div class="header-actions">
        <button type="button" @click="volverAEmbarque" class="btn-volver">
          <i class="fas fa-arrow-left"></i> Embarque
        </button>
        <button type="button" class="btn-pesadas" aria-label="Ver pesadas del día del embarque" @click="abrirPesadasDelDia">
          <i class="fas fa-balance-scale"></i> Ver pesadas
        </button>
        <button type="button" @click="abrirModalNota" class="btn-nota">
          <i class="fas fa-sticky-note"></i> Nota
        </button>
        <button type="button" @click="irAGestionCostos" class="btn-costos">
          <i class="fas fa-dollar-sign"></i> Costos
        </button>
        <button type="button" @click="irAPreparacion" class="btn-preparacion">
          <i class="fas fa-tasks"></i> Preparación
        </button>
        <button type="button" @click="abrirModalConfiguracion" class="btn-configuracion">
          <i class="fas fa-cog"></i> Pesos
        </button>
        <button type="button" @click="generarPDF" class="btn-pdf">
          <i class="fas fa-file-pdf"></i> PDF
        </button>
      </div>
    </div>

    <!-- Total general de ganancias del día (fijo al hacer scroll) -->
    <div v-if="embarqueData" class="ganancia-total-sticky">
      <span class="ganancia-total-sticky-label">Ganancia total del día</span>
      <span
        class="ganancia-total-sticky-valor"
        :class="{
          'ganancia-positiva': totalGeneralGanancias > 0,
          'ganancia-negativa': totalGeneralGanancias < 0
        }"
      >
        ${{ formatearPrecio(totalGeneralGanancias) }}
      </span>
      <span class="ganancia-total-sticky-detalle">{{ resumenAnalisisGanancia }}</span>
      <button
        v-if="costosFaltantesPendientes > 0"
        type="button"
        class="ganancia-total-sticky-costos"
        @click="preguntarCostosFaltantes(true)"
      >
        ⚠️ Faltan {{ costosFaltantesPendientes }} costos
      </button>
    </div>

    <div v-if="avisoError" class="aviso-conflicto aviso-error" role="alert">
      <p>{{ avisoError }}</p>
    </div>
    <div v-if="avisoConflicto" class="aviso-conflicto" role="status">
      <p>{{ avisoConflicto }}</p>
      <button type="button" @click="reintentarCambiosPendientes">Usar lo de esta pantalla</button>
      <button type="button" @click="recargarPantalla">Usar lo del otro equipo</button>
    </div>
    
    <div class="resumen-header-row">
      <div class="resumen-tabs" role="tablist" aria-label="Vistas del embarque">
        <button
          type="button"
          class="resumen-tab-button"
          :class="{ activo: activeVistaTab === 'sacada-hoy' }"
          role="tab"
          :aria-selected="activeVistaTab === 'sacada-hoy'"
          @click="toggleVistaResumenSacadas"
        >
          Resumen de sacadas
        </button>
        <button
          type="button"
          class="resumen-tab-button"
          :class="{ activo: activeVistaTab === 'medidas-hoy' }"
          role="tab"
          :aria-selected="activeVistaTab === 'medidas-hoy'"
          @click="toggleVistaMedidasHoy"
        >
          Medidas para hoy
        </button>
      </div>
    </div>

    <template v-if="activeVistaTab === 'rendimientos'">
      <div v-if="!embarqueData">
        <p>Cargando datos del embarque...</p>
      </div>
      
      <div v-else class="rendimientos-grid">
        <div
          v-for="(medida, index) in medidasUnicas"
          :key="index"
          class="rendimiento-card"
          :class="{ 'rendimiento-pendiente': requiereCompletarMedida(medida) }"
        >
          <div class="medida-info">
          <div class="medida-header">
            <div class="medida-identidad">
              <input
                    v-if="edicionNombreMedida && edicionNombreMedida.medida === medida && !edicionNombreMedida.campo"
                    ref="editorNombreMedida"
                    class="nombre-medida-input"
                    type="text"
                    aria-label="Nuevo nombre de medida"
                    v-model="edicionNombreMedida.nombre"
                    @keydown.enter.prevent="guardarNombreMedida"
                    @keydown.esc.prevent="cancelarNombreMedida"
                    @blur="guardarNombreMedida"
                  >
              <span v-else class="medida-label editable-label" @click="editarNombreMedida(medida)">
                {{ obtenerNombreMedidaPersonalizado(medida) }}
              </span>
              <span v-if="requiereCompletarMedida(medida)" class="datos-pendientes">
                <i class="fas fa-exclamation-triangle"></i> Completar
              </span>
            </div>
            <div class="controles-medida">
              <div class="ocultar-control">
                <input 
                  type="checkbox" 
                  :id="'ocultar-' + index"
                  v-model="medidaOculta[medida]"
                  @change="guardarEstadoOculto"
                >
                <label :for="'ocultar-' + index">Ocultar en PDF</label>
              </div>
              <div class="analizar-ganancia-control">
                <input 
                  type="checkbox" 
                  :id="'analizar-' + index"
                  v-model="analizarGanancia[medida]"
                  @change="guardarEstadoAnalisis"
                >
                <label :for="'analizar-' + index">Analizar ganancia</label>
              </div>
              <div class="maquila-ganancia-control">
                <input 
                  type="checkbox" 
                  :id="'maquila-' + index"
                  v-model="analizarMaquilaGanancia[medida]"
                  @change="guardarEstadoAnalisis"
                >
                <label :for="'maquila-' + index">Maquila ganancia</label>
              </div>

              <div v-if="analizarMaquilaGanancia[medida]" class="maquila-precio-input">
                <input 
                  type="number" 
                  step="0.01"
                  v-model="precioMaquila[medida]"
                  @input="programarGuardadoAnalisis"
                  :placeholder="precioMaquilaDelEmbarque(medida) ? `$${precioMaquilaDelEmbarque(medida)} del embarque` : 'Precio por kg'"
                  :title="precioMaquilaDelEmbarque(medida) ? 'Vacío usa el precio de maquila de las líneas del embarque' : ''"
                  class="precio-maquila-input"
                >
              </div>
            </div>
          </div>

          
          <div
            v-if="!esMedidaRefri(medida)"
            class="input-group"
            :class="{ 'grupo-cero-alerta': tieneEntradaPendiente(medida) && !medidaOculta[medida] }"
          >
            <template v-if="esMedidaMix(medida)">
              <div class="mix-inputs">
                <div class="mix-input">
                  <input
                    v-if="edicionNombreMedida && edicionNombreMedida.medida === medida && edicionNombreMedida.campo === 'medida1'"
                    ref="editorNombreMedida"
                    class="nombre-medida-input"
                    type="text"
                    aria-label="Nuevo nombre de medida"
                    v-model="edicionNombreMedida.nombre"
                    @keydown.enter.prevent="guardarNombreMedida"
                    @keydown.esc.prevent="cancelarNombreMedida"
                    @blur="guardarNombreMedida"
                  >
                  <label v-else @click="editarEtiqueta(medida, 'medida1')" class="editable-label">
                    {{ obtenerEtiqueta(medida, 'medida1') }}:
                  </label>
                  <input 
                    type="number" 
                    v-model="kilosCrudos[medida].medida1" 
                    :class="{ 'valor-cero-alerta': debeAlertarCero(medida, kilosCrudos[medida].medida1) }"
                    @input="calcularRendimiento(medida)"
                    placeholder="Kilos medida 1"
                  >
                </div>
                <div class="mix-input">
                  <input
                    v-if="edicionNombreMedida && edicionNombreMedida.medida === medida && edicionNombreMedida.campo === 'medida2'"
                    ref="editorNombreMedida"
                    class="nombre-medida-input"
                    type="text"
                    aria-label="Nuevo nombre de medida"
                    v-model="edicionNombreMedida.nombre"
                    @keydown.enter.prevent="guardarNombreMedida"
                    @keydown.esc.prevent="cancelarNombreMedida"
                    @blur="guardarNombreMedida"
                  >
                  <label v-else @click="editarEtiqueta(medida, 'medida2')" class="editable-label">
                    {{ obtenerEtiqueta(medida, 'medida2') }}:
                  </label>
                  <input 
                    type="number" 
                    v-model="kilosCrudos[medida].medida2" 
                    :class="{ 'valor-cero-alerta': debeAlertarCero(medida, kilosCrudos[medida].medida2) }"
                    @input="calcularRendimiento(medida)"
                    placeholder="Kilos medida 2"
                  >
                </div>
              </div>
            </template>
            <template v-else>
              <label>Kilos en crudo:</label>
              <input 
                type="number" 
                v-model="kilosCrudos[medida]" 
                :class="{ 'valor-cero-alerta': debeAlertarCero(medida, kilosCrudos[medida]) }"
                @input="calcularRendimiento(medida)"
                placeholder="Ingrese kilos"
              >
            </template>
          </div>

          <div
            v-else-if="analizarGanancia[medida] && rendimientoRefriAnterior(medida) === null"
            class="input-group rendimiento-manual-group"
            :class="{ 'grupo-cero-alerta': debeAlertarCero(medida, rendimientoManual[medida]) }"
          >
            <label>Rendimiento manual:</label>
            <input
              type="number"
              step="0.01"
              min="0"
              :value="rendimientoManual[medida] ?? ''"
              :class="{ 'valor-cero-alerta': debeAlertarCero(medida, rendimientoManual[medida]) }"
              @input="actualizarRendimientoManual(medida, $event.target.value)"
              placeholder="Ej: 1.18"
            >
          </div>
          
          <div class="resultados">
            <p class="total-embarcado" :class="{ 'valor-resumen-alerta': debeAlertarCero(medida, obtenerTotalEmbarcado(medida)) }">
              Total embarcado: {{ formatearNumero(obtenerTotalEmbarcado(medida)) }} kg
            </p>
            <p class="rendimiento" :class="{ 'rendimiento-cero-alerta': debeAlertarCero(medida, obtenerRendimientoActual(medida)) }">
              <template v-if="typeof rendimientoRefriAnterior(medida) === 'number'">
                Rendimiento ({{ medidaBaseRefri(medida) }} del embarque anterior):
              </template>
              <template v-else>Rendimiento:</template>
              <span :class="{ 'rendimiento-alto': getRendimiento(medida) > 1 }">
                {{ getRendimiento(medida).toFixed(2) }}
              </span>
            </p>
            <p v-if="esMedidaRefri(medida) && rendimientoRefriAnterior(medida) === undefined" class="rendimiento-ganancia-ref">
              Buscando el rendimiento de {{ medidaBaseRefri(medida) }} del embarque anterior…
            </p>
            
            <!-- Sección de ganancia -->
            <div v-if="gananciasCalculadas[medida] && analizarGanancia[medida]" class="ganancia-info">
              <div class="ganancia-header">
                <h4>💰 Análisis de Ganancia</h4>
              </div>
              <div class="ganancia-detalles">
                <div class="ganancia-item">
                  <span class="label">Precio de Venta:</span>
                  <div class="precio-venta-container">
                    <span class="valor precio-venta">${{ formatearPrecioVenta(gananciasCalculadas[medida].precioVenta) }}</span>
                    
                    <!-- Precio promedio de múltiples clientes -->
                    <span v-if="gananciasCalculadas[medida].esPromedio" 
                          class="precio-promedio-badge"
                          title="Precio promedio ponderado por kilos. Cada cliente usa su propio precio (ver desglose).">
                      📊 Promedio
                    </span>
                    
                    <!-- Precio específico de un cliente -->
                    <span v-else-if="gananciasCalculadas[medida].esEspecifico" 
                          class="precio-especifico-badge"
                          :title="`Precio propio de ${gananciasCalculadas[medida].clienteEspecifico}`">
                      📌 {{ gananciasCalculadas[medida].clienteEspecifico }}
                    </span>
                    
                  </div>
                </div>
                <div class="ganancia-item">
                  <span class="label">Costo medida:</span>
                  <div class="costo-final-container">
                    <span class="valor costo-medida">${{ formatearPrecio(gananciasCalculadas[medida].costoBase) }}</span>
                    <button
                      type="button"
                      class="costo-fuente-badge costo-fuente-btn"
                      :class="'costo-fuente-' + (gananciasCalculadas[medida].costoFuente || 'ninguno')"
                      :title="`${gananciasCalculadas[medida].costoFuenteTexto} · tocar para cambiar el costo`"
                      @click="abrirEdicionCosto(medida, 'limpio')"
                    >{{ gananciasCalculadas[medida].costoFuente ? gananciasCalculadas[medida].costoFuenteTexto : 'Sin costo · agregar' }} ✏️</button>
                  </div>
                </div>
                <div class="ganancia-item">
                  <span class="label">Costo Final:</span>
                  <div class="costo-final-container">
                    <span class="valor costo-final">${{ formatearPrecio(gananciasCalculadas[medida].costoFinal) }}</span>
                    <label class="toggle-costo-extra" :class="{ activo: debeAplicarCostoExtra(medida) }">
                      <input
                        type="checkbox"
                        :checked="debeAplicarCostoExtra(medida)"
                        @change="cambiarCostoExtra(medida, $event.target.checked)"
                      >
                      + ${{ costoExtraEfectivo }} costo extra
                    </label>
                  </div>
                </div>
                <div class="ganancia-item">
                  <span class="label">Ganancia/kg:</span>
                  <span class="valor ganancia-unitaria" 
                        :class="{ 
                          'ganancia-positiva': gananciasCalculadas[medida].gananciaUnitaria > 0,
                          'ganancia-negativa': gananciasCalculadas[medida].gananciaUnitaria < 0
                        }">
                    ${{ formatearPrecio(gananciasCalculadas[medida].gananciaUnitaria) }}
                  </span>
                </div>
                <div class="ganancia-item ganancia-total-item">
                  <span class="label">Ganancia Total:</span>
                  <span class="valor ganancia-total"
                        :class="{ 
                          'ganancia-positiva': gananciasCalculadas[medida].gananciaTotal > 0,
                          'ganancia-negativa': gananciasCalculadas[medida].gananciaTotal < 0
                        }">
                    ${{ formatearPrecio(gananciasCalculadas[medida].gananciaTotal) }}
                  </span>
                </div>
                <div
                  v-if="gananciasCalculadas[medida].detallesPorCliente.length"
                  class="detalles-clientes detalles-clientes-limpio"
                >
                  <h5>Precio por cliente<span v-if="puedeEditarPrecio(medida)" class="ayuda-editar-precio"> · toca para editar</span>:</h5>
                  <div
                    v-for="detalle in gananciasCalculadas[medida].detallesPorCliente"
                    :key="detalle.cliente + '-' + detalle.precioVenta + '-' + detalle.origen"
                    class="detalle-cliente"
                    :class="{ 'detalle-cliente-editable': puedeEditarPrecio(medida), 'detalle-cliente-refri': detalle.noCuenta }"
                    :role="puedeEditarPrecio(medida) ? 'button' : null"
                    :tabindex="puedeEditarPrecio(medida) ? 0 : null"
                    :aria-label="puedeEditarPrecio(medida) ? `Editar precio de ${detalle.cliente}` : null"
                    @click="abrirEdicionPrecio(medida, detalle)"
                    @keydown.enter.prevent="abrirEdicionPrecio(medida, detalle)"
                  >
                    <span class="cliente-nombre">{{ detalle.cliente }}:</span>
                    <span class="cliente-kilos">{{ formatearNumero(detalle.totalEmbarcado) }}kg</span>
                    <span class="cliente-precio">{{ detalle.precioVenta ? '$' + formatearPrecioVenta(detalle.precioVenta) : '—' }}</span>
                    <span v-if="detalle.noCuenta" class="cliente-ganancia cliente-no-cuenta" title="Se refrigeró, no se vendió: no cuenta en la ganancia del día">no cuenta</span>
                    <span v-else class="cliente-ganancia" :class="{
                      'ganancia-positiva': detalle.gananciaTotal > 0,
                      'ganancia-negativa': detalle.gananciaTotal < 0
                    }">
                      ${{ formatearPrecio(detalle.gananciaTotal) }}
                    </span>
                    <span v-if="detalle.noCuenta" class="fuente-precio" title="Refri: se refrigeró, no se vendió">🧊</span>
                    <span v-else class="fuente-precio" :title="describirOrigenPrecio(detalle)">
                      {{ iconoOrigenPrecio(detalle.origen) }}
                    </span>
                  </div>
                  <div
                    v-if="gananciasCalculadas[medida].detallesPorCliente.length > 1"
                    class="detalle-cliente detalle-cliente-total"
                  >
                    <span class="cliente-nombre">Total:</span>
                    <span class="cliente-kilos">{{ formatearNumero(sumarKilosDetalle(gananciasCalculadas[medida].detallesPorCliente)) }}kg</span>
                    <span class="cliente-precio" title="Precio promedio ponderado por kilos">${{ formatearPrecioVenta(gananciasCalculadas[medida].precioVenta) }}</span>
                    <span class="cliente-ganancia" :class="{
                      'ganancia-positiva': gananciasCalculadas[medida].gananciaTotal > 0,
                      'ganancia-negativa': gananciasCalculadas[medida].gananciaTotal < 0
                    }">
                      ${{ formatearPrecio(gananciasCalculadas[medida].gananciaTotal) }}
                    </span>
                    <span class="fuente-precio" aria-hidden="true">Σ</span>
                  </div>
                  <p class="leyenda-origen-precio">✋ manual · 📌 del cliente · 🌐 general<template v-if="gananciasCalculadas[medida].kilosRefri"> · 🧊 refri: no se vendió, no cuenta en la ganancia ni en el total</template></p>
                </div>
                <p v-if="gananciasCalculadas[medida].kilosSinPrecio > 0" class="aviso-sin-precio aviso-kilos-sin-precio">
                  ⚠️ {{ formatearNumero(gananciasCalculadas[medida].kilosSinPrecio) }} kg sin precio no entran en la ganancia:
                  <template v-for="clienteSinPrecio in gananciasCalculadas[medida].clientesSinPrecio">
                    <button
                      v-if="puedeEditarPrecio(medida)"
                      :key="'sp-' + clienteSinPrecio"
                      type="button"
                      class="btn-cliente-sin-precio"
                      @click="abrirEdicionPrecio(medida, { cliente: clienteSinPrecio, precioVenta: null, origen: null })"
                    >✏️ {{ clienteSinPrecio }}</button>
                    <span v-else :key="'sp-' + clienteSinPrecio">{{ clienteSinPrecio }} </span>
                  </template>
                </p>
                <div v-if="gananciasCalculadas[medida].fechaPrecio" class="ganancia-fecha">
                  <span class="fecha-precio">Precio del: {{ formatearFecha(gananciasCalculadas[medida].fechaPrecio) }}</span>
                </div>
              </div>
            </div>
            
            <!-- Mensaje cuando no hay precio de venta -->
            <div v-else-if="analizarGanancia[medida]" class="sin-precio-venta">
              <p class="aviso-sin-precio">⚠️ No se encontró precio de venta para esta medida</p>
            </div>
            
            <!-- Sección de maquila ganancia -->
            <div v-if="analizarMaquilaGanancia[medida]" class="maquila-ganancia-info">
              <div class="maquila-ganancia-header">
                <h4>🏭 Maquila Ganancia</h4>
              </div>
              <div class="maquila-ganancia-detalles">
                <div class="ganancia-item">
                  <span class="label">Kilos Embarcados:</span>
                  <span class="valor">{{ formatearNumero(obtenerTotalEmbarcado(medida)) }} kg</span>
                </div>
                <div class="ganancia-item">
                  <span class="label">Precio Maquila:</span>
                  <span class="valor precio-maquila">${{ formatearPrecioConDecimales(precioMaquilaEfectivo(medida)) }}</span>
                </div>
                <div class="ganancia-item ganancia-total-item">
                  <span class="label">Ganancia Total Maquila:</span>
                  <span class="valor ganancia-total ganancia-positiva">
                    ${{ formatearPrecio(calcularGananciaMaquila(medida)) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

      <!-- Sección de Ganancias de Crudos -->
      <div v-if="embarqueData && obtenerTallasCrudosUnicas().length > 0" class="crudos-ganancias-section">
        <h2>💰 Ganancias de Crudos por Talla</h2>
        
        <div class="crudos-ganancias-grid">
          <div v-for="talla in obtenerTallasCrudosUnicas()" :key="'crudo-' + talla" class="crudo-ganancia-card">
            <div class="crudo-ganancia-header">
              <h4>{{ talla }}</h4>
              <div class="crudo-ganancia-controls">
                <label class="checkbox-container">
                  <input 
                    type="checkbox" 
                    v-model="analizarGananciaCrudos[talla]"
                    @change="guardarEstadoAnalisisCrudos"
                  >
                  <span class="checkmark"></span>
                  Analizar ganancia
                </label>
              </div>
            </div>
            
            <!-- Información de ganancia -->
            <div v-if="gananciasCalculadasCrudos[talla] && analizarGananciaCrudos[talla]" class="crudo-ganancia-info">
              <div class="crudo-ganancia-detalles">
                <div class="ganancia-item">
                  <span class="label">Total Kilos:</span>
                  <span class="valor">{{ formatearNumero(gananciasCalculadasCrudos[talla].totalKilos) }} kg</span>
                </div>
                <div class="ganancia-item">
                  <span class="label">Precio Promedio:</span>
                  <div class="precio-container">
                    <span class="valor precio-venta">${{ formatearPrecio(gananciasCalculadasCrudos[talla].precioVenta) }}</span>
                    <span v-if="gananciasCalculadasCrudos[talla].hayPreciosIndividuales" 
                          class="precio-individual-badge"
                          title="Incluye precios individuales">
                      📝 Individual
                    </span>
                    <span v-else class="precio-sistema-badge" title="Precio del sistema">
                      🌐 Sistema
                    </span>
                  </div>
                </div>
                <div class="ganancia-item">
                  <span class="label">Costo/kg:</span>
                  <div class="costo-final-container">
                    <span class="valor costo-base">${{ formatearPrecioConDecimales(gananciasCalculadasCrudos[talla].costoBase) }}</span>
                    <button
                      type="button"
                      class="costo-fuente-badge costo-fuente-btn"
                      :class="'costo-fuente-' + (gananciasCalculadasCrudos[talla].costoFuente || 'ninguno')"
                      :title="`${gananciasCalculadasCrudos[talla].costoFuenteTexto} + $${gananciasCalculadasCrudos[talla].sobrecostoKg} de crudo · tocar para cambiar el costo`"
                      @click="abrirEdicionCosto(talla, 'crudo')"
                    >{{ gananciasCalculadasCrudos[talla].costoFuente ? gananciasCalculadasCrudos[talla].costoFuenteTexto : 'Sin costo · agregar' }} + ${{ gananciasCalculadasCrudos[talla].sobrecostoKg }} ✏️</button>
                  </div>
                </div>
                <div class="ganancia-item">
                  <span class="label">Ganancia/kg:</span>
                  <span class="valor ganancia-unitaria" 
                        :class="{ 
                          'ganancia-positiva': gananciasCalculadasCrudos[talla].gananciaUnitaria > 0,
                          'ganancia-negativa': gananciasCalculadasCrudos[talla].gananciaUnitaria < 0
                        }">
                    ${{ formatearPrecio(gananciasCalculadasCrudos[talla].gananciaUnitaria) }}
                  </span>
                </div>
                <div class="ganancia-item ganancia-total-item">
                  <span class="label">Ganancia Total:</span>
                  <span class="valor ganancia-total"
                        :class="{ 
                          'ganancia-positiva': gananciasCalculadasCrudos[talla].gananciaTotal > 0,
                          'ganancia-negativa': gananciasCalculadasCrudos[talla].gananciaTotal < 0
                        }">
                    ${{ formatearPrecio(gananciasCalculadasCrudos[talla].gananciaTotal) }}
                  </span>
                </div>
                
                <!-- Detalles por cliente (solo si hay precios diferentes) -->
                <div v-if="deberMostrarDetallePorCliente(talla)" class="detalles-clientes">
                  <h5>Detalle por Cliente:</h5>
                  <div v-for="detalle in gananciasCalculadasCrudos[talla].detallesPorCliente" :key="detalle.cliente" class="detalle-cliente">
                    <span class="cliente-nombre">{{ detalle.cliente }}:</span>
                    <span class="cliente-kilos">{{ formatearNumero(detalle.kilos) }}kg</span>
                    <span class="cliente-precio">${{ formatearPrecio(detalle.precioVenta) }}</span>
                    <span class="cliente-ganancia" :class="{ 
                      'ganancia-positiva': detalle.gananciaTotal > 0,
                      'ganancia-negativa': detalle.gananciaTotal < 0
                    }">
                      ${{ formatearPrecio(detalle.gananciaTotal) }}
                    </span>
                    <span class="fuente-precio" :title="'Fuente del precio: ' + detalle.fuentePrecio">
                      {{ detalle.fuentePrecio === 'individual' ? '📝' : detalle.fuentePrecio === 'sistema-especifico' ? '📌' : '🌐' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Mensaje cuando no hay análisis activado -->
            <div v-else-if="!analizarGananciaCrudos[talla]" class="sin-analisis-crudo">
              <p class="aviso-sin-analisis">Activar análisis de ganancia para ver detalles</p>
            </div>
            
            <!-- Mensaje cuando no hay datos -->
            <div v-else class="sin-datos-crudo">
              <p class="aviso-sin-datos">⚠️ No se encontraron datos de venta para esta talla</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else-if="activeVistaTab === 'sacada-hoy'" class="resumen-dia-panel">
      <p v-if="resumenSacadaHoy.loading" class="resumen-dia-estado">
        Cargando resumen de sacadas del embarque...
      </p>
      <p v-else-if="resumenSacadaHoy.error" class="resumen-dia-estado error">
        {{ resumenSacadaHoy.error }}
      </p>
      <template v-else-if="resumenSacadaHoy.disponible">
        <p class="resumen-dia-total">Total Entradas: {{ formatearKg(resumenSacadaHoy.totalEntradas) }} kg</p>
        <p class="resumen-dia-total">Total Salidas: {{ formatearKg(resumenSacadaHoy.totalSalidas) }} kg</p>

        <h4>Salidas clientes:</h4>
        <table class="resumen-dia-table">
          <thead>
            <tr>
              <th>Medida</th>
              <th>Total (kg)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!resumenSacadaHoy.salidasClientes.length">
              <td colspan="2">Sin salidas de clientes registradas para la fecha del embarque.</td>
            </tr>
            <tr v-for="item in resumenSacadaHoy.salidasClientes" :key="item.key">
              <td>{{ item.medida }} ({{ item.proveedor }})</td>
              <td>{{ formatearKg(item.total) }}</td>
            </tr>
          </tbody>
        </table>

        <h4>Salidas maquilas:</h4>
        <table class="resumen-dia-table">
          <thead>
            <tr>
              <th>Maquila</th>
              <th>Medida</th>
              <th>Total (kg)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!resumenSacadaHoy.salidasMaquilas.length">
              <td colspan="3">Sin salidas de maquila registradas para la fecha del embarque.</td>
            </tr>
            <tr v-for="fila in resumenSacadaHoy.salidasMaquilas" :key="fila.key">
              <td>{{ fila.maquila }}</td>
              <td>{{ fila.medida }}</td>
              <td>{{ formatearKg(fila.total) }}</td>
            </tr>
          </tbody>
        </table>
      </template>
      <p v-else class="resumen-dia-estado">
        No hay sacadas registradas para la fecha del embarque.
      </p>
    </div>

    <div v-else-if="activeVistaTab === 'medidas-hoy'" class="medidas-hoy-panel">
      <h3 class="medidas-hoy-title">Medidas para hoy</h3>
      <p v-if="embarqueData?.fecha" class="medidas-hoy-fecha">
        Fecha embarque: {{ formatearFecha(embarqueData.fecha) }}
      </p>
      <p v-if="medidasParaHoyPanel.loading" class="resumen-dia-estado">
        Cargando lista de medidas del día...
      </p>
      <p v-else-if="medidasParaHoyPanel.error" class="resumen-dia-estado error">
        {{ medidasParaHoyPanel.error }}
      </p>
      <template v-else>
        <p v-if="!medidasParaHoyPanel.grupos.length" class="resumen-dia-estado">
          No hay lista de medidas guardada en sacadas para la fecha de este embarque.
        </p>
        <MedidasParaHoyCards v-else :grupos="medidasParaHoyPanel.grupos" />
      </template>
    </div>

    <div v-if="mostrarModal" class="modal-overlay">
      <div class="modal-content">
        <h3>Agregar Nota</h3>
        <textarea 
          v-model="nota" 
          placeholder="Escriba su nota aquí..."
          rows="4"
        ></textarea>
        <div class="modal-buttons">
          <button @click="guardarNota" class="btn-guardar">Guardar</button>
          <button @click="cerrarModal" class="btn-cancelar">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- Modal de Configuración de Pesos -->
    <div v-if="mostrarModalConfiguracion" class="modal-overlay">
      <div class="modal-content">
        <h3>Configurar Pesos de Taras</h3>
        <div class="configuracion-grid">
          <div class="config-item">
            <label>Peso para cálculo de costos:</label>
            <input 
              type="number" 
              v-model="pesoTaraCosto" 
              min="1" 
              max="50"
              placeholder="Peso en kg"
            >
            <small class="config-help">Peso por defecto usado para calcular costos de crudos</small>
          </div>
          <div class="config-item">
            <label>Peso para cálculo de ventas:</label>
            <input 
              type="number" 
              v-model="pesoTaraVenta" 
              min="1" 
              max="50"
              placeholder="Peso en kg"
            >
            <small class="config-help">Peso por defecto usado para calcular ventas de crudos</small>
          </div>
        </div>
        <div class="modal-buttons">
          <button @click="guardarConfiguracion" class="btn-guardar">Guardar</button>
          <button @click="cerrarModalConfiguracion" class="btn-cancelar">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- Modal: editar el precio de un cliente desde la tarjeta de ganancia -->
    <div v-if="edicionPrecio" class="modal-overlay" @click.self="cerrarEdicionPrecio">
      <div class="modal-content modal-editar-precio" role="dialog" aria-modal="true" aria-labelledby="titulo-editar-precio">
        <h3 id="titulo-editar-precio">Precio de {{ edicionPrecio.cliente }} · {{ edicionPrecio.medida }}</h3>
        <p class="editar-precio-actual">
          <template v-if="edicionPrecio.precioActual">
            Actual: <strong>${{ formatearPrecioVenta(edicionPrecio.precioActual) }}</strong>
            {{ iconoOrigenPrecio(edicionPrecio.origen) }} {{ textoOrigenCorto(edicionPrecio.origen) }}
          </template>
          <template v-else>Sin precio en este embarque</template>
        </p>

        <label class="editar-precio-label" for="nuevo-precio-cliente">Nuevo precio por kg</label>
        <input
          id="nuevo-precio-cliente"
          ref="inputNuevoPrecio"
          v-model="edicionPrecio.nuevoPrecio"
          type="number"
          min="0"
          step="0.5"
          inputmode="decimal"
          class="editar-precio-input"
          placeholder="$ por kg"
          @keydown.enter.prevent="guardarEdicionPrecio"
        >

        <p class="editar-precio-label">¿Dónde aplica?</p>
        <div class="editar-precio-opciones" role="radiogroup">
          <label class="editar-precio-opcion" :class="{ activa: edicionPrecio.alcance === 'embarque' }">
            <input v-model="edicionPrecio.alcance" type="radio" value="embarque">
            <span>
              <strong>✋ Solo en este embarque</strong>
              <small>Cambia las líneas de {{ edicionPrecio.cliente }} de {{ edicionPrecio.medida }} en este embarque. No toca la lista de precios.</small>
            </span>
          </label>
          <label
            class="editar-precio-opcion"
            :class="{ activa: edicionPrecio.alcance === 'cliente', deshabilitada: !edicionPrecio.clienteId }"
          >
            <input v-model="edicionPrecio.alcance" type="radio" value="cliente" :disabled="!edicionPrecio.clienteId">
            <span>
              <strong>📌 Precio específico de {{ edicionPrecio.cliente }}</strong>
              <small v-if="edicionPrecio.clienteId">Lo guarda en Precios como su precio propio desde el {{ formatearFecha(edicionPrecio.fecha) }}: aplica a este y a los siguientes embarques.</small>
              <small v-else>{{ edicionPrecio.cliente }} no está en la lista de clientes de Precios.</small>
            </span>
          </label>
          <label class="editar-precio-opcion" :class="{ activa: edicionPrecio.alcance === 'general' }">
            <input v-model="edicionPrecio.alcance" type="radio" value="general">
            <span>
              <strong>🌐 Nuevo precio general</strong>
              <small>Lo guarda en Precios como precio general de {{ edicionPrecio.medidaPrecio }} desde el {{ formatearFecha(edicionPrecio.fecha) }}. Cambia a todos los clientes que van con el general; los que tienen precio propio o manual lo conservan.</small>
            </span>
          </label>
          <label
            v-if="edicionPrecio.alcance === 'general' && edicionPrecio.origen === 'especifico' && edicionPrecio.clienteId"
            class="editar-precio-quitar"
          >
            <input v-model="edicionPrecio.quitarPropio" type="checkbox">
            Quitar el precio propio de {{ edicionPrecio.cliente }} (pasa al general)
          </label>
        </div>

        <p class="editar-precio-nota">Las cuentas de clientes que ya se generaron no cambian solas.</p>
        <p v-if="edicionPrecio.error" class="editar-precio-error" role="alert">{{ edicionPrecio.error }}</p>

        <div class="modal-buttons">
          <button type="button" class="btn-guardar" :disabled="edicionPrecio.guardando" @click="guardarEdicionPrecio">
            {{ edicionPrecio.guardando ? 'Guardando…' : 'Guardar' }}
          </button>
          <button type="button" class="btn-cancelar" :disabled="edicionPrecio.guardando" @click="cerrarEdicionPrecio">Cancelar</button>
        </div>
      </div>
    </div>

    <div v-if="avisoPrecio" class="aviso-precio-guardado" role="status" @click="avisoPrecio = ''">{{ avisoPrecio }}</div>

    <!-- Modal: costo de una medida desde la tarjeta de ganancia -->
    <div v-if="edicionCosto" class="modal-overlay" @click.self="cerrarEdicionCosto">
      <div class="modal-content modal-editar-precio" role="dialog" aria-modal="true" aria-labelledby="titulo-editar-costo">
        <h3 id="titulo-editar-costo">Costo de {{ edicionCosto.clave }}</h3>
        <p class="editar-precio-actual">
          <template v-if="edicionCosto.costoActual">
            Actual: <strong>${{ formatearPrecioVenta(edicionCosto.costoActual) }}</strong> · {{ edicionCosto.fuenteTexto }}
          </template>
          <template v-else>Sin costo registrado: la ganancia sale inflada.</template>
        </p>
        <p v-if="edicionCosto.clave !== edicionCosto.medida" class="editar-precio-nota editar-costo-nota-base">
          {{ edicionCosto.medida }} usa el costo de {{ edicionCosto.clave }}.
        </p>

        <template v-if="edicionCosto.proveedores.length > 1">
          <p class="editar-precio-label">Proveedor ({{ edicionCosto.proveedores.length }} en el catálogo)</p>
          <div class="editar-precio-opciones">
            <button
              v-for="proveedor in edicionCosto.proveedores"
              :key="proveedor.costoKey"
              type="button"
              class="editar-precio-opcion opcion-proveedor"
              :class="{ activa: proveedor.costoKey === edicionCosto.proveedorActual }"
              :disabled="edicionCosto.guardando"
              @click="elegirProveedorCosto(proveedor)"
            >
              <span>
                <strong>{{ proveedor.proveedorNombre || 'Sin proveedor' }} · ${{ formatearPrecioVenta(proveedor.costoBase) }}</strong>
                <small>{{ proveedor.costoKey === edicionCosto.proveedorActual ? 'En uso' : 'Usar este' }} · del {{ formatearFecha(proveedor.fechaTexto) }}</small>
              </span>
            </button>
          </div>
          <p class="editar-precio-nota editar-costo-nota-base">Se recuerda como default de {{ edicionCosto.clave }} para los siguientes días.</p>
          <p class="editar-precio-label">O escribe otro costo:</p>
        </template>

        <label class="editar-precio-label" for="nuevo-costo-medida">Costo por kg{{ edicionCosto.tipo === 'crudo' ? ' (sin los $3.50 de crudo)' : ' (en crudo, antes de rendimiento)' }}</label>
        <input
          id="nuevo-costo-medida"
          ref="inputNuevoCosto"
          v-model="edicionCosto.nuevoCosto"
          type="number"
          min="0"
          step="0.5"
          inputmode="decimal"
          class="editar-precio-input"
          placeholder="$ por kg"
          @keydown.enter.prevent="guardarEdicionCosto"
        >

        <label class="recordar-costo" :class="{ deshabilitada: !enLinea }">
          <input v-model="edicionCosto.recordar" type="checkbox" :disabled="!enLinea">
          <span>
            <strong>Recordar para los siguientes días</strong>
            <small v-if="enLinea">Lo guarda en el catálogo de costos desde el {{ formatearFecha(edicionCosto.fecha) }}: este y los siguientes embarques con {{ edicionCosto.clave }} lo usan solos. Desmarcado: solo este embarque.</small>
            <small v-else>Sin internet: se guarda solo en este embarque.</small>
          </span>
        </label>

        <p v-if="edicionCosto.error" class="editar-precio-error" role="alert">{{ edicionCosto.error }}</p>

        <div class="modal-buttons">
          <button type="button" class="btn-guardar" :disabled="edicionCosto.guardando" @click="guardarEdicionCosto">
            {{ edicionCosto.guardando ? 'Guardando…' : 'Guardar' }}
          </button>
          <button type="button" class="btn-cancelar" :disabled="edicionCosto.guardando" @click="cerrarEdicionCosto">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- Modal de costos faltantes -->
    <div v-if="mostrarModalCostosFaltantes" class="modal-overlay">
      <div class="modal-content">
        <h3>Faltan costos del día</h3>
        <p class="modal-descripcion">
          Estas medidas del embarque no tienen costo registrado ni en embarques
          anteriores ni en el catálogo. Sin costo, la ganancia sale inflada.
          Captura el costo por kg o usa Omitir.
        </p>
        <div class="costos-faltantes-lista">
          <div v-for="medida in costosFaltantes" :key="medida" class="costo-faltante-row">
            <span class="costo-faltante-medida">{{ medida }}</span>
            <input
              type="number"
              v-model="costosFaltantesInputs[medida]"
              min="0"
              step="0.01"
              inputmode="decimal"
              placeholder="$ por kg"
              class="costo-faltante-input"
              aria-label="Costo por kg"
            >
            <button type="button" @click="guardarCostoFaltante(medida)" class="btn-guardar btn-chico">Guardar</button>
            <button type="button" @click="omitirCostoFaltante(medida)" class="btn-cancelar btn-chico">Omitir</button>
          </div>
        </div>
        <label class="recordar-costo">
          <input v-model="recordarCostosFaltantes" type="checkbox">
          <span>
            <strong>Recordar para los siguientes días</strong>
            <small>Se guarda en el catálogo de costos: cuando vuelva a salir la medida ya no se pregunta.</small>
          </span>
        </label>
        <div class="modal-buttons">
          <button type="button" @click="omitirTodosCostosFaltantes" class="btn-cancelar">Omitir todas</button>
          <button type="button" @click="cerrarModalCostosFaltantes" class="btn-cancelar">Cerrar</button>
        </div>
      </div>
    </div>

    <PesadasDelDiaModal
      :abierto="pesadasModal.abierto"
      :cargando="pesadasModal.cargando"
      :error="pesadasModal.error"
      :fecha="pesadasModal.fecha"
      :fecha-texto="pesadasModal.fechaTexto"
      :comparacion="comparacionPesadas"
      :tiene-pesadas="pesadasModal.tienePesadas"
      :mensaje-vacio="pesadasModal.mensajeVacio"
      @cerrar="cerrarPesadasDelDia"
    />

  </div>
</template>

<script>
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, where, orderBy, limit, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { escribirCamposEmbarque } from '@/services/embarqueEscritura';
import {
  CAMPOS_RENDIMIENTOS,
  equivalentes,
  esErrorConflictoEmbarque,
  fotoCampos,
  integrarCamposEnBase,
  prepararPayloadServidor,
} from '@/utils/embarqueRevision';
import { debounce } from 'lodash';
import { generarPDFRendimientos } from '@/utils/RendimientosPdf';
import { normalizarGruposListaMedidasParaPdf } from '@/utils/pdf/sacadas';
import MedidasParaHoyCards from '@/components/Existencias/MedidasParaHoyCards.vue';
import EmbarquesOfflineService from '@/services/EmbarquesOfflineService';
import { formatearFecha } from '@/utils/formatters';
import { normalizarNombreProductoPrecio, obtenerClavesBusquedaMedida, normalizarMedida } from '@/utils/preciosHistoricos';
import { obtenerGrupoPreciosPorNombre } from '@/utils/preciosAliasCatalogo';
import {
  SOBRECOSTO_CRUDO_KG,
  resolverPrecioCatalogo,
  precioVentaDeProducto,
  calcularGananciaLimpio,
  resolverCostoMedida,
  describirFuenteCosto,
  normalizarCostoExtra,
  calcularCostoFinalKg,
  calcularGananciaCrudo,
  precioMaquilaPonderado,
  aplicarPrecioEnClientes,
  categoriaProductoPrecio,
  entradaCatalogoCosto,
  normalizarMedidaCosto as normalizarMedidaCatalogoCosto,
  proveedorActivoParaMedida,
  ordenarProveedoresDefault,
  DOC_PROVEEDOR_ACTIVO,
  aplicaCostoExtra
} from '@/utils/gananciasRendimientos';
import { normalizarNombreMedida, renombrarMedidaRendimientos } from '@/utils/renombrarMedidaRendimientos';
import { formatoFechaPesadas } from '@/utils/pesadas';
import { agruparPesadasPorMedida, compararDespiqueEmbarcado, fechaPesadasDelEmbarque, filtrarPesadasPorDia } from '@/utils/pesadasPorMedida';
import PesadasDelDiaModal from './components/PesadasDelDiaModal.vue';

import {
  formatearKg,
  deepClone,
  combinarKilosCrudos,
  fusionarKilosCrudosSiVacio,
  toLocalYMD,
  normalizarFecha,
  obtenerClienteIdParaPrecios,
  obtenerNombreClienteDeId,
  calcularTotalKilos,
  calcularTotalTaras,
  calcularTotalBolsas,
  esMedidaMix,
  esMedidaRefri,
  formatearPrecio,
  formatearPrecioConDecimales,
  formatearNumero
} from '@/utils/rendimientosCalculos';
export default {
  name: 'Rendimientos',
  components: {
    MedidasParaHoyCards,
    PesadasDelDiaModal
  },
  data() {
    return {
      kilosCrudos: {},
      medidasUnicas: [],
      embarqueData: null,
      guardadoAutomaticoActivo: false,
      nombresMedidasPersonalizados: {},
      edicionNombreMedida: null,
      mostrarModal: false,
      nota: '',
      medidaOculta: {},
      preciosVenta: {},
      gananciasCalculadas: {},
      gananciasCalculadasCrudos: {}, // Nueva propiedad para ganancias de crudos
      analizarGanancia: {},
      analizarGananciaCrudos: {}, // Nueva propiedad para controlar análisis de crudos
      rendimientoManual: {},
      aplicarCostoExtra: {}, // Para controlar a qué medidas aplicar costo extra
      costoExtraDecidido: {}, // Medidas donde el usuario prendió/apagó el costo extra
      // Configuración de pesos por defecto
      pesoTaraCosto: 19, // Peso por defecto para cálculo de costos
      pesoTaraVenta: 20, // Peso por defecto para cálculo de ventas
      mostrarModalConfiguracion: false,
      // Prompt de costos faltantes: medidas del embarque actual sin costo
      // en ningún lado (ni embarques anteriores ni catálogo).
      mostrarModalCostosFaltantes: false,
      costosFaltantes: [],
      costosFaltantesInputs: {},
      costosPromptMostrado: false,
      analizarMaquilaGanancia: {},
      precioMaquila: {},
      costosCalculados: {}, // Cache de costos calculados para cada medida
      costosGlobalesCache: null, // Cache de costos globales
      // Ids de los embarques (camiones) del mismo día que se combinan en esta vista.
      idsEmbarquesRelacionados: [],
      // Modal "Editar precio" de un cliente desde la tarjeta de ganancia.
      edicionPrecio: null,
      // Modal "Costo de la medida" desde la tarjeta de ganancia.
      edicionCosto: null,
      // Aviso de costos faltantes: guardar también en el catálogo (siguientes días).
      recordarCostosFaltantes: true,
      avisoPrecio: '',
      // Regla refri (solo ganancia): costo/precio de la medida base y
      // rendimiento del día anterior de la base. Cache del embarque
      // del día anterior y de sus rendimientos por medida.
      embarqueDiaAnteriorCache: null,
      embarqueDiaAnteriorFecha: '',
      rendimientoDiaAnteriorCache: {},
      activeVistaTab: 'rendimientos',
      resumenSacadaHoy: {
        loading: false,
        disponible: false,
        totalEntradas: 0,
        totalSalidas: 0,
        salidasClientes: [],
        salidasMaquilas: [],
        error: ''
      },
      medidasParaHoyPanel: {
        loading: false,
        error: '',
        grupos: []
      },
      _revBase: 0,
      _baseCamposRendimientos: null,
      _hidratandoRendimientos: false,
      avisoConflicto: '',
      avisoError: '',
      pesadasModal: {
        abierto: false,
        cargando: false,
        error: '',
        fecha: '',
        fechaTexto: '',
        grupos: [],
        totalKilos: 0,
        totalTaras: 0,
        tieneTaras: false,
        tienePesadas: false,
        mensajeVacio: ''
      },
      _clavesEnConflicto: [],
      _clavesConservarMio: []
    }
  },

  computed: {
    comparacionPesadas() {
      const embarcado = [];
      for (const cliente of this.embarqueData?.clientes || []) {
        for (const producto of cliente.productos || []) {
          if (!producto.medida) continue;
          const kilos = producto.tipo === 'c/h20'
            ? this.calcularTotalBolsas(producto) * (parseFloat(producto.camaronNeto) || 0.65)
            : this.calcularTotalKilos(producto);
          embarcado.push({ medida: producto.medida, kilos });
        }
      }
      return compararDespiqueEmbarcado(this.pesadasModal.tienePesadas ? this.pesadasModal.grupos : [], embarcado);
    },
    // Total general de ganancias del día (limpios + crudos + maquila).
    // Reutiliza el cálculo existente para que la barra fija se actualice
    // en vivo al prender/apagar checks o cambiar costos.
    totalGeneralGanancias() {
      return this.calcularTotalGeneralGanancias();
    },
    enLinea() {
      return typeof navigator === 'undefined' ? true : navigator.onLine;
    },
    costoExtraEfectivo() {
      return normalizarCostoExtra(this.embarqueData?.costoExtra);
    },
    // Cantidad de costos faltantes pendientes (para el botón de la barra).
    costosFaltantesPendientes() {
      if (!this.embarqueData) return 0;
      return this.medidasSinCostoConKilos().length;
    },
    resumenAnalisisGanancia() {
      const limpios = (this.medidasUnicas || [])
        .filter(medida => this.analizarGanancia[medida] && !this.medidaOculta[medida]).length;
      const crudos = Object.values(this.analizarGananciaCrudos || {}).filter(Boolean).length;
      const maquila = Object.entries(this.analizarMaquilaGanancia || {})
        .filter(([medida, activo]) => activo && !this.medidaOculta[medida]).length;
      const partes = [];
      if (limpios) partes.push(`${limpios} ${limpios === 1 ? 'medida' : 'medidas'}`);
      if (crudos) partes.push(`${crudos} ${crudos === 1 ? 'talla' : 'tallas'} de crudo`);
      if (maquila) partes.push(`${maquila} maquila`);
      return partes.length ? `Analizando: ${partes.join(' · ')}` : 'Sin medidas en análisis';
    }
  },

  async created() {
    this.guardarCambiosEnTiempoReal = debounce(this.guardarCambiosEnTiempoReal, 300);
    this.programarGuardadoAnalisis = debounce(() => this.guardarEstadoAnalisis(), 300);

    await EmbarquesOfflineService.init();
    window.addEventListener('online', this.syncOfflineRendimientos);

    const embarqueId = this.$route.params.id;
    let registroOffline = null;
    try {
      registroOffline = await EmbarquesOfflineService.getById(embarqueId);
    } catch (error) {
      console.warn('[Rendimientos] No se pudo obtener el registro offline:', error);
    }

    if (registroOffline?.preciosVentaCache && Object.keys(this.preciosVenta).length === 0) {
      this.preciosVenta = this.deepClone(registroOffline.preciosVentaCache);
    }

    if (!navigator.onLine && registroOffline) {
      await this.cargarEmbarquesRelacionadosOffline(embarqueId, registroOffline);
      await this.precargarCostos();
      this.$nextTick(() => {
        this.calcularGanancias();
        this.calcularGananciasCrudos();
      });
      return;
    }

    if (navigator.onLine) await this.syncOfflineRendimientos();
    await this.cargarEmbarque();
    await this.prellenarCostosDesdeEmbarqueAnterior();
    await this.cargarPreciosVenta();
    await this.precargarCostos();
    await this.cargarResumenSacadasHoy();
    this.preguntarCostosFaltantes();
  },

  // Recargar datos cuando se vuelve a este componente
  async activated() {
    console.log('Recargando datos de rendimientos...');
    // Los cachés dependen del embarque (fecha y día anterior): al volver a
    // la pantalla se recalculan para no usar costos de otra visita.
    this.costosGlobalesCache = null;
    this.rendimientoDiaAnteriorCache = {};
    this.embarqueDiaAnteriorFecha = '';
    this.embarqueDiaAnteriorCache = null;
    const embarqueId = this.$route.params.id;
    const registroOffline = await EmbarquesOfflineService.getById(embarqueId).catch(() => null);

    if (!navigator.onLine && registroOffline) {
      await this.cargarEmbarquesRelacionadosOffline(embarqueId, registroOffline);
      await this.precargarCostos();
      this.$nextTick(() => {
        this.calcularGanancias();
        this.calcularGananciasCrudos();
      });
      return;
    }

    if (navigator.onLine) await this.syncOfflineRendimientos();
    await this.cargarEmbarque();
    await this.prellenarCostosDesdeEmbarqueAnterior();
    await this.cargarPreciosVenta();
    await this.precargarCostos();
    await this.cargarResumenSacadasHoy();
    this.$nextTick(() => {
      this.calcularGanancias();
      this.calcularGananciasCrudos();
    });
    this.preguntarCostosFaltantes();
  },

      methods: {
    // Funciones puras (sin this) en @/utils/rendimientosCalculos
    formatearKg,
    deepClone,
    combinarKilosCrudos,
    fusionarKilosCrudosSiVacio,
    toLocalYMD,
    normalizarFecha,
    obtenerClienteIdParaPrecios,
    obtenerNombreClienteDeId,
    calcularTotalKilos,
    calcularTotalTaras,
    calcularTotalBolsas,
    esMedidaMix,
    esMedidaRefri,
    formatearPrecio,
    formatearPrecioConDecimales,
    formatearNumero,

        formatearFecha,
    async cargarResumenSacadasHoy() {
      this.resumenSacadaHoy.loading = true;
      this.resumenSacadaHoy.error = '';
      try {
        const fechaEmbarqueISO = this.obtenerFechaISODesdeValor(this.embarqueData?.fecha);

        if (!fechaEmbarqueISO) {
          this.resumenSacadaHoy = {
            ...this.resumenSacadaHoy,
            loading: false,
            disponible: false,
            totalEntradas: 0,
            totalSalidas: 0,
            salidasClientes: [],
            salidasMaquilas: [],
            error: 'No se pudo determinar la fecha del embarque para cargar el resumen de sacadas.'
          };
          return;
        }

        const [year, month, day] = fechaEmbarqueISO.split('-').map(Number);
        const inicio = new Date(year, month - 1, day);
        inicio.setHours(0, 0, 0, 0);
        const fin = new Date(year, month - 1, day);
        fin.setHours(23, 59, 59, 999);

        const db = getFirestore();
        const q = query(
          collection(db, 'sacadas'),
          where('fecha', '>=', inicio),
          where('fecha', '<=', fin)
        );
        const snap = await getDocs(q);

        if (snap.empty) {
          this.resumenSacadaHoy = {
            ...this.resumenSacadaHoy,
            loading: false,
            disponible: false,
            totalEntradas: 0,
            totalSalidas: 0,
            salidasClientes: [],
            salidasMaquilas: []
          };
          return;
        }

        let totalEntradas = 0;
        let totalSalidas = 0;
        const clientesMap = new Map();
        const maquilasMap = new Map();

        snap.docs.forEach((docSnapshot) => {
          const data = docSnapshot.data() || {};
          const entradas = Array.isArray(data.entradas) ? data.entradas : [];
          const salidas = Array.isArray(data.salidas) ? data.salidas : [];

          totalEntradas += Number(data.totalEntradas || entradas.reduce((acc, item) => acc + Number(item.kilos || 0), 0));
          totalSalidas += Number(data.totalSalidas || salidas.reduce((acc, item) => acc + Number(item.kilos || 0), 0));

          salidas
            .filter((item) => item && item.tipo === 'proveedor')
            .forEach((item) => {
              const medida = item.medida || 'Sin medida';
              const proveedor = item.proveedor || 'Sin proveedor';
              const key = `${medida}-${proveedor}`;

              if (!clientesMap.has(key)) {
                clientesMap.set(key, { key, medida, proveedor, total: 0 });
              }
              clientesMap.get(key).total += Number(item.kilos || 0);
            });

          salidas
            .filter((item) => item && item.tipo === 'maquila')
            .forEach((item) => {
              const maquila = item.proveedor || 'Sin maquila';
              const medida = item.medida || 'Sin medida';
              const key = `${maquila}-${medida}`;

              if (!maquilasMap.has(key)) {
                maquilasMap.set(key, { key, maquila, medida, total: 0 });
              }
              maquilasMap.get(key).total += Number(item.kilos || 0);
            });
        });

        this.resumenSacadaHoy = {
          ...this.resumenSacadaHoy,
          loading: false,
          disponible: true,
          totalEntradas,
          totalSalidas,
          salidasClientes: Array.from(clientesMap.values()).sort((a, b) => a.medida.localeCompare(b.medida)),
          salidasMaquilas: Array.from(maquilasMap.values()).sort((a, b) => a.maquila.localeCompare(b.maquila))
        };
      } catch (error) {
        this.resumenSacadaHoy = {
          ...this.resumenSacadaHoy,
          loading: false,
          disponible: false,
          error: 'No se pudo cargar el resumen de sacadas de la fecha del embarque.'
        };
      }
    },
    crearPayloadRendimientos() {
      return {
        kilosCrudos: this.deepClone(this.kilosCrudos),
        medidaOculta: { ...this.medidaOculta },
        analizarGanancia: { ...this.analizarGanancia },
        analizarGananciaCrudos: { ...this.analizarGananciaCrudos },
        rendimientoManual: { ...this.rendimientoManual },
        analizarMaquilaGanancia: { ...this.analizarMaquilaGanancia },
        precioMaquila: { ...this.precioMaquila },
        pesoTaraCosto: Number(this.pesoTaraCosto) || 0,
        pesoTaraVenta: Number(this.pesoTaraVenta) || 0,
        nombresMedidasPersonalizados: { ...this.nombresMedidasPersonalizados },
        notaRendimientos: this.embarqueData?.notaRendimientos || ''
      };
    },
    fijarBaseRendimientos(embarqueData) {
      this._revBase = Number(embarqueData && embarqueData.rev) || 0;
      const foto = fotoCampos(embarqueData || {}, CAMPOS_RENDIMIENTOS);
      try {
        this._baseCamposRendimientos = JSON.parse(JSON.stringify(foto));
      } catch (error) {
        this._baseCamposRendimientos = foto;
      }
      // Una copia recién leída del servidor no arrastra el bloqueo de la sesión anterior.
      this._clavesEnConflicto = [];
      this.avisoConflicto = '';
    },
    mostrarAvisoConflicto(mensaje) {
      this.avisoConflicto = mensaje || (
        'Otro equipo guardó los mismos datos. Lo que escribiste aquí sigue guardado en este equipo. '
        + '«Usar lo de esta pantalla» lo sube y respalda lo del otro equipo en respaldos de emergencia. '
        + '«Usar lo del otro equipo» recarga y deja el valor de ellos.'
      );
    },
    async recargarPantalla() {
      this.avisoConflicto = '';
      this._clavesEnConflicto = [];
      this._clavesConservarMio = [];
      await EmbarquesOfflineService.mergeSave(this.$route.params.id, existing => {
        if (!existing) return null;
        const editorPendiente = Boolean(existing.pendingEditor);
        return {
          record: {
            ...existing,
            clavesEnConflicto: [],
            camposPendientesRendimientos: [],
          },
          options: {
            pendingSync: editorPendiente,
            syncState: editorPendiente ? 'pending' : 'synced',
          },
        };
      }).catch(() => {});
      if (typeof window !== 'undefined' && window.location && typeof window.location.reload === 'function') {
        window.location.reload();
      }
    },
    async reintentarCambiosPendientes() {
      const embarqueId = this.$route.params.id;
      const record = await EmbarquesOfflineService.getById(embarqueId).catch(() => null);
      const claves = (this._clavesConservarMio && this._clavesConservarMio.length)
        ? this._clavesConservarMio
        : ((record && record.clavesEnConflicto) || this._clavesEnConflicto || []);
      if (!claves.length) {
        this.avisoConflicto = '';
        return;
      }
      const payload = this.payloadParaConservar(record, claves);
      await this.persistirCamposRendimientos(payload, { forzar: true, reintentar: true });
      this._clavesConservarMio = [];
      this._clavesEnConflicto = [];
      this.avisoConflicto = '';
      if (record) {
        await this.actualizarOfflineRendimientos(false, payload, { limpiarConflicto: true });
      }
    },
    payloadParaConservar(record, claves) {
      const payload = {};
      const kilosGuardados = (record && record.docData && record.docData.kilosCrudos) || this.kilosCrudos || {};
      const kilos = {};
      (claves || []).forEach(clave => {
        if (clave.indexOf('kilosCrudos.') === 0) {
          const medida = clave.slice('kilosCrudos.'.length);
          if (kilosGuardados[medida] !== undefined) kilos[medida] = kilosGuardados[medida];
          return;
        }
        if (clave === 'kilosCrudos') {
          Object.assign(kilos, kilosGuardados);
          return;
        }
        const origen = (record && record.docData) || {};
        if (origen[clave] !== undefined) payload[clave] = origen[clave];
      });
      if (Object.keys(kilos).length) payload.kilosCrudos = kilos;
      return payload;
    },
    async actualizarOfflineRendimientos(pending, payload = {}, options = {}) {
      const includeInDocData = options.includeInDocData !== false;
      const embarqueId = this.$route.params.id;
      await EmbarquesOfflineService.mergeSave(embarqueId, existing => {
        const base = existing ? { ...existing } : {};
        const clonedPayload = this.deepClone(payload) || {};
        const claves = Object.keys(clonedPayload).filter(clave => CAMPOS_RENDIMIENTOS.includes(clave));
        const docPrevio = existing && existing.docData ? { ...existing.docData } : {};
        let docData = existing && existing.docData ? { ...existing.docData } : undefined;
        const yaPendiente = Boolean(pending && existing && existing.pendingSync && existing.camposPendientesRendimientos);

        if (includeInDocData) {
          docData = docData || {};
          Object.assign(docData, clonedPayload);
        }

        const record = {
          ...base,
          id: embarqueId,
          ...clonedPayload
        };

        if (docData !== undefined) {
          record.docData = docData;
        }

        if (options.limpiarConflicto) {
          record.clavesEnConflicto = [];
          record.camposPendientesRendimientos = [];
        } else if (options.clavesEnConflicto) {
          record.clavesEnConflicto = options.clavesEnConflicto;
        }

        if (includeInDocData && clonedPayload.kilosCrudos && existing && existing.docData && existing.docData.kilosCrudos) {
          const conservar = new Set([
            ...(existing.clavesEnConflicto || []),
            ...(options.clavesEnConflicto || []),
          ]);
          conservar.forEach(clave => {
            if (clave.indexOf('kilosCrudos.') !== 0) return;
            const medida = clave.slice('kilosCrudos.'.length);
            if (!options.respetarConflictos) return;
            if (existing.docData.kilosCrudos[medida] !== undefined) {
              docData.kilosCrudos = {
                ...(docData.kilosCrudos || {}),
                [medida]: existing.docData.kilosCrudos[medida],
              };
            }
          });
        }

        if (includeInDocData && claves.length) {
          const previas = yaPendiente && !options.replacePendientes
            ? existing.camposPendientesRendimientos
            : [];
          record.camposPendientesRendimientos = pending
            ? Array.from(new Set([...previas, ...claves]))
            : [];
          record.baseCamposRendimientos = pending
            ? (yaPendiente && existing.baseCamposRendimientos
              ? existing.baseCamposRendimientos
              : (this._baseCamposRendimientos || fotoCampos(docPrevio, claves)))
            : {
              ...(existing && existing.baseCamposRendimientos || {}),
              ...fotoCampos(docData || {}, claves),
            };
          if (pending) {
            record.baseRev = existing && existing.baseRev != null
              ? existing.baseRev
              : (Number(docPrevio.rev) || Number(this._revBase) || 0);
          } else if (!existing || existing.baseRev == null || !existing.camposPendientesRendimientos?.length) {
            record.baseRev = Number(this._revBase) || Number(docData && docData.rev) || 0;
          }
          if (!pending) {
            const siguen = (existing && existing.camposPendientesRendimientos || [])
              .filter(clave => !claves.includes(clave));
            record.camposPendientesRendimientos = siguen;
          }
        }

        const editorPendiente = Boolean(existing && existing.pendingEditor);
        const siguePendiente = pending
          || (record.camposPendientesRendimientos || []).length > 0
          || editorPendiente;
        return {
          record,
          options: {
            pendingSync: siguePendiente,
            syncState: siguePendiente ? 'pending' : 'synced'
          }
        };
      });
    },
    registrarEscrituraRendimientos(resultado) {
      if (!resultado) return;
      // Solo una escritura limpia leyó el documento entero que mandamos.
      // Tras fusionar, la rev del servidor incluye campos que esta pantalla
      // no volvió a leer: adoptarla haría que el siguiente guardado completo
      // pisara esos campos sin comparar.
      if (!resultado.omitida && !resultado.fusiono) this._revBase = resultado.rev;
      const reconocidos = {
        ...(resultado.camposCoincidentes || {}),
        ...(resultado.camposEscritos || {}),
      };
      if (!Object.keys(reconocidos).length) return;
      this._baseCamposRendimientos = integrarCamposEnBase(this._baseCamposRendimientos, reconocidos);
    },
    marcarClavesEnConflicto(claves) {
      const juntas = new Set([...(this._clavesEnConflicto || []), ...(claves || [])]);
      this._clavesEnConflicto = Array.from(juntas);
      if (this._clavesEnConflicto.length) this.mostrarAvisoConflicto();
    },
    liberarClavesConflicto(payload) {
      const escritas = new Set(Object.keys(payload || {}));
      this._clavesEnConflicto = (this._clavesEnConflicto || []).filter(clave => !escritas.has(clave));
      if (!this._clavesEnConflicto.length) this.avisoConflicto = '';
    },
    async persistirCamposRendimientos(payload, opts = {}) {
      if (this._hidratandoRendimientos) return;
      if (!payload || Object.keys(payload).length === 0) {
        return;
      }
      const completo = this.deepClone(payload);
      const bloqueadas = (opts.forzar || opts.reintentar)
        ? []
        : [...(this._clavesEnConflicto || []), ...(opts.clavesBloqueadas || [])];
      const baseRev = opts.baseRev != null ? opts.baseRev : (Number(this._revBase) || 0);
      const baseCampos = opts.baseCampos !== undefined ? opts.baseCampos : this._baseCamposRendimientos;
      const paraServidor = prepararPayloadServidor(completo, bloqueadas, baseCampos);
      const sinBase = opts.sinBase || (baseCampos ? 'conflicto' : 'ultima');
      if (!navigator.onLine) {
        await this.actualizarOfflineRendimientos(true, completo, {
          ...opts,
          clavesEnConflicto: bloqueadas,
        });
        return;
      }
      try {
        let resultado = {
          rev: baseRev,
          omitida: true,
          fusiono: false,
          camposEscritos: {},
          camposCoincidentes: {},
          camposEnConflicto: [],
        };
        if (Object.keys(paraServidor).length) {
          const db = getFirestore();
          resultado = await escribirCamposEmbarque(db, this.$route.params.id, {
            baseRev,
            baseCampos,
            campos: paraServidor,
            sinBase,
            forzar: Boolean(opts.forzar),
          });
        }
        this.registrarEscrituraRendimientos(resultado);
        const enConflicto = resultado.camposEnConflicto || [];
        if (enConflicto.length) {
          this.marcarClavesEnConflicto(enConflicto);
          this._clavesConservarMio = Array.from(new Set([...(this._clavesConservarMio || []), ...enConflicto]));
          await this.actualizarOfflineRendimientos(true, completo, {
            ...opts,
            replacePendientes: true,
            clavesEnConflicto: this._clavesConservarMio,
          });
          return;
        }
        this.liberarClavesConflicto(resultado.camposEscritos || {});
        const escritas = Object.keys(resultado.camposEscritos || {});
        this._clavesConservarMio = (this._clavesConservarMio || []).filter(clave => !escritas.includes(clave));
        if (!this._clavesConservarMio.length && !(this._clavesEnConflicto || []).length) {
          this.avisoConflicto = '';
        }
        await this.actualizarOfflineRendimientos(false, completo, {
          ...opts,
          clavesEnConflicto: this._clavesConservarMio || [],
          limpiarConflicto: !(this._clavesConservarMio || []).length,
        });
      } catch (error) {
        if (esErrorConflictoEmbarque(error)) {
          const claves = error.camposEnConflicto || Object.keys(paraServidor);
          this.marcarClavesEnConflicto(claves);
          this._clavesConservarMio = Array.from(new Set([...(this._clavesConservarMio || []), ...claves]));
          await this.actualizarOfflineRendimientos(true, completo, {
            ...opts,
            replacePendientes: true,
            clavesEnConflicto: this._clavesConservarMio,
          });
          return;
        }
        console.error('[Rendimientos] Error al guardar cambios en Firestore:', error);
        const mensaje = 'No se pudieron guardar los rendimientos. ' + (error && error.message ? error.message : 'Intenta de nuevo.');
        this.avisoError = mensaje;
        if (typeof alert === 'function') alert(mensaje);
      }
    },
    /**
     * Lista de medidas a sacar (misma fuente que "PDF resumido" en sacadas) para la fecha del embarque.
     */
    async obtenerGruposListaMedidasPedidoDiaEmbarque() {
      const fechaEmbarqueISO = this.obtenerFechaISODesdeValor(this.embarqueData?.fecha);
      if (!fechaEmbarqueISO || !navigator.onLine) {
        return null;
      }
      try {
        const [year, month, day] = fechaEmbarqueISO.split('-').map(Number);
        const inicio = new Date(year, month - 1, day);
        inicio.setHours(0, 0, 0, 0);
        const fin = new Date(year, month - 1, day);
        fin.setHours(23, 59, 59, 999);

        const db = getFirestore();
        const q = query(
          collection(db, 'sacadas'),
          where('fecha', '>=', inicio),
          where('fecha', '<=', fin)
        );
        const snap = await getDocs(q);

        const gruposRaw = [];
        snap.docs.forEach((docSnapshot) => {
          const data = docSnapshot.data() || {};
          const lista = Array.isArray(data.listaMedidasPedido) ? data.listaMedidasPedido : [];
          lista.forEach((g) => gruposRaw.push(g));
        });

        return gruposRaw.length > 0 ? gruposRaw : null;
      } catch (error) {
        console.warn('[Rendimientos] No se pudo cargar lista de medidas del día del embarque:', error);
        return null;
      }
    },
    toggleVistaResumenSacadas() {
      this.activeVistaTab = this.activeVistaTab === 'sacada-hoy' ? 'rendimientos' : 'sacada-hoy';
    },
    async toggleVistaMedidasHoy() {
      if (this.activeVistaTab === 'medidas-hoy') {
        this.activeVistaTab = 'rendimientos';
        return;
      }
      this.activeVistaTab = 'medidas-hoy';
      await this.cargarMedidasParaHoyPanel();
    },
    async cargarMedidasParaHoyPanel() {
      this.medidasParaHoyPanel.loading = true;
      this.medidasParaHoyPanel.error = '';
      try {
        if (!navigator.onLine) {
          this.medidasParaHoyPanel.grupos = [];
          this.medidasParaHoyPanel.error = 'Sin conexión: no se pueden cargar las medidas del día.';
          return;
        }
        const raw = await this.obtenerGruposListaMedidasPedidoDiaEmbarque();
        this.medidasParaHoyPanel.grupos = raw
          ? normalizarGruposListaMedidasParaPdf(raw)
          : [];
      } catch (error) {
        console.warn('[Rendimientos] cargarMedidasParaHoyPanel:', error);
        this.medidasParaHoyPanel.error = 'No se pudieron cargar las medidas para hoy.';
        this.medidasParaHoyPanel.grupos = [];
      } finally {
        this.medidasParaHoyPanel.loading = false;
      }
    },
    aplicarDatosOffline(record) {
      const docData = record?.docData ? this.deepClone(record.docData) : {};
      const clientes = docData.clientes || record?.clientes || [];
      const embarqueData = {
        ...docData,
        clientes
      };
      this.aplicarEmbarqueCargado(embarqueData);
      this.preciosVenta = this.deepClone(record?.preciosVentaCache || this.preciosVenta || {});
    },
    aplicarEmbarqueCargado(embarqueData) {
      this._hidratandoRendimientos = true;
      this.fijarBaseRendimientos(embarqueData);
      this.embarqueData = embarqueData;
      this.nombresMedidasPersonalizados = this.deepClone(this.embarqueData.nombresMedidasPersonalizados || {});
      this.obtenerMedidasUnicas();
      this.medidaOculta = this.embarqueData.medidaOculta || {};
      this.analizarGanancia = this.embarqueData.analizarGanancia || {};
      this.analizarGananciaCrudos = this.embarqueData.analizarGananciaCrudos || {};
      this.rendimientoManual = this.embarqueData.rendimientoManual || {};
      this.aplicarCostoExtra = { ...(this.embarqueData.aplicarCostoExtra || {}) };
      this.costoExtraDecidido = { ...(this.embarqueData.costoExtraDecidido || {}) };
      this.analizarMaquilaGanancia = this.embarqueData.analizarMaquilaGanancia || {};
      this.precioMaquila = this.embarqueData.precioMaquila || {};
      this.pesoTaraCosto = this.embarqueData.pesoTaraCosto || 19;
      this.pesoTaraVenta = this.embarqueData.pesoTaraVenta || 20;

      const kilosCrudosGuardados = this.embarqueData.kilosCrudos || {};
      this.kilosCrudos = { ...kilosCrudosGuardados };

      this.medidasUnicas.forEach(medida => {
        if (!this.kilosCrudos[medida]) {
          if (this.esMedidaMix(medida)) {
            this.$set(this.kilosCrudos, medida, {
              medida1: 0,
              medida2: 0,
              etiqueta1: 'Kilos en crudo (Medida 1)',
              etiqueta2: 'Kilos en crudo (Medida 2)'
            });
          } else {
            this.$set(this.kilosCrudos, medida, 0);
          }
        }
      });

      this.guardadoAutomaticoActivo = true;
      this.$nextTick(() => {
        this._hidratandoRendimientos = false;
      });
    },
    obtenerFechaISODesdeValor(valor) {
      const fechaNormalizada = this.normalizarFecha(valor);
      return fechaNormalizada ? this.toLocalYMD(fechaNormalizada) : null;
    },
    combinarEmbarquesPorFecha(embarques, embarqueIdPrincipal) {
      if (!Array.isArray(embarques) || embarques.length === 0) {
        return null;
      }

      const principal = embarques.find(item => item.id === embarqueIdPrincipal) || embarques[0];
      const combinado = this.deepClone(principal.data || {});
      combinado.clientes = Array.isArray(combinado.clientes) ? combinado.clientes : [];
      combinado.kilosCrudos = this.deepClone(combinado.kilosCrudos || {});

      const mergeConfig = (campo, valor) => {
        if (valor === undefined || valor === null) {
          return;
        }
        if (typeof valor === 'object' && !Array.isArray(valor)) {
          combinado[campo] = combinado[campo] || {};
          Object.entries(valor).forEach(([clave, contenido]) => {
            if (combinado[campo][clave] === undefined) {
              combinado[campo][clave] = contenido;
            }
          });
          return;
        }
        if (combinado[campo] === undefined) {
          combinado[campo] = valor;
        }
      };

      embarques.forEach(item => {
        if (!item || !item.data || item.id === principal.id) {
          return;
        }
        const data = item.data;
        const clientes = Array.isArray(data.clientes) ? data.clientes : [];
        clientes.forEach(cliente => {
          const clienteId = cliente.id?.toString();
          const existente = combinado.clientes.find(c => c.id?.toString() === clienteId);
          if (existente) {
            const productos = Array.isArray(cliente.productos) ? cliente.productos : [];
            const crudos = Array.isArray(cliente.crudos) ? cliente.crudos : [];
            existente.productos = [...(existente.productos || []), ...productos];
            existente.crudos = [...(existente.crudos || []), ...crudos];
          } else {
            combinado.clientes.push(this.deepClone(cliente));
          }
        });

        mergeConfig('nombresMedidasPersonalizados', data.nombresMedidasPersonalizados);
        mergeConfig('medidaOculta', data.medidaOculta);
        mergeConfig('analizarGanancia', data.analizarGanancia);
        mergeConfig('analizarGananciaCrudos', data.analizarGananciaCrudos);
        mergeConfig('analizarMaquilaGanancia', data.analizarMaquilaGanancia);
        mergeConfig('precioMaquila', data.precioMaquila);
        mergeConfig('aplicarCostoExtra', data.aplicarCostoExtra);
        mergeConfig('costoExtraDecidido', data.costoExtraDecidido);
      });

      return combinado;
    },
    async cargarEmbarquesRelacionadosOffline(embarqueId, registroOffline = null) {
      try {
        await EmbarquesOfflineService.init();
        const registros = await EmbarquesOfflineService.getAll();
        const baseRecord = registroOffline || registros.find(r => r.id === embarqueId);

        if (!baseRecord) {
          return;
        }

        const fechaBase = baseRecord.docData?.fecha || baseRecord.fecha;
        const fechaISO = this.obtenerFechaISODesdeValor(fechaBase);

        const relacionados = registros.filter(r => {
          const fechaRegistro = r.docData?.fecha || r.fecha;
          return this.obtenerFechaISODesdeValor(fechaRegistro) === fechaISO;
        });

        const embarques = relacionados.map(record => ({
          id: record.id,
          data: record.docData || record
        }));

        this.idsEmbarquesRelacionados = embarques.map(item => item.id);
        const combinado = this.combinarEmbarquesPorFecha(embarques, embarqueId);
        if (!combinado) {
          this.aplicarDatosOffline(baseRecord);
          return;
        }

        this.aplicarEmbarqueCargado(combinado);
        if (baseRecord?.preciosVentaCache && Object.keys(this.preciosVenta).length === 0) {
          this.preciosVenta = this.deepClone(baseRecord.preciosVentaCache);
        }
      } catch (error) {
        console.error('[Rendimientos] Error al cargar embarques offline relacionados:', error);
        if (registroOffline) {
          this.aplicarDatosOffline(registroOffline);
        }
      }
    },
    async syncOfflineRendimientos() {
      if (!navigator.onLine) {
        return;
      }
      try {
        const embarqueId = this.$route.params.id;
        const record = await EmbarquesOfflineService.getById(embarqueId);
        if (!record || !record.pendingSync) {
          return;
        }

        const pendientes = (record.camposPendientesRendimientos || [])
          .filter(clave => CAMPOS_RENDIMIENTOS.includes(clave));
        if (!pendientes.length) {
          return;
        }

        const payload = {};
        pendientes.forEach(key => {
          if (record[key] !== undefined) payload[key] = record[key];
          else if (record.docData && record.docData[key] !== undefined) payload[key] = record.docData[key];
        });

        const baseFresca = this._baseCamposRendimientos;
        const baseCampos = baseFresca || record.baseCamposRendimientos || null;
        if (!baseCampos) {
          this._clavesConservarMio = pendientes.slice();
          this.marcarClavesEnConflicto(pendientes);
          await EmbarquesOfflineService.mergeSave(embarqueId, existing => {
            if (!existing) return null;
            return {
              record: {
                ...existing,
                clavesEnConflicto: pendientes.slice(),
                camposPendientesRendimientos: pendientes.slice(),
              },
              options: { pendingSync: true, syncState: 'pending' },
            };
          }).catch(() => {});
          return;
        }

        if (Object.keys(payload).length === 0) {
          return;
        }

        await this.persistirCamposRendimientos(payload, {
          baseRev: baseFresca ? (Number(this._revBase) || 0) : (Number(record.baseRev ?? record.docData?.rev) || 0),
          baseCampos,
          sinBase: 'conflicto',
          clavesBloqueadas: record.clavesEnConflicto || [],
        });
      } catch (error) {
        console.error('[Rendimientos] Error al sincronizar datos offline:', error);
      }
    },

    obtenerNombreCliente(clienteId) {
      if (!this.embarqueData || !this.embarqueData.clientes) return '';
      const cliente = this.embarqueData.clientes.find(c => c.id.toString() === clienteId.toString());
      return cliente ? cliente.nombre : '';
    },

    // Calcular taras de crudo por medida
    calcularTarasCrudosPorMedida() {
      if (!this.embarqueData || !this.embarqueData.clientes) return {};
      
      const tarasPorMedida = {};
      
      this.embarqueData.clientes.forEach(cliente => {
        if (cliente.crudos && Array.isArray(cliente.crudos)) {
          cliente.crudos.forEach(crudo => {
            if (crudo && crudo.items && Array.isArray(crudo.items)) {
              crudo.items.forEach(item => {
                if (item.talla) {
                  // Para Ozuna: solo considerar si es venta
                  // Para otros clientes: todos los crudos son venta
                  const esVenta = cliente.nombre === 'Ozuna' ? item.esVenta : true;
                  
                  if (esVenta) {
                    const medida = item.talla;
                    
                    if (!tarasPorMedida[medida]) {
                      tarasPorMedida[medida] = {
                        totalTaras: 0,
                        totalKilos: 0,
                        detalles: []
                      };
                    }
                  
                  let tarasItem = 0;
                  let kilosItem = 0;
                  
                  // Procesar taras principales
                  if (item.taras) {
                    const formatoGuion = /^(\d+)-(\d+)$/.exec(item.taras);
                    if (formatoGuion) {
                      const cantidad = parseInt(formatoGuion[1]) || 0;
                      let peso = parseInt(formatoGuion[2]) || 0;
                      
                      // Si el peso es 19, usar el peso configurado para costos
                      if (peso === 19) {
                        peso = this.pesoTaraCosto;
                      }
                      
                      tarasItem += cantidad;
                      kilosItem += cantidad * peso;
                    } else {
                      // Formato original si no coincide con el patrón
                      const [cantidad, peso] = item.taras.split('-').map(Number);
                      tarasItem += cantidad || 0;
                      kilosItem += (cantidad || 0) * (peso || 0);
                    }
                  }
                  
                  // Procesar sobrantes
                  if (item.sobrante) {
                    const formatoGuion = /^(\d+)-(\d+)$/.exec(item.sobrante);
                    if (formatoGuion) {
                      const cantidadSobrante = parseInt(formatoGuion[1]) || 0;
                      let pesoSobrante = parseInt(formatoGuion[2]) || 0;
                      
                      // Si el peso es 19, usar el peso configurado para costos
                      if (pesoSobrante === 19) {
                        pesoSobrante = this.pesoTaraCosto;
                      }
                      
                      tarasItem += cantidadSobrante;
                      kilosItem += cantidadSobrante * pesoSobrante;
                    } else {
                      // Formato original si no coincide con el patrón
                      const [cantidadSobrante, pesoSobrante] = item.sobrante.split('-').map(Number);
                      tarasItem += cantidadSobrante || 0;
                      kilosItem += (cantidadSobrante || 0) * (pesoSobrante || 0);
                    }
                  }

                  // Procesar segundo sobrante
                  if (item.sobrante2) {
                    const formatoGuion2 = /^(\d+)-(\d+)$/.exec(item.sobrante2);
                    if (formatoGuion2) {
                      const cantidadSobrante2 = parseInt(formatoGuion2[1]) || 0;
                      let pesoSobrante2 = parseInt(formatoGuion2[2]) || 0;

                      // Si el peso es 19, usar el peso configurado para costos
                      if (pesoSobrante2 === 19) {
                        pesoSobrante2 = this.pesoTaraCosto;
                      }

                      tarasItem += cantidadSobrante2;
                      kilosItem += cantidadSobrante2 * pesoSobrante2;
                    } else {
                      // Formato original si no coincide con el patrón
                      const [cantidadSobrante2, pesoSobrante2] = item.sobrante2.split('-').map(Number);
                      tarasItem += cantidadSobrante2 || 0;
                      kilosItem += (cantidadSobrante2 || 0) * (pesoSobrante2 || 0);
                    }
                  }

                  tarasPorMedida[medida].totalTaras += tarasItem;
                  tarasPorMedida[medida].totalKilos += kilosItem;

                    // Agregar detalles para debugging
                    if (tarasItem > 0) {
                      tarasPorMedida[medida].detalles.push({
                        cliente: cliente.nombre,
                        taras: item.taras,
                        sobrante: item.sobrante,
                        sobrante2: item.sobrante2,
                        tarasCalculadas: tarasItem,
                        kilosCalculados: kilosItem
                      });
                    }
                  }
                }
              });
            }
          });
        }
      });
      
      return tarasPorMedida;
    },

    // Calcular costos para crudos (costo base + 3.5)
    calcularCostosCrudos(tarasCrudosPorMedida) {
      if (!tarasCrudosPorMedida || !this.embarqueData) return {};
      
      const costosCrudos = {};
      
      // Obtener todas las medidas de crudo únicas
      const medidasCrudo = Object.keys(tarasCrudosPorMedida);
      
      medidasCrudo.forEach(medida => {
        // Mismo costo que la tarjeta de ganancia (manual > catálogo > guardado)
        const resuelto = this.resolverCostoBaseSync(medida);
        const costoBase = resuelto ? resuelto.costo : 0;
        const costoFinal = costoBase + SOBRECOSTO_CRUDO_KG;
        
        costosCrudos[medida] = {
          costoBase: costoBase,
          costoFinal: costoFinal
        };
      });
      
      return costosCrudos;
    },


    documentoConPendientesRendimientos(servidor, offline) {
      const docOffline = (offline && offline.docData) || {};
      const base = offline && offline.baseCamposRendimientos;
      const pendientes = new Set((offline && offline.camposPendientesRendimientos) || []);
      const salida = { ...(servidor || {}) };
      const mapas = new Set([
        'kilosCrudos', 'rendimientoManual', 'costosPorMedida', 'precioMaquila',
        'analizarGanancia', 'analizarGananciaCrudos', 'analizarMaquilaGanancia',
        'medidaOculta', 'nombresMedidasPersonalizados',
      ]);
      CAMPOS_RENDIMIENTOS.forEach(clave => {
        if (!pendientes.has(clave)) return;
        const local = docOffline[clave] !== undefined ? docOffline[clave] : (offline && offline[clave]);
        if (local === undefined) return;
        if (mapas.has(clave) && local && typeof local === 'object' && !Array.isArray(local)) {
          const mapa = { ...(salida[clave] || {}) };
          const baseMapa = base && base[clave];
          Object.keys(local).forEach(medida => {
            if (!String(medida).trim()) return;
            if (base && equivalentes(local[medida], baseMapa && baseMapa[medida])) return;
            mapa[medida] = local[medida];
          });
          salida[clave] = mapa;
          return;
        }
        if (base && equivalentes(local, base[clave])) return;
        salida[clave] = local;
      });
      salida.fecha = servidor && servidor.fecha;
      salida.clientes = (servidor && servidor.clientes) || [];
      salida.rev = servidor && servidor.rev;
      return salida;
    },

    async cargarEmbarque() {
      try {
        const db = getFirestore();
        const embarqueId = this.$route.params.id;
        const embarqueRef = doc(db, 'embarques', embarqueId);

        if (!navigator.onLine) {
          const registroOffline = await EmbarquesOfflineService.getById(embarqueId).catch(() => null);
          if (registroOffline) {
            await this.cargarEmbarquesRelacionadosOffline(embarqueId, registroOffline);
            return;
          }
        }

        const embarqueDoc = await getDoc(embarqueRef);
        
        if (embarqueDoc.exists()) {
          const embarqueBase = embarqueDoc.data();
          const fechaISO = this.obtenerFechaISODesdeValor(embarqueBase.fecha);
          const embarquesRelacionados = [{ id: embarqueId, data: embarqueBase }];

          try {
            const embarquesRef = collection(db, 'embarques');
            const snapshot = await getDocs(embarquesRef);

            snapshot.docs.forEach(docSnap => {
              if (docSnap.id === embarqueId) {
                return;
              }
              const data = docSnap.data();
              if (this.obtenerFechaISODesdeValor(data.fecha) === fechaISO) {
                embarquesRelacionados.push({ id: docSnap.id, data });
              }
            });
          } catch (error) {
            console.warn('[Rendimientos] No se pudieron cargar embarques relacionados:', error);
          }

          this.idsEmbarquesRelacionados = embarquesRelacionados.map(item => item.id);
          const combinado = this.combinarEmbarquesPorFecha(embarquesRelacionados, embarqueId);
          const previoOffline = await EmbarquesOfflineService.getById(embarqueId).catch(() => null);
          const baseServidor = combinado || embarqueBase;
          const pendientesRendi = ((previoOffline && previoOffline.camposPendientesRendimientos) || [])
            .filter(clave => CAMPOS_RENDIMIENTOS.includes(clave));
          const clavesPrevias = (previoOffline && previoOffline.clavesEnConflicto) || [];
          const habiaPendienteRendi = pendientesRendi.length > 0 || clavesPrevias.length > 0;

          if (habiaPendienteRendi) {
            this.aplicarEmbarqueCargado(this.documentoConPendientesRendimientos(baseServidor, previoOffline));
            if (previoOffline.baseCamposRendimientos) {
              try {
                this._baseCamposRendimientos = JSON.parse(JSON.stringify(previoOffline.baseCamposRendimientos));
              } catch (error) {
                this._baseCamposRendimientos = previoOffline.baseCamposRendimientos;
              }
            }
            if (previoOffline.baseRev != null) this._revBase = Number(previoOffline.baseRev) || 0;
            const claves = clavesPrevias.slice();
            this._clavesEnConflicto = claves;
            this._clavesConservarMio = claves.slice();
            if (claves.length) this.mostrarAvisoConflicto();
            else this.avisoConflicto = '';
          } else if (previoOffline && previoOffline.pendingSync) {
            this.aplicarEmbarqueCargado(baseServidor);
          } else {
            this.aplicarEmbarqueCargado(baseServidor);
            await EmbarquesOfflineService.mergeSave(embarqueId, existing => {
              const record = {
                ...(existing || {}),
                id: embarqueId,
                docData: this.deepClone(embarqueBase),
                clavesEnConflicto: []
              };
              return {
                record,
                options: { pendingSync: false, syncState: 'synced' }
              };
            });
            await this.actualizarOfflineRendimientos(false, this.crearPayloadRendimientos());
          }

          
          
          // Calcular ganancias después de cargar embarque
          if (Object.keys(this.preciosVenta).length > 0) {
          this.$nextTick(async () => {
            await this.calcularGanancias();
          });
          }
        } else {
          console.error('No se encontró el embarque');
        }
      } catch (error) {
        console.error('Error al cargar el embarque:', error);
      }
    },

    async cargarPreciosVenta() {
      try {
        if (!navigator.onLine) {
          if (Object.keys(this.preciosVenta).length === 0) {
            const registroOffline = await EmbarquesOfflineService.getById(this.$route.params.id).catch(() => null);
          if (registroOffline?.preciosVentaCache) {
            this.preciosVenta = this.deepClone(registroOffline.preciosVentaCache);
          }
          }
          return;
        }

        const db = getFirestore();
        const preciosRef = collection(db, 'precios');
        const q = query(preciosRef, orderBy('fecha', 'desc'));
        const preciosSnapshot = await getDocs(q);
        
        // Crear un mapa para organizar los precios por producto
        const preciosMap = new Map();
        
        preciosSnapshot.docs.forEach(docSnapshot => {
          const precio = { id: docSnapshot.id, ...docSnapshot.data() };
          const clave = normalizarNombreProductoPrecio(precio.producto).toLowerCase().trim();
          
          if (!preciosMap.has(clave)) {
            preciosMap.set(clave, []);
          }
          preciosMap.get(clave).push(precio);
        });
        
        // Organizar precios por producto (mantener estructura existente)
        const preciosOrganizados = {};
        preciosMap.forEach((precios, producto) => {
          // Ordenar por fecha (más reciente primero)
          const preciosOrdenados = precios.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
          preciosOrganizados[producto] = preciosOrdenados;
        });
        
        this.preciosVenta = preciosOrganizados;

        await this.actualizarOfflineRendimientos(false, { preciosVentaCache: preciosOrganizados }, { includeInDocData: false });

        // Calcular ganancias después de cargar precios
        if (this.embarqueData) {
          this.$nextTick(async () => {
            await this.calcularGanancias();
          });
        }
        
      } catch (error) {
        console.error('Error al cargar precios de venta:', error);
      }
    },

    // Función auxiliar para encontrar precios con búsqueda inteligente
    encontrarPreciosParaMedida(medida) {
      const grupoAlias = obtenerGrupoPreciosPorNombre(this.preciosVenta, medida);
      if (grupoAlias) return grupoAlias;

      // 1. Buscar coincidencia exacta primero
      let preciosProducto = this.preciosVenta[medida.toLowerCase().trim()];
      if (preciosProducto && preciosProducto.length > 0) {
        return { medidaEncontrada: medida, precios: preciosProducto };
      }

      // 2. Normalizar quitando sufijos comunes
      const medidaNormalizada = medida.toLowerCase().trim()
        .replace(' maquila ozuna', '')
        .replace(/\s+(vayon|ahumada|sin\s+cal|cal|c\/c|crudo|limpio).*$/g, '')
        .trim();
      
      // 3. Buscar con medida normalizada
      preciosProducto = obtenerGrupoPreciosPorNombre(this.preciosVenta, medidaNormalizada)?.precios;
      if (preciosProducto && preciosProducto.length > 0) {
        return { medidaEncontrada: medidaNormalizada, precios: preciosProducto };
      }
      
      // 4. Buscar variaciones con espacios/guiones
      const medidaConEspacio = medidaNormalizada.replace(/-/g, ' ');
      const medidaConGuion = medidaNormalizada.replace(/ /g, '-');
      
      preciosProducto = obtenerGrupoPreciosPorNombre(this.preciosVenta, medidaConEspacio)?.precios;
      if (preciosProducto && preciosProducto.length > 0) {
        return { medidaEncontrada: medidaConEspacio, precios: preciosProducto };
      }
      
      preciosProducto = obtenerGrupoPreciosPorNombre(this.preciosVenta, medidaConGuion)?.precios;
      if (preciosProducto && preciosProducto.length > 0) {
        return { medidaEncontrada: medidaConGuion, precios: preciosProducto };
      }
      
      // Solo una talla numérica inicial puede heredar su precio base.
      // Los nombres completos (Piojo / Piojo panga) son productos distintos.
      const clavesBase = obtenerClavesBusquedaMedida(medidaNormalizada).slice(1);
      for (const clave of clavesBase) {
        const grupo = obtenerGrupoPreciosPorNombre(this.preciosVenta, clave);
        if (grupo) return grupo;
      }

      return null; // No se encontró
    },

    // Precio de catálogo a la fecha del embarque con la misma regla que las
    // cuentas y el embarque: el específico del cliente gana al general
    // (aunque el general sea más nuevo) y solo cuentan precios con fecha
    // <= embarque. Ver resolverPrecioCatalogo en utils/gananciasRendimientos.
    obtenerPrecioVentaParaFecha(medida, fechaEmbarque, clienteId = null) {
      const resultadoBusqueda = this.encontrarPreciosParaMedida(medida);
      if (!resultadoBusqueda) return null;
      const fecha = this.toLocalYMD(this.normalizarFecha(fechaEmbarque) || new Date());
      return resolverPrecioCatalogo(resultadoBusqueda.precios, fecha, clienteId);
    },

    // Función auxiliar para encontrar costos con búsqueda inteligente
    // Normalización de medida para la resolución de costos (misma que
    // Gestión de Costos): minúsculas, espacios colapsados, sin espacios
    // alrededor de "/" ni "-".
    normalizarMedidaCosto(medida) {
      if (!medida) return '';
      return medida
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\s*\/\s*/g, '/')
        .replace(/\s*-\s*/g, '-');
    },

    normalizarProveedorCosto(proveedor) {
      return (proveedor || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
    },

    generarCostoKeyCosto(medida, proveedorNombre = '') {
      const medidaNormalizada = this.normalizarMedidaCosto(medida);
      const proveedorNormalizado = this.normalizarProveedorCosto(proveedorNombre) || 'sin-proveedor';
      return `${medidaNormalizada}__${proveedorNormalizado}`;
    },

    // Catálogo de costos con proveedor (misma fuente que Gestión de
    // Costos): entradas de historial_costos. Se conserva la entrada más
    // reciente por costoKey (medida + proveedor) para no perder la
    // dimensión proveedor, que es la que distingue p. ej. "51/60 -
    // Tirado" ($121) de "51/60 - 41 y 61 prime selecta" ($149).
    // porFecha: entradas con fecha <= fecha del embarque; activos: todas
    // las no archivadas. Antes se colapsaba por medida (solo la más
    // reciente), lo que borraba al proveedor y hacía imposible el match
    // medida + proveedor.
    async obtenerCostosRegistradosGlobales() {
      try {
        const db = getFirestore();
        const historialRef = collection(db, 'historial_costos');
        const historialSnapshot = await getDocs(historialRef);

        const historialCompleto = [];
        historialSnapshot.forEach(doc => {
          const data = doc.data();
          historialCompleto.push({ ...data, id: doc.id });
        });

        // Helper para convertir fecha
        const toDate = (value) => {
          try {
            if (!value) return null;
            if (value.toDate && typeof value.toDate === 'function') return value.toDate();
            if (value.seconds) return new Date(value.seconds * 1000);
            if (typeof value === 'string') return new Date(value);
            if (value instanceof Date) return value;
            return new Date(value);
          } catch {
            return null;
          }
        };

        // Ordenar por fecha descendente; mismo día: captura más reciente primero
        historialCompleto.sort((a, b) => {
          const fechaA = toDate(a.fecha) || toDate(a.timestamp) || new Date(0);
          const fechaB = toDate(b.fecha) || toDate(b.timestamp) || new Date(0);
          if (fechaB - fechaA !== 0) return fechaB - fechaA;
          return (toDate(b.timestamp) || new Date(0)) - (toDate(a.timestamp) || new Date(0));
        });

        // Obtener fecha del embarque
        const fechaEmbarqueNormalizada = this.normalizarFecha(this.embarqueData?.fecha);
        const fechaEmb = fechaEmbarqueNormalizada || new Date();
        fechaEmb.setHours(12, 0, 0, 0);

        const hidratar = (entrada) => {
          const proveedorNombre = entrada.proveedorNombre || entrada.proveedor || '';
          return {
            ...entrada,
            costoKey: this.generarCostoKeyCosto(entrada.medida, proveedorNombre),
            proveedorNombre,
            proveedorId: entrada.proveedorId || '',
            tipoCosto: entrada.tipoCosto || 'limpio'
          };
        };

        const porFecha = [];
        const activos = [];
        const vistosFecha = new Set();
        const vistosActivos = new Set();

        historialCompleto.forEach(entradaOriginal => {
          if (entradaOriginal.eliminado || entradaOriginal.medidaEliminada) return;
          const entrada = hidratar(entradaOriginal);
          const fechaCosto = toDate(entrada.fecha) || toDate(entrada.timestamp) || new Date(0);
          fechaCosto.setHours(12, 0, 0, 0);

          if (!vistosActivos.has(entrada.costoKey) && !entrada.archivado) {
            vistosActivos.add(entrada.costoKey);
            activos.push(entrada);
          }

          if (!vistosFecha.has(entrada.costoKey) && fechaCosto <= fechaEmb && !entrada.archivado) {
            vistosFecha.add(entrada.costoKey);
            porFecha.push(entrada);
          }
        });

        // Default general de proveedor por medida (última elección).
        let proveedorActivoGlobal = {};
        try {
          const snapProveedor = await getDoc(doc(db, ...DOC_PROVEEDOR_ACTIVO));
          proveedorActivoGlobal = (snapProveedor.exists() && snapProveedor.data().porMedida) || {};
        } catch (errorProveedor) {
          console.warn('[Rendimientos] No se pudo leer el proveedor activo general:', errorProveedor);
        }

        return { porFecha, activos, proveedorActivoGlobal };
      } catch (error) {
        console.error('Error al obtener costos registrados globales:', error);
        return { porFecha: [], activos: [], proveedorActivoGlobal: {} };
      }
    },

    // Asegura el cache del catálogo de costos. Sin conexión devuelve null.
    async asegurarCacheCostosGlobales() {
      if (this.costosGlobalesCache) return this.costosGlobalesCache;
      if (!navigator.onLine) return null;
      this.costosGlobalesCache = await this.obtenerCostosRegistradosGlobales();
      return this.costosGlobalesCache;
    },

    // Puntaje de proveedor para una entrada del catálogo, con la misma
    // lógica que Gestión de Costos: el proveedor implícito en el nombre
    // de la medida del embarque (ej. "tirado" en "51/60 tirado") manda.
    puntuarProveedorEnNombreCosto(costoInfo, proveedorBuscado) {
      if (!proveedorBuscado) return 0;
      const proveedorRegistrado = this.normalizarMedidaCosto(costoInfo.proveedorNombre || '');
      const medidaRegistrada = this.normalizarMedidaCosto(costoInfo.medida);
      // Caso especial: la entrada no tiene proveedor explícito, pero su
      // medida ya incluye el proveedor buscado.
      if (!proveedorRegistrado) {
        if (medidaRegistrada.includes(proveedorBuscado)) return 800;
        return 0;
      }
      if (proveedorRegistrado === proveedorBuscado) return 1000;
      if (proveedorRegistrado.includes(proveedorBuscado) || proveedorBuscado.includes(proveedorRegistrado)) {
        const diff = Math.abs(proveedorRegistrado.length - proveedorBuscado.length);
        return Math.max(100, 500 - diff);
      }
      return proveedorBuscado
        .split(/\s+/)
        .filter(token => token.length >= 3)
        .reduce((score, token) => (proveedorRegistrado.includes(token) ? score + token.length : score), 0);
    },

    // Resolución de costo en el catálogo con la MISMA lógica que Gestión
    // de Costos (medida exacta + proveedor primero, medida base solo
    // como fallback). `listas` es un arreglo de arreglos de entradas
    // (porFecha, activos). No consulta costosPorMedida del embarque: ese
    // mapa es un cache que puede quedar desactualizado (ej. "51/60
    // tirado" guardado en $149 cuando el catálogo dice $121).
    buscarCostoCatalogoEnListas(medidaEmbarque, listas) {
      if (!medidaEmbarque || !listas || listas.length === 0) return null;

      const medidaEmbarqueNormalizada = this.normalizarMedidaCosto(medidaEmbarque);
      const medidaBaseSinSufijos = medidaEmbarqueNormalizada
        .replace(/\s+maquila\s+ozuna/g, '')
        .replace(/\s+c\/c/g, '')
        .trim();
      const medidaKey = medidaEmbarqueNormalizada;
      // Elección de este embarque > default general (última elección) > respaldo.
      const proveedorActivoKey = proveedorActivoParaMedida(
        medidaKey,
        this.embarqueData?.proveedorActivoPorMedida || {},
        this.costosGlobalesCache?.proveedorActivoGlobal || {}
      );

      const extraerTallaBase = (texto) => {
        const match = texto.match(/\d+\/\d+/);
        return match ? match[0] : '';
      };
      const tallaEmbarque = extraerTallaBase(medidaEmbarqueNormalizada);

      const obtenerProveedorImplicitoEmbarque = () => {
        if (!tallaEmbarque || tallaEmbarque === medidaEmbarqueNormalizada) return '';
        return medidaEmbarqueNormalizada
          .replace(tallaEmbarque, '')
          .replace(/\bmaquila\b/g, '')
          .replace(/\bozuna\b/g, '')
          .replace(/\s+c\/c/g, '')
          .trim();
      };
      const proveedorImplicitoEmbarque = obtenerProveedorImplicitoEmbarque();

      const obtenerTextoProveedorDesdeMedida = (costoInfo) => {
        const medidaRegistrada = this.normalizarMedidaCosto(costoInfo.medida);
        if (medidaRegistrada && medidaEmbarqueNormalizada.includes(medidaRegistrada) && medidaRegistrada !== medidaEmbarqueNormalizada) {
          const restante = medidaEmbarqueNormalizada
            .replace(medidaRegistrada, '')
            .replace(/\bmaquila\b/g, '')
            .replace(/\bozuna\b/g, '')
            .replace(/\s+c\/c/g, '')
            .trim();
          if (restante) return restante;
        }
        return proveedorImplicitoEmbarque;
      };

      const crearResultado = (costoInfo, tipoCoincidencia = 'global') => ({
        medidaEncontrada: costoInfo.medida,
        proveedorId: costoInfo.proveedorId || '',
        proveedorNombre: costoInfo.proveedorNombre || '',
        costo: costoInfo.costoBase,
        costoKey: costoInfo.costoKey,
        tipoCoincidencia
      });

      const ordenarPreferencias = (coincidencias) => {
        const coincidenciasPorProveedor = coincidencias
          .map(costoInfo => ({
            costoInfo,
            score: this.puntuarProveedorEnNombreCosto(costoInfo, obtenerTextoProveedorDesdeMedida(costoInfo))
          }))
          .filter(item => item.score > 0)
          .sort((a, b) => b.score - a.score);

        if (coincidenciasPorProveedor.length > 0) {
          const coincidenciaProveedor = coincidenciasPorProveedor[0].costoInfo;
          return [
            { ...coincidenciaProveedor, tipoCoincidencia: 'medida-proveedor' },
            ...coincidencias.filter(c => c.costoKey !== coincidenciaProveedor.costoKey)
          ];
        }

        // Si la medida del embarque NO incluye un proveedor implícito,
        // respetamos el "proveedor activo" elegido manualmente.
        if (!proveedorImplicitoEmbarque && proveedorActivoKey) {
          const activo = coincidencias.find(c => c.costoKey === proveedorActivoKey);
          if (activo) {
            return [
              { ...activo, tipoCoincidencia: 'proveedor-activo' },
              ...coincidencias.filter(c => c.costoKey !== proveedorActivoKey)
            ];
          }
        }

        // Nunca se eligió: sin proveedor primero, luego el más reciente
        // (mismo respaldo que Gestión de Costos).
        return ordenarProveedoresDefault(coincidencias);
      };

      const buscarExacta = (entradas) => {
        const exactas = entradas.filter(costoInfo => this.normalizarMedidaCosto(costoInfo.medida) === medidaEmbarqueNormalizada);
        if (exactas.length === 0) return null;
        const seleccionado = ordenarPreferencias(exactas)[0];
        return crearResultado(seleccionado, seleccionado.tipoCoincidencia || 'exacta');
      };

      const buscarPorTalla = (entradas) => {
        if (!tallaEmbarque || tallaEmbarque === medidaEmbarqueNormalizada) return null;
        const porTalla = entradas.filter(costoInfo => this.normalizarMedidaCosto(costoInfo.medida) === tallaEmbarque);
        if (porTalla.length === 0) return null;
        const seleccionado = ordenarPreferencias(porTalla)[0];
        return crearResultado(seleccionado, seleccionado.tipoCoincidencia || 'talla-proveedor');
      };

      const buscarBaseOzuna = (entradas) => {
        if (!medidaEmbarque.includes('Maquila Ozuna')) return null;
        const medidaBase = this.normalizarMedidaCosto(medidaEmbarque.replace(' Maquila Ozuna', '').trim());
        const tallaOzuna = extraerTallaBase(medidaBase);
        const clavesBuscar = [medidaBase];
        if (tallaOzuna && tallaOzuna !== medidaBase) clavesBuscar.push(tallaOzuna);
        for (const clave of clavesBuscar) {
          const coincidenciaBase = entradas.filter(costoInfo => this.normalizarMedidaCosto(costoInfo.medida) === clave);
          if (coincidenciaBase.length > 0) {
            const seleccionado = ordenarPreferencias(coincidenciaBase)[0];
            return crearResultado(seleccionado, seleccionado.tipoCoincidencia || 'base-ozuna');
          }
        }
        return null;
      };

      const buscarParcial = (entradas) => {
        const parciales = entradas.filter(costoInfo => {
          const medidaRegistradaNormalizada = this.normalizarMedidaCosto(costoInfo.medida);
          return (
            (medidaRegistradaNormalizada.length > 2 && medidaBaseSinSufijos.includes(medidaRegistradaNormalizada)) ||
            (medidaBaseSinSufijos.length > 2 && medidaRegistradaNormalizada.includes(medidaBaseSinSufijos))
          );
        });
        if (parciales.length === 0) return null;
        const seleccionado = ordenarPreferencias(parciales)[0];
        return crearResultado(seleccionado, seleccionado.tipoCoincidencia || 'parcial');
      };

      // Estrategias ordenadas de más específica a menos específica. Cada
      // estrategia se ejecuta en TODAS las listas antes de pasar a la
      // siguiente, de modo que un match exacto en cualquier lista siempre
      // gana sobre un match por talla o parcial en otra lista.
      const estrategias = [buscarExacta, buscarPorTalla, buscarBaseOzuna, buscarParcial];
      for (const estrategia of estrategias) {
        for (const entradas of listas) {
          if (!entradas || entradas.length === 0) continue;
          const resultado = estrategia(entradas);
          if (resultado) return resultado;
        }
      }
      return null;
    },

    // Resolución de costo del catálogo (async, asegura el cache).
    async resolverCostoCatalogo(medida) {
      const cache = await this.asegurarCacheCostosGlobales();
      if (!cache) return null;
      return this.buscarCostoCatalogoEnListas(medida, [cache.porFecha, cache.activos]);
    },

    // Versión síncrona (PDF): usa el cache si ya está cargado.
    resolverCostoCatalogoSync(medida) {
      const cache = this.costosGlobalesCache;
      if (!cache) return null;
      return this.buscarCostoCatalogoEnListas(medida, [cache.porFecha, cache.activos]);
    },

    // Búsqueda de costo con la misma lógica que Gestión de Costos
    // (medida exacta + proveedor primero, medida base solo como
    // fallback). Antes consultaba primero costosPorMedida del embarque
    // y luego normalizaba quitando sufijos como "tirado", lo que
    // devolvía el costo de la medida base (ej. $149 de "51/60" para
    // "51/60 tirado" en vez de $121 de "51/60 - Tirado").
    async encontrarCostoParaMedida(medida) {
      return this.resolverCostoCatalogo(medida);
    },

    // Costo base de una medida (misma regla que Gestión de Costos):
    // costo manual del embarque > catálogo (medida + proveedor) > guardado
    // en costosPorMedida. Devuelve {costo, fuente, detalle} o null.
    async resolverCostoBase(medida) {
      const catalogo = await this.resolverCostoCatalogo(medida);
      return this.resolverCostoBaseConCatalogo(medida, catalogo);
    },

    // Versión síncrona (crudos, PDF): usa el cache del catálogo si ya está.
    resolverCostoBaseSync(medida) {
      return this.resolverCostoBaseConCatalogo(medida, this.resolverCostoCatalogoSync(medida));
    },

    resolverCostoBaseConCatalogo(medida, catalogo) {
      return resolverCostoMedida({
        medida,
        catalogo,
        manuales: this.embarqueData?.costosPorMedidaManuales || {},
        guardados: this.embarqueData?.costosPorMedida || {}
      });
    },

    // Método para precargar todos los costos
    async precargarCostos() {
      if (!this.medidasUnicas || this.medidasUnicas.length === 0) return;
      
      console.log('🔄 Precargando costos para todas las medidas...');
      
      // Obtener costos globales una sola vez
      if (!this.costosGlobalesCache) {
        this.costosGlobalesCache = await this.obtenerCostosRegistradosGlobales();
      }
      
      // Precargar costos para cada medida
      const promesasCostos = this.medidasUnicas.map(async (medida) => {
        try {
          const costoCalculado = await this.calcularCostoFinal(medida);
          this.$set(this.costosCalculados, medida, costoCalculado);
        } catch (error) {
          console.error(`Error al calcular costo para ${medida}:`, error);
          this.$set(this.costosCalculados, medida, 0);
        }
      });
      
      await Promise.all(promesasCostos);
      console.log('✅ Costos precargados:', this.costosCalculados);
    },

    // Versión síncrona de calcularCostoFinal que usa el cache
    calcularCostoFinalSync(medida) {
      // Si está en cache, usar ese valor
      if (this.costosCalculados[medida] !== undefined) {
        return this.costosCalculados[medida];
      }
      
      // Regla refri (solo ganancia): el costo se busca con la medida
      // base y el rendimiento es el del día anterior de la base
      // cuando ya se calculó por la ruta asíncrona.
      const baseRefriSync = this.medidaBaseRefri(medida);
      const medidaCostoSync = baseRefriSync || medida;

      // Mismo costo resuelto que la ruta asíncrona (manual, catálogo,
      // guardado). Si el cache del catálogo no está cargado, se usa el
      // manual o el guardado.
      const resueltoSync = this.resolverCostoBaseSync(medidaCostoSync);
      const costo = resueltoSync ? resueltoSync.costo : 0;

      let rendimientoOriginal = this.getRendimiento(medida);
      if (baseRefriSync) {
        const rendAyer = this.rendimientoDiaAnteriorCache[baseRefriSync.toLowerCase().trim()];
        if (rendAyer !== undefined && rendAyer !== null) {
          rendimientoOriginal = rendAyer;
        }
      }
      const resultado = calcularCostoFinalKg({
        costo,
        rendimiento: rendimientoOriginal,
        aplicarExtra: this.debeAplicarCostoExtra(medida),
        costoExtra: this.embarqueData?.costoExtra
      });

      // Guardar en cache para futuras llamadas
      this.$set(this.costosCalculados, medida, resultado);
      
      return resultado;
    },

    // Medida base de una medida refri ("71/90 refri" -> "71/90").
    // Regla refri (SOLO ganancia): costo, precio y rendimiento se
    // toman de la base como si no dijera refri. La hoja de
    // rendimientos (rendimiento mostrado, kilosCrudos) no se toca.
    medidaBaseRefri(medida) {
      if (!this.esMedidaRefri(medida)) return null;
      const base = String(medida || '')
        .replace(/refri/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      return base || null;
    },

    // Embarque del día anterior al actual (solo lectura, cacheado
    // por visita). Sin conexión o sin embarque ese día devuelve null.
    async obtenerEmbarqueDiaAnterior() {
      if (!this.embarqueData || !navigator.onLine) return null;
      const fechaActual = this.normalizarFecha(this.embarqueData.fecha) || new Date();
      const ayer = new Date(fechaActual);
      ayer.setDate(ayer.getDate() - 1);
      const ayerISO = this.toLocalYMD(ayer);
      if (this.embarqueDiaAnteriorFecha === ayerISO) {
        return this.embarqueDiaAnteriorCache;
      }
      try {
        const db = getFirestore();
        const snapshot = await getDocs(
          query(collection(db, 'embarques'), orderBy('fecha', 'desc'), limit(60))
        );
        let encontrado = null;
        snapshot.docs.forEach(docSnap => {
          if (encontrado || docSnap.id === this.$route.params.id) return;
          const data = docSnap.data();
          if (this.obtenerFechaISODesdeValor(data.fecha) === ayerISO) {
            encontrado = data;
          }
        });
        this.embarqueDiaAnteriorFecha = ayerISO;
        this.embarqueDiaAnteriorCache = encontrado;
        return encontrado;
      } catch (error) {
        console.warn('[Rendimientos] No se pudo leer el embarque del día anterior:', error);
        return null;
      }
    },

    // Kilos crudos de una medida en un embarque dado, con el mismo
    // criterio que calcularRendimiento (mix suma sus dos partes).
    obtenerKilosCrudosDeEmbarque(embarqueData, medida) {
      const mapa = embarqueData?.kilosCrudos || {};
      let valor = mapa[medida];
      if (valor === undefined) {
        const lower = medida.toLowerCase().trim();
        for (const [clave, v] of Object.entries(mapa)) {
          if (clave.toLowerCase().trim() === lower) {
            valor = v;
            break;
          }
        }
      }
      if (valor === undefined || valor === null) return null;
      if (this.esMedidaMix(medida)) {
        return (Number(valor?.medida1) || 0) + (Number(valor?.medida2) || 0);
      }
      return Number(valor) || 0;
    },

    // Rendimiento de la medida base en el embarque del día anterior,
    // con la misma lógica que calcularRendimiento: kilosCrudos del
    // embarque anterior entre el total embarcado (redondeado hacia
    // abajo) de ese día. Devuelve null si no existe (sin embarque,
    // sin kilos o sin crudos): quien llama conserva el comportamiento
    // actual en ese caso.
    async obtenerRendimientoDiaAnterior(medidaBase) {
      if (!medidaBase) return null;
      const clave = medidaBase.toLowerCase().trim();
      if (Object.prototype.hasOwnProperty.call(this.rendimientoDiaAnteriorCache, clave)) {
        return this.rendimientoDiaAnteriorCache[clave];
      }
      let rendimiento = null;
      try {
        const anterior = await this.obtenerEmbarqueDiaAnterior();
        if (anterior) {
          const totalEmbarcado = Math.floor(Number(this.obtenerTotalEmbarcado(medidaBase, anterior)) || 0);
          if (totalEmbarcado > 0) {
            const kilosCrudos = this.obtenerKilosCrudosDeEmbarque(anterior, medidaBase);
            if (kilosCrudos !== null && kilosCrudos !== undefined) {
              rendimiento = Number(kilosCrudos) / totalEmbarcado;
            }
          }
        }
      } catch (error) {
        console.warn('[Rendimientos] No se pudo calcular el rendimiento del día anterior:', error);
        rendimiento = null;
      }
      this.$set(this.rendimientoDiaAnteriorCache, clave, rendimiento);
      return rendimiento;
    },

    // Rendimiento con el que se calcula la ganancia. Medidas refri: el de la
    // medida base del día anterior; si no hay, el de la propia tarjeta.
    // Devuelve {valor, texto} (texto explica de dónde sale, para mostrarlo).
    async rendimientoParaGanancia(medida) {
      const baseRefri = this.medidaBaseRefri(medida);
      if (baseRefri) {
        const ayer = await this.obtenerRendimientoDiaAnterior(baseRefri);
        if (ayer !== null && ayer !== undefined) {
          return { valor: ayer, texto: `${baseRefri} del día anterior` };
        }
        return { valor: this.getRendimiento(medida), texto: `sin ${baseRefri} del día anterior: se usa el de esta tarjeta` };
      }
      return { valor: this.getRendimiento(medida), texto: '' };
    },

    async calcularCostoFinal(medida) {
      // Costo resuelto con la misma lógica que Gestión de Costos
      // (manual del embarque, luego catálogo medida+proveedor, luego guardado).
      // Regla refri (SOLO ganancia): costo y rendimiento de la medida
      // base. El rendimiento es el del día anterior de la base; si no
      // existe, se conserva el comportamiento actual.
      const baseRefri = this.medidaBaseRefri(medida);
      const claveCosto = baseRefri || medida;
      const resuelto = await this.resolverCostoBase(claveCosto);
      const costo = resuelto ? resuelto.costo : 0;
      if (resuelto && resuelto.detalle && resuelto.detalle.medidaEncontrada !== claveCosto) {
        console.log(`💰 [${medida}] Usando costo de: ${resuelto.detalle.medidaEncontrada} ($${costo})`);
      }
      if (!resuelto) {
        console.warn(`⚠️ [${medida}] No se encontró costo para esta medida`);
      }

      const { valor: rendimientoOriginal } = await this.rendimientoParaGanancia(medida);
      // Rendimiento a 2 decimales (como en la UI); el costo extra respeta 0.
      return calcularCostoFinalKg({
        costo,
        rendimiento: rendimientoOriginal,
        aplicarExtra: this.debeAplicarCostoExtra(medida),
        costoExtra: this.embarqueData?.costoExtra
      });
    },

    // Prende por default el análisis de ganancia en las medidas con kilos
    // embarcados y precio de venta disponible (limpios, crudos y maquila).
    // Solo toca las medidas sin decisión guardada (valor undefined): si el
    // usuario apagó un check a mano, ese valor (false) se respeta.
    // Es idempotente: se puede llamar en cada recálculo sin efectos nuevos.
    aplicarDefaultsAnalisisGanancia() {
      if (!this.embarqueData) return;
      const fechaEmbarque = this.toLocalYMD(this.normalizarFecha(this.embarqueData.fecha) || new Date());
      let cambios = false;

      (this.medidasUnicas || []).forEach(medida => {
        if (this.medidaOculta[medida]) return;

        // Medida limpia: kilos embarcados > 0 y precio de venta disponible.
        // Sin precio queda en false y conserva el aviso "sin precio" existente.
        // Las medidas "Maquila Ozuna" no se prenden: el camarón es de Ozuna
        // y su ganancia es la de maquila (se contaría doble).
        if (this.analizarGanancia[medida] === undefined && !/maquila\s+ozuna/i.test(medida)) {
          const tieneKilos = this.obtenerTotalEmbarcado(medida) > 0;
          const tienePrecio = tieneKilos && !!this.obtenerPrecioVentaParaFecha(medida, fechaEmbarque, null);
          if (tieneKilos && tienePrecio) {
            this.$set(this.analizarGanancia, medida, true);
            cambios = true;
          }
        }

        // Maquila: medidas "Maquila Ozuna" con kilos embarcados.
        if (this.analizarMaquilaGanancia[medida] === undefined) {
          if (medida.toLowerCase().includes('maquila ozuna') && this.obtenerTotalEmbarcado(medida) > 0) {
            this.$set(this.analizarMaquilaGanancia, medida, true);
            cambios = true;
          }
        }
      });

      // Tallas de crudos: kilos de venta > 0 y precio disponible.
      this.obtenerTallasCrudosUnicas().forEach(talla => {
        if (this.analizarGananciaCrudos[talla] !== undefined) return;
        const info = this.obtenerInfoTallaCrudo(talla, fechaEmbarque);
        if (info.kilosVenta > 0 && info.tienePrecio) {
          this.$set(this.analizarGananciaCrudos, talla, true);
          cambios = true;
        }
      });

      if (cambios) {
        // Persistir con el mecanismo existente (con debounce, como el
        // guardado al cambiar un check a mano).
        this.programarGuardadoAnalisis();
      }
    },

    // Kilos de venta y disponibilidad de precio de una talla de crudo,
    // con la misma lógica que calcularGananciasPorTallaCrudo.
    obtenerInfoTallaCrudo(talla, fechaEmbarque) {
      let kilosVenta = 0;
      let tienePrecio = false;
      (this.embarqueData?.clientes || []).forEach(cliente => {
        (cliente.crudos || []).forEach(crudo => {
          (crudo.items || []).forEach(item => {
            if (item.talla !== talla) return;
            const esVenta = cliente.nombre === 'Ozuna' ? item.esVenta : true;
            if (!esVenta) return;
            kilosVenta += this.calcularKilosCrudosItem(item);
            if (item.precio && item.precio > 0) {
              tienePrecio = true;
            } else if (!tienePrecio) {
              const clienteId = this.obtenerClienteIdParaPrecios(cliente.nombre);
              if (this.obtenerPrecioVentaParaFecha(talla, fechaEmbarque, clienteId)) {
                tienePrecio = true;
              }
            }
          });
        });
      });
      return { kilosVenta, tienePrecio };
    },

    // Medidas y tallas de crudo del embarque sin costo en costosPorMedida
    // (coincidencia exacta o insensible a mayúsculas/minúsculas).
    obtenerMedidasSinCosto() {
      const costos = this.embarqueData?.costosPorMedida || {};
      const tieneCosto = (medida) => {
        if (Number(costos[medida]) > 0) return true;
        const lower = medida.toLowerCase().trim();
        return Object.entries(costos).some(([clave, valor]) =>
          clave.toLowerCase().trim() === lower && Number(valor) > 0);
      };
      const faltantes = [];
      const agregarFaltante = (medida) => {
        // Regla refri (solo ganancia): el costo es el de la medida
        // base; el faltante se registra con la base para que el
        // prellenado y el prompt busquen/pidan ese costo.
        const baseRefri = this.medidaBaseRefri(medida);
        const clave = baseRefri || medida;
        if (!tieneCosto(clave) && !faltantes.includes(clave)) faltantes.push(clave);
      };
      (this.medidasUnicas || []).forEach(medida => agregarFaltante(medida));
      this.obtenerTallasCrudosUnicas().forEach(talla => agregarFaltante(talla));
      return faltantes;
    },

    // Costos por medida de los embarques anteriores más recientes que tengan
    // costo para cada medida (un mapa medida -> costo). Busca hacia atrás
    // hasta 30 días antes del embarque actual, del más reciente al más
    // viejo: el primer costo encontrado por medida gana. Solo embarques con
    // fecha anterior a la del embarque actual. La lectura es acotada
    // (orderBy fecha desc + limit) en vez de leer toda la colección.
    async obtenerCostosEmbarquesAnteriores(fechaActualISO) {
      const db = getFirestore();
      const fechaBase = this.normalizarFecha(fechaActualISO) || new Date();
      const corte = new Date(fechaBase);
      corte.setDate(corte.getDate() - 30);
      const corteISO = this.toLocalYMD(corte);
      const snapshot = await getDocs(
        query(collection(db, 'embarques'), orderBy('fecha', 'desc'), limit(60))
      );
      const anteriores = [];
      snapshot.docs.forEach(docSnap => {
        if (docSnap.id === this.$route.params.id) return;
        const data = docSnap.data();
        const fechaISO = this.obtenerFechaISODesdeValor(data.fecha);
        if (!fechaISO || fechaISO < corteISO || fechaISO >= fechaActualISO) return;
        if (!data.costosPorMedida || Object.keys(data.costosPorMedida).length === 0) return;
        anteriores.push({ fechaISO, costos: data.costosPorMedida });
      });
      // Más reciente primero: el primer costo encontrado por medida gana.
      anteriores.sort((a, b) => (a.fechaISO < b.fechaISO ? 1 : a.fechaISO > b.fechaISO ? -1 : 0));
      const mapa = {};
      const vistosLower = new Set();
      anteriores.forEach(({ costos }) => {
        Object.entries(costos).forEach(([medida, valor]) => {
          const costo = Number(valor);
          if (!(costo > 0)) return;
          const lower = medida.toLowerCase().trim();
          if (!vistosLower.has(lower)) {
            vistosLower.add(lower);
            mapa[medida] = costo;
          }
        });
      });
      return mapa;
    },

    // Prellena costosPorMedida para las medidas sin costo: primero
    // desde el catálogo global de costos (misma lógica que Gestión de
    // Costos: medida + proveedor primero) y, si no hay, hacia atrás en
    // los embarques anteriores (hasta 30 días, del más reciente al más
    // viejo). Antes de prellenar sincroniza los costos guardados viejos
    // con el catálogo (nunca sobrescribe un costo manual ni medidas
    // refri). Nunca sobrescribe un costo existente.
    // Persiste por la ruta existente (persistirCamposRendimientos).
    // Las medidas que sigan sin costo se preguntan con el prompt de
    // costos faltantes (preguntarCostosFaltantes).
    async prellenarCostosDesdeEmbarqueAnterior() {
      try {
        if (!this.embarqueData || !navigator.onLine) return 0;
        const fechaActualISO = this.toLocalYMD(this.normalizarFecha(this.embarqueData.fecha) || new Date());
        // Sincronizar valores guardados viejos con el catálogo (como
        // Gestión de Costos): si el catálogo resuelve otro costo y el
        // guardado no es manual, se actualiza. Nunca toca manuales.
        await this.sincronizarCostosGuardadosConCatalogo();
        const faltantes = this.obtenerMedidasSinCosto();
        if (faltantes.length === 0) return 0;

        const costosPrevios = await this.obtenerCostosEmbarquesAnteriores(fechaActualISO);
        const costosNuevos = {};
        for (const medida of faltantes) {
          // 1. Catálogo global de costos (medida + proveedor primero,
          //    misma lógica que Gestión de Costos)
          let costo = 0;
          const encontrado = await this.resolverCostoCatalogo(medida);
          if (encontrado && Number(encontrado.costo) > 0) {
            costo = Number(encontrado.costo);
          }
          // 2. Embarque anterior más reciente (exacto o insensible a mayúsculas)
          if (costo <= 0) {
            costo = Number(costosPrevios[medida]) || 0;
            if (costo <= 0) {
              const lower = medida.toLowerCase().trim();
              for (const [clave, valor] of Object.entries(costosPrevios)) {
                if (clave.toLowerCase().trim() === lower) {
                  costo = Number(valor) || 0;
                  break;
                }
              }
            }
          }
          if (costo > 0) {
            costosNuevos[medida] = costo;
            console.log(`💰 Costo prellenado para ${medida}: $${costo}`);
          }
        }

        if (Object.keys(costosNuevos).length === 0) return 0;

        await this.$nextTick();
        if (!this.embarqueData.costosPorMedida) {
          this.$set(this.embarqueData, 'costosPorMedida', {});
        }
        Object.entries(costosNuevos).forEach(([medida, costo]) => {
          this.$set(this.embarqueData.costosPorMedida, medida, costo);
        });
        await this.persistirCamposRendimientos({
          costosPorMedida: this.deepClone(this.embarqueData.costosPorMedida)
        });
        return Object.keys(costosNuevos).length;
      } catch (error) {
        console.warn('[Rendimientos] No se pudieron prellenar costos desde el embarque anterior:', error);
        return 0;
      }
    },

    // Sincroniza los costos guardados del embarque con el catálogo
    // (misma lógica que Gestión de Costos): si el catálogo resuelve un
    // costo distinto al guardado y ese guardado no es manual, se
    // actualiza el guardado. Así un costo viejo (ej. "51/60 tirado"
    // guardado en $149 cuando el catálogo dice $121 por el proveedor
    // Tirado) no se queda pegado. Nunca sobrescribe costos manuales
    // ni medidas refri (su costo va por la base).
    async sincronizarCostosGuardadosConCatalogo() {
      try {
        if (!this.embarqueData || !navigator.onLine) return 0;
        const guardados = this.embarqueData.costosPorMedida || {};
        const manuales = this.embarqueData.costosPorMedidaManuales || {};
        const cambios = {};
        for (const medida of (this.medidasUnicas || [])) {
          if (this.esMedidaRefri(medida)) continue;
          const guardado = Number(guardados[medida]);
          if (!(guardado > 0)) continue;
          if (Number(manuales[medida]) > 0) continue;
          const resuelto = await this.resolverCostoCatalogo(medida);
          if (!resuelto || !(Number(resuelto.costo) > 0)) continue;
          if (Number(resuelto.costo) !== guardado) {
            cambios[medida] = Number(resuelto.costo);
            console.log(`💰 Costo guardado sincronizado ${medida}: $${guardado} -> $${resuelto.costo} (${resuelto.estrategia})`);
          }
        }
        if (Object.keys(cambios).length === 0) return 0;
        await this.$nextTick();
        if (!this.embarqueData.costosPorMedida) {
          this.$set(this.embarqueData, 'costosPorMedida', {});
        }
        Object.entries(cambios).forEach(([medida, costo]) => {
          this.$set(this.embarqueData.costosPorMedida, medida, costo);
        });
        await this.persistirCamposRendimientos({
          costosPorMedida: this.deepClone(this.embarqueData.costosPorMedida)
        });
        return Object.keys(cambios).length;
      } catch (error) {
        console.warn('[Rendimientos] No se pudieron sincronizar costos guardados con el catálogo:', error);
        return 0;
      }
    },

    // Medidas/tallas del embarque actual sin costo y sin omitir, solo las
    // que están en el embarque (limpios con kilos embarcados > 0 y tallas
    // de crudo en venta). Sirve para el prompt de costos faltantes.
    medidasSinCostoConKilos() {
      const omitidos = this.embarqueData?.costosOmitidos || {};
      const omitidosLower = new Set(
        Object.entries(omitidos)
          .filter(([, valor]) => valor)
          .map(([clave]) => clave.toLowerCase().trim())
      );
      const fueOmitida = (medida) => omitidosLower.has(medida.toLowerCase().trim());
      const pendientes = [];
      this.obtenerMedidasSinCosto().forEach(medida => {
        if (fueOmitida(medida)) return;
        const esTallaCrudo = this.obtenerTallasCrudosUnicas().includes(medida);
        // Limpios: solo con kilos embarcados. Tallas de crudo: ya solo
        // existen si hay venta en el embarque.
        if (!esTallaCrudo && !(this.obtenerTotalEmbarcado(medida) > 0)) return;
        pendientes.push(medida);
      });
      return pendientes;
    },

    // Prompt de costos faltantes: si alguna medida del embarque actual
    // sigue sin costo tras el prellenado (embarques anteriores + catálogo),
    // muestra el modal para capturarlo. Una vez por visita; Omitir guarda
    // la decisión en el embarque y no se vuelve a preguntar por esa medida.
    preguntarCostosFaltantes(forzar = false) {
      if (!this.embarqueData || !navigator.onLine) return;
      if (!forzar && (this.costosPromptMostrado || this.mostrarModalCostosFaltantes)) return;
      const pendientes = this.medidasSinCostoConKilos();
      if (pendientes.length === 0) return;
      this.costosFaltantes = pendientes;
      this.costosFaltantesInputs = {};
      pendientes.forEach(medida => {
        this.$set(this.costosFaltantesInputs, medida, '');
      });
      this.mostrarModalCostosFaltantes = true;
      this.costosPromptMostrado = true;
    },

    // Guarda el costo capturado en el aviso de costos faltantes (con o sin
    // "Recordar para los siguientes días") y recalcula las ganancias.
    async guardarCostoFaltante(medida) {
      const costo = Number(this.costosFaltantesInputs[medida]);
      if (!(costo > 0)) return;
      const esTallaCrudo = this.obtenerTallasCrudosUnicas().includes(medida);
      try {
        await this.guardarCostoMedida(medida, costo, {
          recordar: this.recordarCostosFaltantes && navigator.onLine,
          tipoCosto: esTallaCrudo ? 'crudo' : 'limpio'
        });
      } catch (error) {
        console.error('[Rendimientos] No se pudo guardar el costo:', error);
        if (typeof alert === 'function') alert('No se pudo guardar el costo. ' + (error?.message || ''));
        return;
      }
      this.costosFaltantes = this.costosFaltantes.filter(m => m !== medida);
      this.$delete(this.costosFaltantesInputs, medida);
      if (this.costosFaltantes.length === 0) {
        this.mostrarModalCostosFaltantes = false;
      }
    },

    // Guarda el costo base de una medida (o talla de crudo) del embarque.
    // recordar: además lo registra en el catálogo historial_costos (como
    // Gestión de Costos) para que los siguientes días lo encuentren solo; en
    // este embarque se quita el manual para que mande el catálogo.
    // Sin recordar: costo manual solo de este embarque.
    async guardarCostoMedida(clave, costo, { recordar = false, tipoCosto = 'limpio' } = {}) {
      if (!this.embarqueData) return;
      const mismaClave = (texto) => String(texto || '').toLowerCase().trim() === String(clave).toLowerCase().trim();
      const fecha = this.toLocalYMD(this.normalizarFecha(this.embarqueData.fecha) || new Date());

      if (recordar) {
        // Asegurar el catálogo para saber si la medida ya tenía entrada propia.
        await this.asegurarCacheCostosGlobales();
        const detalle = this.resolverCostoCatalogoSync(clave);
        const entrada = entradaCatalogoCosto({ medida: clave, costo, fecha, tipoCosto, detalle });
        await addDoc(collection(getFirestore(), 'historial_costos'), entrada);
        this.costosGlobalesCache = null;
      }

      const guardados = { ...(this.embarqueData.costosPorMedida || {}) };
      Object.keys(guardados).forEach(k => { if (mismaClave(k)) delete guardados[k]; });
      guardados[clave] = costo;
      const manuales = { ...(this.embarqueData.costosPorMedidaManuales || {}) };
      Object.keys(manuales).forEach(k => { if (mismaClave(k)) delete manuales[k]; });
      if (!recordar) manuales[clave] = costo;
      const omitidos = { ...(this.embarqueData.costosOmitidos || {}) };
      Object.keys(omitidos).forEach(k => { if (mismaClave(k)) delete omitidos[k]; });

      this.$set(this.embarqueData, 'costosPorMedida', guardados);
      this.$set(this.embarqueData, 'costosPorMedidaManuales', manuales);
      this.$set(this.embarqueData, 'costosOmitidos', omitidos);
      await this.persistirCamposRendimientos({
        costosPorMedida: this.deepClone(guardados),
        costosPorMedidaManuales: this.deepClone(manuales),
        costosOmitidos: this.deepClone(omitidos)
      });
      this.costosCalculados = {};
      await this.calcularGanancias();
    },

    // Proveedores del catálogo con exactamente esa medida (no archivados),
    // con el costo vigente a la fecha del embarque cuando lo hay.
    proveedoresCatalogoDeMedida(clave) {
      const cache = this.costosGlobalesCache;
      if (!cache) return [];
      const objetivo = normalizarMedidaCatalogoCosto(clave);
      const porKey = new Map();
      [cache.activos || [], cache.porFecha || []].forEach(lista => {
        lista.forEach(entrada => {
          if (normalizarMedidaCatalogoCosto(entrada.medida) !== objetivo || entrada.archivado) return;
          porKey.set(entrada.costoKey, entrada); // porFecha (vigente) va al final y gana
        });
      });
      return ordenarProveedoresDefault(Array.from(porKey.values())).map(entrada => ({
        costoKey: entrada.costoKey,
        proveedorNombre: entrada.proveedorNombre || '',
        costoBase: Number(entrada.costoBase) || 0,
        fechaTexto: typeof entrada.fecha === 'string' ? entrada.fecha.slice(0, 10) : this.toLocalYMD(this.normalizarFecha(entrada.fecha) || new Date())
      }));
    },

    // Usar otro proveedor del catálogo para la medida: se guarda en este
    // embarque y como default general (igual que el radio de Gestión de
    // Costos). Quita el costo manual de esa medida para que mande el catálogo.
    async elegirProveedorCosto(proveedor) {
      const edicion = this.edicionCosto;
      if (!edicion || edicion.guardando || !this.embarqueData) return;
      if (!navigator.onLine) {
        edicion.error = 'Necesitas internet para cambiar de proveedor.';
        return;
      }
      edicion.guardando = true;
      edicion.error = '';
      try {
        const medidaKey = normalizarMedidaCatalogoCosto(edicion.clave);
        const porMedida = { ...(this.embarqueData.proveedorActivoPorMedida || {}), [medidaKey]: proveedor.costoKey };
        const mismaClave = (texto) => String(texto || '').toLowerCase().trim() === String(edicion.clave).toLowerCase().trim();
        const manuales = { ...(this.embarqueData.costosPorMedidaManuales || {}) };
        Object.keys(manuales).forEach(k => { if (mismaClave(k)) delete manuales[k]; });
        const guardados = { ...(this.embarqueData.costosPorMedida || {}) };
        Object.keys(guardados).forEach(k => { if (mismaClave(k)) delete guardados[k]; });
        guardados[edicion.clave] = proveedor.costoBase;

        await setDoc(doc(getFirestore(), ...DOC_PROVEEDOR_ACTIVO), {
          porMedida: { [medidaKey]: proveedor.costoKey },
          actualizado: serverTimestamp()
        }, { merge: true });
        if (this.costosGlobalesCache) {
          this.costosGlobalesCache.proveedorActivoGlobal = {
            ...(this.costosGlobalesCache.proveedorActivoGlobal || {}),
            [medidaKey]: proveedor.costoKey
          };
        }
        this.$set(this.embarqueData, 'proveedorActivoPorMedida', porMedida);
        this.$set(this.embarqueData, 'costosPorMedidaManuales', manuales);
        this.$set(this.embarqueData, 'costosPorMedida', guardados);
        await this.persistirCamposRendimientos({
          proveedorActivoPorMedida: this.deepClone(porMedida),
          costosPorMedidaManuales: this.deepClone(manuales),
          costosPorMedida: this.deepClone(guardados)
        });
        this.costosCalculados = {};
        await this.calcularGanancias();
        this.avisoPrecio = `${edicion.clave}: costo de ${proveedor.proveedorNombre || 'sin proveedor'} ($${this.formatearPrecioVenta(proveedor.costoBase)}); queda como default`;
        clearTimeout(this._timerAvisoPrecio);
        this._timerAvisoPrecio = setTimeout(() => { this.avisoPrecio = ''; }, 6000);
        this.edicionCosto = null;
      } catch (error) {
        console.error('[Rendimientos] No se pudo cambiar el proveedor:', error);
        edicion.guardando = false;
        edicion.error = 'No se pudo cambiar el proveedor. ' + (error?.message || 'Intenta de nuevo.');
      }
    },

    abrirEdicionCosto(medida, tipo = 'limpio') {
      const clave = tipo === 'limpio' ? (this.medidaBaseRefri(medida) || medida) : medida;
      const resuelto = this.resolverCostoBaseSync(clave);
      const proveedores = this.proveedoresCatalogoDeMedida(clave);
      const proveedorActual = resuelto && resuelto.fuente === 'catalogo' && resuelto.detalle
        ? resuelto.detalle.costoKey
        : null;
      this.edicionCosto = {
        proveedores,
        proveedorActual,
        medida,
        clave,
        tipo,
        costoActual: resuelto ? resuelto.costo : null,
        fuenteTexto: describirFuenteCosto(resuelto),
        nuevoCosto: resuelto ? String(resuelto.costo) : '',
        recordar: navigator.onLine,
        fecha: this.toLocalYMD(this.normalizarFecha(this.embarqueData?.fecha) || new Date()),
        guardando: false,
        error: ''
      };
      this.$nextTick(() => {
        const input = this.$refs.inputNuevoCosto;
        if (input && typeof input.focus === 'function') {
          input.focus();
          if (typeof input.select === 'function') input.select();
        }
      });
    },

    cerrarEdicionCosto() {
      if (this.edicionCosto && this.edicionCosto.guardando) return;
      this.edicionCosto = null;
    },

    async guardarEdicionCosto() {
      const edicion = this.edicionCosto;
      if (!edicion || edicion.guardando) return;
      const costo = Number(edicion.nuevoCosto);
      if (!(costo > 0)) {
        edicion.error = 'Escribe un costo mayor a 0.';
        return;
      }
      edicion.guardando = true;
      edicion.error = '';
      try {
        const recordar = Boolean(edicion.recordar) && navigator.onLine;
        await this.guardarCostoMedida(edicion.clave, costo, {
          recordar,
          tipoCosto: edicion.tipo === 'crudo' ? 'crudo' : 'limpio'
        });
        this.avisoPrecio = recordar
          ? `Costo $${this.formatearPrecioVenta(costo)} de ${edicion.clave} guardado; se recordará los siguientes días`
          : `Costo $${this.formatearPrecioVenta(costo)} de ${edicion.clave} guardado solo en este embarque`;
        clearTimeout(this._timerAvisoPrecio);
        this._timerAvisoPrecio = setTimeout(() => { this.avisoPrecio = ''; }, 6000);
        this.edicionCosto = null;
      } catch (error) {
        console.error('[Rendimientos] No se pudo guardar el costo:', error);
        edicion.guardando = false;
        edicion.error = 'No se pudo guardar el costo. ' + (error?.message || 'Intenta de nuevo.');
      }
    },

    // Omitir una medida: queda sin costo con el aviso existente y no se
    // le vuelve a preguntar por ella en este embarque/día. No bloquea nada.
    async omitirCostoFaltante(medida) {
      if (!this.embarqueData.costosOmitidos) {
        this.$set(this.embarqueData, 'costosOmitidos', {});
      }
      this.$set(this.embarqueData.costosOmitidos, medida, true);
      await this.persistirCamposRendimientos({
        costosOmitidos: this.deepClone(this.embarqueData.costosOmitidos)
      });
      this.costosFaltantes = this.costosFaltantes.filter(m => m !== medida);
      this.$delete(this.costosFaltantesInputs, medida);
      if (this.costosFaltantes.length === 0) {
        this.mostrarModalCostosFaltantes = false;
      }
    },

    async omitirTodosCostosFaltantes() {
      const pendientes = [...this.costosFaltantes];
      if (pendientes.length === 0) {
        this.mostrarModalCostosFaltantes = false;
        return;
      }
      if (!this.embarqueData.costosOmitidos) {
        this.$set(this.embarqueData, 'costosOmitidos', {});
      }
      pendientes.forEach(medida => {
        this.$set(this.embarqueData.costosOmitidos, medida, true);
      });
      await this.persistirCamposRendimientos({
        costosOmitidos: this.deepClone(this.embarqueData.costosOmitidos)
      });
      this.costosFaltantes = [];
      this.costosFaltantesInputs = {};
      this.mostrarModalCostosFaltantes = false;
    },

    // Cerrar el modal sin omitir: no bloquea nada; en la próxima visita
    // se vuelve a preguntar por las medidas que no se omitieron.
    cerrarModalCostosFaltantes() {
      this.mostrarModalCostosFaltantes = false;
    },

    async calcularGanancias() {
      if (!this.embarqueData) return;

      // Prender por default el análisis de ganancia (solo medidas sin
      // decisión guardada y con kilos + precio). Idempotente.
      this.aplicarDefaultsAnalisisGanancia();
      
      // Normalizar la fecha del embarque
      const fechaEmbarqueNormalizada = this.normalizarFecha(this.embarqueData.fecha);
      const fechaEmbarque = fechaEmbarqueNormalizada ? 
        this.toLocalYMD(fechaEmbarqueNormalizada) : 
        this.toLocalYMD(new Date());
      
      const ganancias = {};

      // Cargar el catálogo de costos una vez (también lo usan los crudos).
      await this.asegurarCacheCostosGlobales();
      // Medidas refri: rendimiento de la base del embarque anterior (se
      // muestra en la tarjeta aunque no se analice la ganancia).
      for (const medida of this.medidasUnicas) {
        const baseRefri = this.medidaBaseRefri(medida);
        if (baseRefri) await this.obtenerRendimientoDiaAnterior(baseRefri);
      }
      
      for (const medida of this.medidasUnicas) {
        // Solo calcular ganancias si el análisis está activado para esta medida
        if (!this.analizarGanancia[medida]) continue;
        
        const costoFinal = await this.calcularCostoFinal(medida);
        this.$set(this.costosCalculados, medida, costoFinal);
        
        // Costo base (sin rendimiento ni extra) con la misma resolución que
        // calcularCostoFinal, para que la tarjeta muestre el costo usado y su
        // fuente. Regla refri (solo ganancia): costo de la medida base.
        const claveCostoBase = this.medidaBaseRefri(medida) || medida;
        const resueltoBase = await this.resolverCostoBase(claveCostoBase);
        const costoBase = resueltoBase ? resueltoBase.costo : 0;

        const resultadoCalculo = this.calcularPrecioYGanancias(medida, fechaEmbarque, costoFinal, costoBase);
        if (!resultadoCalculo) continue; // Ninguna línea con precio

        resultadoCalculo.costoFuente = resueltoBase ? resueltoBase.fuente : null;
        resultadoCalculo.costoFuenteTexto = describirFuenteCosto(resueltoBase);
        ganancias[medida] = resultadoCalculo;
      }
      
      this.gananciasCalculadas = ganancias;

      // Calcular también las ganancias de crudos
      this.calcularGananciasCrudos();

      // Persistir el total general (limpios + maquila visibles) para que la lista
      // de embarques pueda mostrarlo sin recalcular nada.
      this.actualizarTotalGanancias().catch(err => {
        console.warn('[Rendimientos] No se pudo actualizar el total de ganancias:', err);
      });
    },

    // Calcula el total general de ganancias visible: limpios visibles con
    // análisis activado, ganancias de maquila visibles y ganancias de crudos
    // visibles con análisis activado.
    calcularTotalGeneralGanancias() {
      const totalNormales = Object.entries(this.gananciasCalculadas || {})
        .filter(([medida]) => !this.medidaOculta[medida] && this.analizarGanancia[medida])
        .reduce((total, [, ganancia]) => total + (Number(ganancia?.gananciaTotal) || 0), 0);

      const totalMaquila = Object.keys(this.analizarMaquilaGanancia || {})
        .filter(medida => this.analizarMaquilaGanancia[medida] && !this.medidaOculta[medida])
        .reduce((total, medida) => total + (Number(this.calcularGananciaMaquila(medida)) || 0), 0);

      const totalCrudos = Object.entries(this.gananciasCalculadasCrudos || {})
        .filter(([talla]) => this.analizarGananciaCrudos[talla])
        .reduce((total, [, ganancia]) => total + (Number(ganancia?.gananciaTotal) || 0), 0);

      return Math.round(totalNormales + totalMaquila + totalCrudos);
    },

    async actualizarTotalGanancias() {
      const total = this.calcularTotalGeneralGanancias();
      const totalActual = Number(this.embarqueData?.totalGanancias);

      // Evitar escrituras innecesarias si no cambió
      if (Number.isFinite(totalActual) && totalActual === total) {
        return;
      }

      if (this.embarqueData) {
        this.embarqueData.totalGanancias = total;
      }

      await this.persistirCamposRendimientos({ totalGanancias: total });
    },

    // Ganancia de una medida limpia. Cada línea del embarque usa su propio
    // precio de venta: el escrito en el producto ("Venta $X", el mismo de la
    // cuenta del cliente) y, si no tiene, el del catálogo con prioridad al
    // específico del cliente. Ver utils/gananciasRendimientos.
    calcularPrecioYGanancias(medida, fechaEmbarque, costoFinal, costoBase) {
      // Regla refri (solo ganancia): el precio de catálogo es el de la base.
      const medidaPrecio = this.medidaBaseRefri(medida) || medida;
      const esMaquila = /maquila\s+ozuna/i.test(medida);
      const lineas = this.obtenerLineasVentaMedida(medida).map(({ cliente, kilos, producto }) => {
        const delEmbarque = precioVentaDeProducto(producto, { esMaquila });
        const precio = delEmbarque || this.obtenerPrecioVentaParaFecha(
          medidaPrecio, fechaEmbarque, this.obtenerClienteIdParaPrecios(cliente.nombre || '')
        );
        return {
          cliente: cliente.nombre,
          kilos,
          precio: precio ? precio.precio : null,
          origen: precio ? precio.origen : null,
          fecha: precio ? precio.fecha : '',
          desdeEmbarque: Boolean(delEmbarque)
        };
      });

      const resultado = calcularGananciaLimpio(lineas, costoFinal);
      if (!resultado) return null;
      return { ...resultado, costoBase: Math.round(costoBase || 0) };
    },

    // Líneas de venta (un renglón por producto) de una medida limpia. Ozuna
    // solo cuenta como venta si la línea está marcada "Venta"; sus líneas de
    // maquila van a la medida "X Maquila Ozuna". Los refrigerados no cuentan.
    obtenerLineasVentaMedida(medida) {
      if (!this.embarqueData || !this.embarqueData.clientes) return [];
      const esOzuna = medida.includes('Maquila Ozuna');
      const medidaBase = medida.replace(' Maquila Ozuna', '').toLowerCase().trim();
      const lineas = [];
      this.embarqueData.clientes.forEach(cliente => {
        (cliente.productos || []).forEach(producto => {
          if (!producto.medida || producto.refrigerar) return;
          const mismaMedida = producto.medida.toLowerCase().trim() === medidaBase;
          const incluir = esOzuna
            ? mismaMedida && cliente.nombre === 'Ozuna' && !producto.esVenta
            : mismaMedida && (cliente.nombre !== 'Ozuna' || producto.esVenta);
          if (!incluir) return;
          const kilos = producto.tipo === 'c/h20'
            ? this.calcularTotalBolsas(producto) * (parseFloat(producto.camaronNeto) || 0.65)
            : this.calcularTotalKilos(producto);
          if (kilos > 0) lineas.push({ cliente, kilos, producto });
        });
      });
      return lineas;
    },

    // ============ MÉTODOS PARA CÁLCULO DE GANANCIAS DE CRUDOS ============

    // Obtener todas las tallas de crudos únicas
    obtenerTallasCrudosUnicas() {
      if (!this.embarqueData || !this.embarqueData.clientes) return [];
      
      const tallasSet = new Set();
      let totalItems = 0;
      let itemsDeVenta = 0;
      let itemsSinVenta = 0;
      
            this.embarqueData.clientes.forEach(cliente => {
        if (cliente.crudos && Array.isArray(cliente.crudos)) {
          cliente.crudos.forEach((crudo, crudoIndex) => {
            if (crudo && crudo.items && Array.isArray(crudo.items)) {
              crudo.items.forEach((item, itemIndex) => {
                totalItems++;
                
                if (item.talla) {
                  // Para Ozuna: solo mostrar si es venta
                  // Para otros clientes: todos los crudos son venta
                  const esVenta = cliente.nombre === 'Ozuna' ? item.esVenta : true;
                  
                  if (esVenta) {
                    tallasSet.add(item.talla);
                    itemsDeVenta++;
                  } else {
                    itemsSinVenta++;
                  }
                }
              });
            }
          });
        }
      });
      
      return Array.from(tallasSet).sort();
    },

    // Calcular ganancias de crudos por talla
    calcularGananciasCrudos() {
      if (!this.embarqueData) return;
      
      const fechaEmbarque = this.toLocalYMD(this.normalizarFecha(this.embarqueData.fecha) || new Date());
      const ganancias = {};
      const tallasCrudos = this.obtenerTallasCrudosUnicas();
      
              tallasCrudos.forEach(talla => {
        // Solo calcular ganancias si el análisis está activado para esta talla
        if (!this.analizarGananciaCrudos[talla]) {
          return;
        }
        const resultadoCalculo = this.calcularGananciasPorTallaCrudo(talla, fechaEmbarque);
        
        if (resultadoCalculo) {
          ganancias[talla] = resultadoCalculo;
        }
      });
      
      this.gananciasCalculadasCrudos = ganancias;

      // Reflejar el cambio en el total general (incluye crudos) para la lista de embarques
      this.actualizarTotalGanancias().catch(err => {
        console.warn('[Rendimientos] No se pudo actualizar el total de ganancias (crudos):', err);
      });
    },

    // Calcular ganancias para una talla específica de crudo
    calcularGananciasPorTallaCrudo(talla, fechaEmbarque) {
      if (!this.embarqueData || !this.embarqueData.clientes) return null;
      
      const detallesPorCliente = [];
      let hayPreciosIndividuales = false;

      // Costo de la talla (manual > catálogo > guardado) + sobrecosto de crudo
      const resueltoCosto = this.resolverCostoBaseSync(talla);
      const costoBase = resueltoCosto ? resueltoCosto.costo : 0;
      const costoFinal = costoBase + SOBRECOSTO_CRUDO_KG;

      // Obtener los kilos de costo para esta talla
      const tarasData = this.calcularTarasCrudosPorMedida();
      const totalKilosCosto = tarasData[talla]?.totalKilos || 0;
      
      // Iterar por todos los clientes y sus crudos
      this.embarqueData.clientes.forEach(cliente => {
        if (cliente.crudos && Array.isArray(cliente.crudos)) {
          cliente.crudos.forEach(crudo => {
            if (crudo && crudo.items && Array.isArray(crudo.items)) {
              crudo.items.forEach(item => {
                if (item.talla === talla) {
                  // Para Ozuna: solo considerar si es venta
                  // Para otros clientes: todos los crudos son venta
                  const esVenta = cliente.nombre === 'Ozuna' ? item.esVenta : true;
                  
                  if (esVenta) {
                    // Calcular kilos del item
                    const kilosVentaItem = this.calcularKilosCrudosItem(item);
                    
                    // Determinar precio a usar
                    let precioAUsar = null;
                    let fuentePrecio = '';
                    
                    if (Number(item.precio) > 0) {
                      // Usar precio individual del item
                      precioAUsar = Number(item.precio);
                      fuentePrecio = 'individual';
                      hayPreciosIndividuales = true;
                    } else {
                      // Usar precio del sistema general
                      const clienteIdParaPrecios = this.obtenerClienteIdParaPrecios(cliente.nombre);
                      const precioSistema = this.obtenerPrecioVentaParaFecha(talla, fechaEmbarque, clienteIdParaPrecios);
                      if (precioSistema) {
                        precioAUsar = precioSistema.precio;
                        fuentePrecio = precioSistema.clienteId ? 'sistema-especifico' : 'sistema-general';
                      }
                    }
                    
                    if (precioAUsar && kilosVentaItem > 0) {
                      detallesPorCliente.push({
                        cliente: cliente.nombre,
                        kilos: kilosVentaItem,
                        precioVenta: precioAUsar,
                        fuentePrecio: fuentePrecio,
                        taras: item.taras,
                        sobrante: item.sobrante,
                        sobrante2: item.sobrante2
                      });
                    }
                  }
                }
              });
            }
          });
        }
      });
      
      // Ganancia por cliente con su propio precio; el costo (pagado por los
      // kilos de costo) se reparte por kilo vendido y la suma da el total.
      const calculo = calcularGananciaCrudo(detallesPorCliente, costoFinal, totalKilosCosto);
      if (!calculo) return null;

      return {
        talla: talla,
        totalKilos: Math.round(calculo.totalKilos),
        totalKilosCosto: Math.round(totalKilosCosto),
        precioVenta: Math.round(calculo.precioPromedio),
        costoBase: costoFinal,
        costoSinSobrecosto: costoBase,
        sobrecostoKg: SOBRECOSTO_CRUDO_KG,
        costoFuente: resueltoCosto ? resueltoCosto.fuente : null,
        costoFuenteTexto: describirFuenteCosto(resueltoCosto),
        costoTotal: Math.round(calculo.totalCosto),
        gananciaUnitaria: Math.round(calculo.gananciaUnitaria),
        gananciaTotal: Math.round(calculo.gananciaTotal),
        hayPreciosIndividuales: hayPreciosIndividuales,
        detallesPorCliente: calculo.detalles,
        fechaCalculo: this.toLocalYMD(new Date())
      };
    },

    // Calcular kilos de un item de crudo
    calcularKilosCrudosItem(item) {
      let kilosTotales = 0;
      let detalleCalculo = {
        talla: item.talla,
        taras: item.taras,
        sobrante: item.sobrante,
        kilosDeTaras: 0,
        kilosDeSobrante: 0
      };
      
      // Procesar taras principales
      if (item.taras) {
        const formatoGuion = /^(\d+)-(\d+)$/.exec(item.taras);
        if (formatoGuion) {
          const cantidad = parseInt(formatoGuion[1]) || 0;
          let peso = parseInt(formatoGuion[2]) || 0;
          
          // Si el peso es 19, usar el peso configurado para ventas
          if (peso === 19) {
            peso = this.pesoTaraVenta;
          }
          
          detalleCalculo.kilosDeTaras = cantidad * peso;
          kilosTotales += detalleCalculo.kilosDeTaras;
        } else {
          // Formato original si no coincide con el patrón
          const [cantidad, peso] = item.taras.split('-').map(Number);
          detalleCalculo.kilosDeTaras = (cantidad || 0) * (peso || 0);
          kilosTotales += detalleCalculo.kilosDeTaras;
        }
      }
      
      // Procesar sobrantes
      if (item.sobrante) {
        const formatoGuion = /^(\d+)-(\d+)$/.exec(item.sobrante);
        if (formatoGuion) {
          const cantidadSobrante = parseInt(formatoGuion[1]) || 0;
          let pesoSobrante = parseInt(formatoGuion[2]) || 0;
          
          // Si el peso es 19, usar el peso configurado para ventas
          if (pesoSobrante === 19) {
            pesoSobrante = this.pesoTaraVenta;
          }
          
          detalleCalculo.kilosDeSobrante = cantidadSobrante * pesoSobrante;
          kilosTotales += detalleCalculo.kilosDeSobrante;
        } else {
          // Formato original si no coincide con el patrón
          const [cantidadSobrante, pesoSobrante] = item.sobrante.split('-').map(Number);
          detalleCalculo.kilosDeSobrante = (cantidadSobrante || 0) * (pesoSobrante || 0);
          kilosTotales += detalleCalculo.kilosDeSobrante;
        }
      }

      // Procesar segundo sobrante
      if (item.sobrante2) {
        const formatoGuion2 = /^(\d+)-(\d+)$/.exec(item.sobrante2);
        if (formatoGuion2) {
          const cantidadSobrante2 = parseInt(formatoGuion2[1]) || 0;
          let pesoSobrante2 = parseInt(formatoGuion2[2]) || 0;

          // Si el peso es 19, usar el peso configurado para ventas
          if (pesoSobrante2 === 19) {
            pesoSobrante2 = this.pesoTaraVenta;
          }

          detalleCalculo.kilosDeSobrante2 = cantidadSobrante2 * pesoSobrante2;
          kilosTotales += detalleCalculo.kilosDeSobrante2;
        } else {
          // Formato original si no coincide con el patrón
          const [cantidadSobrante2, pesoSobrante2] = item.sobrante2.split('-').map(Number);
          detalleCalculo.kilosDeSobrante2 = (cantidadSobrante2 || 0) * (pesoSobrante2 || 0);
          kilosTotales += detalleCalculo.kilosDeSobrante2;
        }
      }

      detalleCalculo.sobrante2 = item.sobrante2;
      detalleCalculo.kilosTotales = kilosTotales;

      return kilosTotales;
    },

    // Método auxiliar para guardar estado de análisis de crudos
    async guardarEstadoAnalisisCrudos() {
      await this.persistirCamposRendimientos({
        analizarGananciaCrudos: this.deepClone(this.analizarGananciaCrudos)
      });
    },

    // Inicializar costos por medida automáticamente
    async inicializarCostosPorMedida() {
      try {
        if (!navigator.onLine) {
          console.warn('No se puede inicializar costos por medida sin conexión a internet.');
          return;
        }
        const db = getFirestore();
        
        // Cargar costos registrados desde el historial
        const historialRef = collection(db, 'historial_costos');
        const historialSnapshot = await getDocs(historialRef);
        
        const historialCompleto = [];
        historialSnapshot.forEach(doc => {
          const data = doc.data();
          historialCompleto.push({
            ...data,
            id: doc.id
          });
        });
        
        // Ordenar por timestamp descendente
        historialCompleto.sort((a, b) => {
          const timestampA = a.timestamp?.toDate?.() || new Date(a.timestamp);
          const timestampB = b.timestamp?.toDate?.() || new Date(b.timestamp);
          return timestampB - timestampA;
        });
        
        // Obtener solo los costos más recientes por medida (que no estén eliminados)
        const costosRegistrados = {};
        const medidasProcesadas = new Set();
        
        historialCompleto.forEach(entrada => {
          if (!medidasProcesadas.has(entrada.medida)) {
            // Si no está marcada como eliminada, es el costo actual
            if (!entrada.eliminado && !entrada.medidaEliminada) {
              costosRegistrados[entrada.medida] = {
                costoBase: entrada.costoBase,
                fecha: entrada.fecha,
                timestamp: entrada.timestamp,
                id: entrada.id
              };
            }
            medidasProcesadas.add(entrada.medida);
          }
        });
        
        // Aplicar costos a las medidas del embarque si no tienen costo asignado
        const costosAntes = this.deepClone(this.embarqueData?.costosPorMedida || {});
        const costosEmbarque = this.embarqueData?.costosPorMedida
          ? { ...this.embarqueData.costosPorMedida }
          : {};
        let costosActualizados = false;
        
        // Obtener todas las tallas de crudos para aplicar costos
        const tallasCrudos = this.obtenerTallasCrudosUnicas();
        
        tallasCrudos.forEach(talla => {
          // Buscar costo registrado para esta talla (exacto o insensible a mayúsculas)
          let costoEncontrado = null;
          
          if (costosRegistrados[talla]) {
            costoEncontrado = costosRegistrados[talla];
          } else {
            // Búsqueda insensible a mayúsculas/minúsculas
            const tallaLower = talla.toLowerCase();
            for (const [medida, costoInfo] of Object.entries(costosRegistrados)) {
              if (medida.toLowerCase() === tallaLower) {
                costoEncontrado = costoInfo;
                break;
              }
            }
          }
          
          // Si se encontró un costo y no está asignado en el embarque, aplicarlo
          if (costoEncontrado && !costosEmbarque[talla]) {
            costosEmbarque[talla] = costoEncontrado.costoBase;
            costosActualizados = true;
            console.log(`💰 Aplicando costo automático para ${talla}: $${costoEncontrado.costoBase}`);
          }
        });
        
        if (costosActualizados && !equivalentes(costosAntes, costosEmbarque)) {
          if (!this.embarqueData.costosPorMedida) {
            this.embarqueData.costosPorMedida = {};
          }
          Object.assign(this.embarqueData.costosPorMedida, costosEmbarque);

          await this.persistirCamposRendimientos({
            costosPorMedida: this.deepClone(costosEmbarque)
          });

          console.log('✅ Costos inicializados y guardados automáticamente');
        }

      } catch (error) {
        console.error('Error al inicializar costos por medida:', error);
      }
    },


    // Nuevo método para obtener clientes que tienen productos de una medida específica
    async guardarCambiosEnTiempoReal() {
      if (this._hidratandoRendimientos) return;
      if (!this.guardadoAutomaticoActivo) return;
      const payload = this.crearPayloadRendimientos();
      await this.persistirCamposRendimientos(payload);
    },

    obtenerMedidasUnicas() {
      if (!this.embarqueData || !this.embarqueData.clientes) return;
      
      const medidasMap = new Map();
      const mixMedidas = new Map();
      
      this.embarqueData.clientes.forEach(cliente => {
        cliente.productos.forEach(producto => {
          if (producto.medida) {
            const medidaNormalizada = producto.medida.toLowerCase().trim();
            if (!medidaNormalizada) return;
            let nombreMedida = producto.medida.trim();
            let claveUnica = medidaNormalizada;
            
            // Solo añadir "Maquila Ozuna" si es de Ozuna y NO es una venta
            if (cliente.nombre === 'Ozuna' && !producto.esVenta) {
              nombreMedida = `${producto.medida.trim()} Maquila Ozuna`;
              // Crear una clave única para maquila para evitar sobrescribir ventas
              claveUnica = `${medidaNormalizada}_maquila_ozuna`;
            }

            if (medidaNormalizada.endsWith('mix')) {
              const baseSize = medidaNormalizada.split(' ')[0];
              mixMedidas.set(baseSize, nombreMedida);
            } else {
              // Usar claveUnica para permitir que existan tanto venta como maquila
              // de la misma medida sin sobrescribirse
              if (!medidasMap.has(claveUnica)) {
                medidasMap.set(claveUnica, nombreMedida);
              }
            }
          }
        });
      });

      const mixKeys = Array.from(mixMedidas.keys()).sort();
      if (mixKeys.length >= 2) {
        for (let i = 0; i < mixKeys.length; i += 2) {
          if (i + 1 < mixKeys.length) {
            const combinedName = `${mixKeys[i]}-${mixKeys[i+1]} mix`;
            const combinedNameNormalizado = combinedName.toLowerCase();
            
            if (!medidasMap.has(combinedNameNormalizado)) {
              medidasMap.set(combinedNameNormalizado, combinedName);
            }
            
            if (!this.kilosCrudos[combinedName]) {
              this.$set(this.kilosCrudos, combinedName, {
                medida1: 0,
                medida2: 0,
                etiqueta1: `Kilos en crudo (${mixKeys[i]})`,
                etiqueta2: `Kilos en crudo (${mixKeys[i+1]})`
              });
            }
          }
        }
      }
      
      this.medidasUnicas = Array.from(medidasMap.values());
    },

    // Acepta un embarque opcional (para el rendimiento del día
    // anterior de una medida refri); por default el embarque actual.
    obtenerTotalEmbarcado(medida, embarqueData = this.embarqueData) {
      if (!embarqueData || !embarqueData.clientes) return 0;

      if (medida.includes('-') && medida.endsWith('mix')) {
        const [medida1, medida2] = medida.split('-').map(m => m.trim());
        const total1 = this.calcularTotalParaMedida(medida1 + ' mix', embarqueData);
        const total2 = this.calcularTotalParaMedida(medida2.replace(' mix', '') + ' mix', embarqueData);
        return total1 + total2;
      }

      return this.calcularTotalParaMedida(medida, embarqueData);
    },

    calcularTotalParaMedida(medida, embarqueData = this.embarqueData) {
      const esOzuna = medida.includes('Maquila Ozuna');
      const medidaBase = medida.replace(' Maquila Ozuna', '').toLowerCase().trim();

      return (embarqueData?.clientes || []).reduce((total, cliente) => {
        return total + cliente.productos
          .filter(p => {
            if (!p.medida) return false;
            
            // Si la medida original es de Ozuna
            if (esOzuna) {
              // Solo incluir si el producto es de cliente Ozuna y NO es una venta
              return p.medida.toLowerCase().trim() === medidaBase && 
                     cliente.nombre === 'Ozuna' && 
                     !p.esVenta;
            } else {
              // Solo incluir si el producto coincide con la medida y NO es de Ozuna o es de Ozuna pero es VENTA
              return p.medida.toLowerCase().trim() === medidaBase && 
                     (cliente.nombre !== 'Ozuna' || p.esVenta);
            }
          })
          .reduce((subtotal, producto) => {
            if (producto.tipo === 'c/h20') {
              const totalBolsas = this.calcularTotalBolsas(producto);
              const valorNeto = parseFloat(producto.camaronNeto) || 0.65;
              return subtotal + (totalBolsas * valorNeto);
            } else {
              // Mantener el mismo total de kilos mostrado en el embarque: el
              // descuento de 3 kg sólo corresponde a las taras normales.
              return subtotal + this.calcularTotalKilos(producto);
            }
          }, 0);
      }, 0);
    },

    obtenerTotalParaRendimiento(medida) {
      if (!this.embarqueData || !this.embarqueData.clientes) return 0;
      
      const medidaNormalizada = medida.toLowerCase();
      const productos = this.embarqueData.clientes.flatMap(cliente => 
        cliente.productos.filter(p => 
          p.medida && p.medida.toLowerCase() === medidaNormalizada
        )
      );

      const tieneCH20 = productos.some(p => p.tipo === 'c/h20');
      
      if (tieneCH20) {
        return this.obtenerTotalEmbarcado(medida);
      } else {
        return this.obtenerTotalReal(medida);
      }
    },

    obtenerTotalReal(medida) {
      if (!this.embarqueData || !this.embarqueData.clientes) return 0;
      
      const esOzuna = medida.includes('Maquila Ozuna');
      const medidaBase = medida.replace(' Maquila Ozuna', '').toLowerCase().trim();
      
      return this.embarqueData.clientes.reduce((total, cliente) => {
        return total + cliente.productos
          .filter(p => {
            if (!p.medida) return false;
            
            // Si la medida original es de Ozuna
            if (esOzuna) {
              // Solo incluir si el producto es de cliente Ozuna y NO es una venta
              return p.medida.toLowerCase().trim() === medidaBase && 
                     cliente.nombre === 'Ozuna' && 
                     !p.esVenta;
            } else {
              // Solo incluir si el producto coincide con la medida y NO es de Ozuna o es de Ozuna pero es VENTA
              return p.medida.toLowerCase().trim() === medidaBase && 
                     (cliente.nombre !== 'Ozuna' || p.esVenta);
            }
          })
          .reduce((subtotal, producto) => {
            return subtotal + this.calcularTotalKilos(producto);
          }, 0);
      }, 0);
    },




    calcularRendimiento(medida) {
      if (this.esMedidaRefri(medida) && this.analizarGanancia[medida]) {
        return Number(this.rendimientoManual[medida]) || 0;
      }

      // Usar los kilos enteros que muestra el total embarcado, sin redondear hacia arriba.
      const totalEmbarcado = Math.floor(Number(this.obtenerTotalEmbarcado(medida)) || 0);
      if (totalEmbarcado <= 0) return 0;
      
      let kilosCrudos;
      if (this.esMedidaMix(medida)) {
        kilosCrudos = Number(this.kilosCrudos[medida]?.medida1 || 0) + 
                      Number(this.kilosCrudos[medida]?.medida2 || 0);
      } else {
        kilosCrudos = Number(this.kilosCrudos[medida] || 0);
      }
      
      return kilosCrudos / totalEmbarcado;
    },

    debeAlertarCero(medida, valor) {
      if (this.medidaOculta[medida]) return false;
      return (Number(valor) || 0) <= 0;
    },

    // Medidas refri: rendimiento de la medida base en el embarque del día
    // anterior. undefined = aún no se consulta; null = no hubo (se pide el
    // rendimiento manual como respaldo); número = el que se usa.
    rendimientoRefriAnterior(medida) {
      const base = this.medidaBaseRefri(medida);
      if (!base) return undefined;
      const clave = base.toLowerCase().trim();
      if (!Object.prototype.hasOwnProperty.call(this.rendimientoDiaAnteriorCache, clave)) return undefined;
      const valor = this.rendimientoDiaAnteriorCache[clave];
      return valor === null || valor === undefined ? null : Number(valor);
    },

    obtenerRendimientoActual(medida) {
      if (this.esMedidaRefri(medida)) {
        const anterior = this.rendimientoRefriAnterior(medida);
        if (typeof anterior === 'number') return anterior;
      }
      if (this.esMedidaRefri(medida) && this.analizarGanancia[medida]) {
        return Number(this.rendimientoManual[medida]) || 0;
      }

      const totalEmbarcado = Math.floor(Number(this.obtenerTotalEmbarcado(medida)) || 0);
      if (totalEmbarcado <= 0) return 0;

      const valorCrudo = this.kilosCrudos[medida];
      const kilosCrudos = this.esMedidaMix(medida)
        ? (Number(valorCrudo?.medida1) || 0) + (Number(valorCrudo?.medida2) || 0)
        : Number(valorCrudo) || 0;

      return kilosCrudos / totalEmbarcado;
    },

    tieneEntradaPendiente(medida) {
      if (this.esMedidaRefri(medida)) {
        // Con rendimiento del embarque anterior no hay nada que capturar.
        if (this.rendimientoRefriAnterior(medida) !== null) return false;
        return Boolean(this.analizarGanancia[medida]) &&
          (Number(this.rendimientoManual[medida]) || 0) <= 0;
      }

      if (this.esMedidaMix(medida)) {
        const valores = this.kilosCrudos[medida] || {};
        return (Number(valores.medida1) || 0) <= 0 ||
          (Number(valores.medida2) || 0) <= 0;
      }

      return (Number(this.kilosCrudos[medida]) || 0) <= 0;
    },

    requiereCompletarMedida(medida) {
      if (this.medidaOculta[medida]) return false;
      return this.tieneEntradaPendiente(medida) ||
        (Number(this.obtenerTotalEmbarcado(medida)) || 0) <= 0 ||
        (Number(this.obtenerRendimientoActual(medida)) || 0) <= 0;
    },

    getRendimiento(medida) {
      return this.obtenerRendimientoActual(medida) || 0;
    },

    volverAEmbarque() {
      this.$router.push({
        name: 'EditarEmbarque',
        params: { id: this.$route.params.id }
      });
    },



    actualizarRendimientoManual(medida, valor) {
      const numero = Number(valor);
      this.$set(this.rendimientoManual, medida, Number.isNaN(numero) ? 0 : numero);
      this.guardarCambiosEnTiempoReal();
      this.$nextTick(async () => {
        await this.calcularGanancias();
      });
    },

    // Costo extra (ej. $18): por default en todas las medidas de limpio
    // (no en Maquila Ozuna). Regla en utils/gananciasRendimientos.
    debeAplicarCostoExtra(medida) {
      return aplicaCostoExtra(medida, this.aplicarCostoExtra || {}, this.costoExtraDecidido || {});
    },

    // Casilla "+ $18 costo extra" de la tarjeta: guarda la decisión de esta
    // medida en el embarque (la misma que usa Gestión de Costos).
    async cambiarCostoExtra(medida, activo) {
      if (!this.embarqueData) return;
      const aplicar = { ...(this.aplicarCostoExtra || {}), [medida]: Boolean(activo) };
      const decidido = { ...(this.costoExtraDecidido || {}), [medida]: true };
      this.aplicarCostoExtra = aplicar;
      this.costoExtraDecidido = decidido;
      this.$set(this.embarqueData, 'aplicarCostoExtra', { ...aplicar });
      this.$set(this.embarqueData, 'costoExtraDecidido', { ...decidido });
      this.costosCalculados = {};
      await this.calcularGanancias();
      await this.persistirCamposRendimientos({
        aplicarCostoExtra: this.deepClone(aplicar),
        costoExtraDecidido: this.deepClone(decidido)
      });
    },

    obtenerEtiqueta(medida, campo) {
      if (!this.kilosCrudos[medida]) return campo === 'medida1' ? 
        'Kilos en crudo (Medida 1)' : 'Kilos en crudo (Medida 2)';
        
      return campo === 'medida1' ? 
        (this.kilosCrudos[medida].etiqueta1 || 'Kilos en crudo (Medida 1)') : 
        (this.kilosCrudos[medida].etiqueta2 || 'Kilos en crudo (Medida 2)');
    },

    editarEtiqueta(medida, campo) {
      this.iniciarEdicionNombreMedida(medida, campo, this.obtenerEtiqueta(medida, campo));
    },

    async generarPDF(options = {}) {
      const datosRendimientos = this.medidasUnicas
        .filter(medida => !this.medidaOculta[medida])
        .map(medida => {
          let kilosCrudos;
          if (this.esMedidaMix(medida)) {
            kilosCrudos = {
              medida1: Number(this.kilosCrudos[medida]?.medida1 || 0),
              medida2: Number(this.kilosCrudos[medida]?.medida2 || 0)
            };
          } else {
            kilosCrudos = Number(this.kilosCrudos[medida] || 0);
          }

          const rendimiento = this.getRendimiento(medida);
          const incluyeCostoFinal = !!this.analizarGanancia[medida];

          // Usar la versión síncrona que usa el cache cuando aplica
          const costoFinal = incluyeCostoFinal ? this.calcularCostoFinalSync(medida) : null;

          return {
            medida: medida,
            kilosCrudos: kilosCrudos,
            totalEmbarcado: this.obtenerTotalEmbarcado(medida),
            rendimiento: rendimiento,
            costoFinal: costoFinal,
            incluyeCostoFinal
          };
        });

      const embarqueDataConNota = {
        ...this.embarqueData,
        id: this.$route.params.id || this.embarqueData.id,
        notaRendimientos: this.embarqueData?.notaRendimientos || '',
        mostrarColumnaCosto: true // Siempre mostrar la columna de costos
      };

      // Filtrar ganancias solo para medidas visibles Y que tengan análisis activado
      const gananciasVisibles = Object.entries(this.gananciasCalculadas)
        .filter(([medida]) => !this.medidaOculta[medida] && this.analizarGanancia[medida])
        .reduce((acc, [medida, ganancia]) => {
          acc[medida] = ganancia;
          return acc;
        }, {});

      // Calcular taras de crudo por medida
      const tarasCrudosPorMedida = this.calcularTarasCrudosPorMedida();

      // Filtrar ganancias de crudos solo para tallas que tengan análisis activado
      const gananciasVisiblesCrudos = Object.entries(this.gananciasCalculadasCrudos)
        .filter(([talla]) => this.analizarGananciaCrudos[talla])
        .reduce((acc, [talla, ganancia]) => {
          acc[talla] = ganancia;
          return acc;
        }, {});

      // Calcular costos para crudos (costo base + 3.5)
      const costosCrudos = this.calcularCostosCrudos(tarasCrudosPorMedida);

      // Pasar la configuración de pesos al PDF
      const configuracionPesos = {
        pesoTaraCosto: this.pesoTaraCosto,
        pesoTaraVenta: this.pesoTaraVenta
      };

      // Calcular ganancias de maquila para el PDF
      const gananciasVisiblesMaquila = {};
      Object.keys(this.analizarMaquilaGanancia).forEach(medida => {
        if (this.analizarMaquilaGanancia[medida] && !this.medidaOculta[medida]) {
          gananciasVisiblesMaquila[medida] = {
            totalEmbarcado: this.obtenerTotalEmbarcado(medida),
            precioMaquila: this.precioMaquilaEfectivo(medida),
            gananciaTotal: this.calcularGananciaMaquila(medida)
          };
        }
      });

      try {
        const destinoLocal = { returnForDrive: Boolean(options.returnForDrive) };
        const gruposListaMedidasDiaEmbarque = navigator.onLine
          ? await this.obtenerGruposListaMedidasPedidoDiaEmbarque()
          : null;

        return await generarPDFRendimientos(
          datosRendimientos,
          embarqueDataConNota,
          gananciasVisibles,
          tarasCrudosPorMedida,
          gananciasVisiblesCrudos,
          costosCrudos,
          configuracionPesos,
          gananciasVisiblesMaquila,
          gruposListaMedidasDiaEmbarque,
          destinoLocal
        );
      } catch (error) {
        if (options.returnForDrive) throw error;
        console.error('[Rendimientos] No se pudo generar el PDF:', error);
        alert(error.message || 'No se pudo generar el PDF de rendimientos. Intenta de nuevo.');
      }
    },

    obtenerNombreMedidaPersonalizado(medida) {
      return this.nombresMedidasPersonalizados[medida] || medida;
    },

    editarNombreMedida(medida) {
      this.iniciarEdicionNombreMedida(medida, null, this.obtenerNombreMedidaPersonalizado(medida));
    },

    iniciarEdicionNombreMedida(medida, campo, nombre) {
      this.edicionNombreMedida = { medida, campo, nombre };
      this.$nextTick(() => {
        const refs = this.$refs.editorNombreMedida;
        const input = Array.isArray(refs) ? refs[0] : refs;
        if (input) {
          input.focus();
          input.select();
        }
      });
    },

    cancelarNombreMedida() {
      this.edicionNombreMedida = null;
    },

    async guardarNombreMedida() {
      const edicion = this.edicionNombreMedida;
      // Enter puede provocar blur: consumir la edición antes de persistir.
      this.edicionNombreMedida = null;
      if (!edicion) return;
      const { medida, campo } = edicion;
      if (campo) {
        const nombre = normalizarNombreMedida(edicion.nombre);
        if (!nombre || nombre === this.obtenerEtiqueta(medida, campo)) return;
        if (!this.kilosCrudos[medida]) {
          this.$set(this.kilosCrudos, medida, { medida1: 0, medida2: 0 });
        }
        this.$set(this.kilosCrudos[medida], campo === 'medida1' ? 'etiqueta1' : 'etiqueta2', nombre);
        this.guardarCambiosEnTiempoReal();
        return;
      }
      const siguiente = renombrarMedidaRendimientos(this.nombresMedidasPersonalizados, medida, edicion.nombre);
      if (!siguiente) return;
      this.nombresMedidasPersonalizados = siguiente;
      await this.persistirCamposRendimientos({ nombresMedidasPersonalizados: { ...siguiente } });
    },

    abrirModalNota() {
      this.nota = this.embarqueData?.notaRendimientos || '';
      this.mostrarModal = true;
    },

    async guardarNota() {
      await this.persistirCamposRendimientos({ notaRendimientos: this.nota });
      if (!this.embarqueData) {
        this.embarqueData = {};
      }
      this.embarqueData.notaRendimientos = this.nota;
      this.cerrarModal();
      console.log('Nota guardada correctamente');
    },

    cerrarModal() {
      this.mostrarModal = false;
      this.nota = '';
    },

    async guardarEstadoOculto() {
      await this.persistirCamposRendimientos({
        medidaOculta: { ...this.medidaOculta }
      });
      console.log('Estado de ocultación guardado correctamente');
    },

    async guardarEstadoAnalisis() {
      await this.persistirCamposRendimientos({
        analizarGanancia: { ...this.analizarGanancia },
        analizarGananciaCrudos: { ...this.analizarGananciaCrudos },
        rendimientoManual: { ...this.rendimientoManual },
        analizarMaquilaGanancia: { ...this.analizarMaquilaGanancia },
        precioMaquila: { ...this.precioMaquila }
      });
      console.log('Estado de análisis de ganancia guardado correctamente');

      // Recalcular ganancias inmediatamente para reflejar el cambio en la UI
      // sin tener que salir y volver a entrar al componente.
      await this.calcularGanancias();
      this.calcularGananciasCrudos();
    },



    irAGestionCostos() {
      this.$router.push({
        name: 'GestionCostos',
        params: { id: this.$route.params.id }
      });
    },

    irAPreparacion() {
      if (this.embarqueData && this.embarqueData.fecha) {
        // Convertir la fecha a string YYYY-MM-DD
        let fechaString = this.embarqueData.fecha;
        
        // Si ya es un string en formato correcto, usarlo directamente
        if (typeof fechaString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fechaString)) {
          console.log('Fecha ya está en formato YYYY-MM-DD:', fechaString);
        } else if (typeof fechaString === 'object' && fechaString.seconds) {
          // Es un Timestamp de Firebase, convertir a string usando UTC para evitar desfases
          const fechaDate = new Date(fechaString.seconds * 1000);
          const y = fechaDate.getUTCFullYear();
          const m = String(fechaDate.getUTCMonth() + 1).padStart(2, '0');
          const d = String(fechaDate.getUTCDate()).padStart(2, '0');
          fechaString = `${y}-${m}-${d}`;
          console.log('Fecha convertida de Timestamp usando UTC:', fechaString);
        } else if (fechaString instanceof Date) {
          // Es un objeto Date, convertir usando la zona horaria local
          const y = fechaString.getFullYear();
          const m = String(fechaString.getMonth() + 1).padStart(2, '0');
          const d = String(fechaString.getDate()).padStart(2, '0');
          fechaString = `${y}-${m}-${d}`;
          console.log('Fecha convertida de Date:', fechaString);
        } else if (typeof fechaString === 'string') {
          // Es string pero puede estar en otro formato (ISO, etc.)
          if (fechaString.includes('T')) {
            // Si es ISO string, extraer solo la parte de la fecha
            fechaString = fechaString.split('T')[0];
          }
          console.log('Fecha procesada desde string:', fechaString);
        }
        
        // Navegar a Preparación con la fecha del embarque y el ID del embarque como query parameters
        this.$router.push({
          name: 'Preparacion',
          query: { 
            fecha: fechaString,
            embarqueId: this.$route.params.id
          }
        });
        console.log('Navegando a Preparación con fecha:', fechaString);
      } else {
        // Si no hay fecha del embarque, ir sin parámetros
        this.$router.push({ name: 'Preparacion' });
        console.log('Navegando a Preparación sin fecha específica');
      }
    },

    async abrirPesadasDelDia() {
      const ticket = (this._pesadasTicket || 0) + 1;
      this._pesadasTicket = ticket;
      const fecha = fechaPesadasDelEmbarque(this.embarqueData && this.embarqueData.fecha);
      this.pesadasModal = {
        abierto: true,
        cargando: Boolean(fecha),
        error: '',
        fecha: fecha || '',
        fechaTexto: fecha ? formatoFechaPesadas(fecha) : '',
        grupos: [],
        totalKilos: 0,
        totalTaras: 0,
        tieneTaras: false,
        tienePesadas: false,
        mensajeVacio: fecha
          ? 'No hay pesadas registradas para este día.'
          : 'Este embarque no tiene una fecha válida, así que no hay un día de pesadas que consultar.'
      };
      if (!fecha) return;
      try {
        const jornada = await this.consultarPesadasDia(fecha);
        if (this._pesadasTicket !== ticket || !this.pesadasModal.abierto) return;
        const delDia = filtrarPesadasPorDia(jornada ? [jornada] : [], fecha);
        const resumen = agruparPesadasPorMedida(delDia[0] || {});
        this.pesadasModal = {
          ...this.pesadasModal,
          cargando: false,
          grupos: resumen.grupos,
          totalKilos: resumen.totalKilos,
          totalTaras: resumen.totalTaras,
          tieneTaras: resumen.tieneTaras,
          tienePesadas: resumen.tienePesadas
        };
      } catch (error) {
        if (this._pesadasTicket !== ticket || !this.pesadasModal.abierto) return;
        console.error('[Rendimientos] No se pudieron leer las pesadas:', error);
        this.pesadasModal = {
          ...this.pesadasModal,
          cargando: false,
          error: 'No se pudieron leer las pesadas de este día. No se modificó nada.'
        };
      }
    },

    async consultarPesadasDia(fecha) {
      const db = getFirestore();
      const snap = await getDoc(doc(db, 'pesadasDiarias', fecha));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() };
    },

    cerrarPesadasDelDia() {
      this._pesadasTicket = (this._pesadasTicket || 0) + 1;
      this.pesadasModal = { ...this.pesadasModal, abierto: false, cargando: false };
    },




    

    // Métodos para configuración de pesos
    abrirModalConfiguracion() {
      this.mostrarModalConfiguracion = true;
    },

    cerrarModalConfiguracion() {
      this.mostrarModalConfiguracion = false;
    },

    async guardarConfiguracion() {
      const payload = {
        pesoTaraCosto: Number(this.pesoTaraCosto) || 0,
        pesoTaraVenta: Number(this.pesoTaraVenta) || 0
      };

      await this.persistirCamposRendimientos(payload);

      console.log('Configuración de pesos guardada correctamente');
      this.cerrarModalConfiguracion();
      this.calcularGanancias();
    },

    // Determinar si se debe mostrar el detalle por cliente
    deberMostrarDetallePorCliente(talla) {
      const gananciaCrudo = this.gananciasCalculadasCrudos[talla];
      if (!gananciaCrudo || !gananciaCrudo.detallesPorCliente) return false;
      
      // Solo mostrar si hay más de un cliente
      if (gananciaCrudo.detallesPorCliente.length <= 1) return false;
      
      // Verificar si hay precios diferentes entre los clientes
      const precios = gananciaCrudo.detallesPorCliente.map(detalle => detalle.precioVenta);
      const preciosUnicos = new Set(precios);
      
      // Solo mostrar detalle si hay precios diferentes
      return preciosUnicos.size > 1;
    },

    // Calcular ganancia de maquila para una medida
    formatearPrecioVenta(precio) {
      const n = Number(precio) || 0;
      return Number.isInteger(n) ? this.formatearPrecio(n) : this.formatearPrecioConDecimales(n);
    },

    iconoOrigenPrecio(origen) {
      return { manual: '✋', especifico: '📌', general: '🌐' }[origen] || '🌐';
    },

    // Suma de kilos del desglose "Precio por cliente" (renglón Total).
    // Solo lo vendido: el renglón "refri" no cuenta.
    sumarKilosDetalle(detalles) {
      return (detalles || []).reduce((total, d) => total + (d.noCuenta ? 0 : (Number(d.totalEmbarcado) || 0)), 0);
    },

    textoOrigenCorto(origen) {
      return { manual: 'manual', especifico: 'del cliente', general: 'general' }[origen] || 'general';
    },

    // Las medidas de maquila de Ozuna no se editan aquí: su precio es la
    // cuota de maquila (campo de la tarjeta de Maquila ganancia).
    puedeEditarPrecio(medida) {
      return !/maquila\s+ozuna/i.test(medida || '');
    },

    abrirEdicionPrecio(medida, detalle) {
      if (!this.puedeEditarPrecio(medida) || !detalle) return;
      const medidaPrecio = this.medidaBaseRefri(medida) || medida;
      const clienteId = this.obtenerClienteIdParaPrecios(detalle.cliente || '');
      this.edicionPrecio = {
        medida,
        medidaPrecio,
        cliente: detalle.cliente,
        clienteId,
        precioActual: detalle.precioVenta || null,
        origen: detalle.origen || null,
        nuevoPrecio: detalle.precioVenta ? String(detalle.precioVenta) : '',
        alcance: 'embarque',
        quitarPropio: true,
        fecha: this.toLocalYMD(this.normalizarFecha(this.embarqueData?.fecha) || new Date()),
        guardando: false,
        error: ''
      };
      this.$nextTick(() => {
        const input = this.$refs.inputNuevoPrecio;
        if (input && typeof input.focus === 'function') {
          input.focus();
          if (typeof input.select === 'function') input.select();
        }
      });
    },

    cerrarEdicionPrecio() {
      if (this.edicionPrecio && this.edicionPrecio.guardando) return;
      this.edicionPrecio = null;
    },

    // Nombre del producto en la colección `precios`: si ya existe uno con el
    // mismo nombre normalizado se reutiliza (misma escritura que Precios).
    nombreProductoCatalogo(medidaPrecio) {
      const clave = normalizarMedida(medidaPrecio);
      const grupo = this.encontrarPreciosParaMedida(medidaPrecio);
      const existente = (grupo?.precios || []).find(p => p?.producto && normalizarMedida(p.producto) === clave);
      return existente ? existente.producto : normalizarNombreProductoPrecio(String(medidaPrecio).trim());
    },

    // Aplica el precio en las líneas de esa medida en cada embarque (camión)
    // del día. Escribe solo `clientes` con la revisión del documento recién
    // leído; si alguien guardó en medio, vuelve a leer y reintenta.
    // Un embarque "Protegido" también se actualiza: la protección bloquea
    // kilos y taras, no precios (en el editor el botón "$" y la
    // actualización automática de precios siguen activos).
    async aplicarPrecioEnEmbarquesDelDia(opciones) {
      const db = getFirestore();
      const ids = this.idsEmbarquesRelacionados.length
        ? this.idsEmbarquesRelacionados
        : [this.$route.params.id];
      let cambiadas = 0;
      for (const id of ids) {
        for (let intento = 0; intento < 3; intento += 1) {
          const snap = await getDoc(doc(db, 'embarques', id));
          if (!snap.exists()) break;
          const data = snap.data();
          const resultado = aplicarPrecioEnClientes(data.clientes || [], opciones);
          if (!resultado.cambiadas) break;
          try {
            await escribirCamposEmbarque(db, id, {
              baseRev: Number(data.rev) || 0,
              baseCampos: { clientes: data.clientes || [] },
              campos: { clientes: resultado.clientes }
            });
            cambiadas += resultado.cambiadas;
            break;
          } catch (error) {
            if (esErrorConflictoEmbarque(error) && intento < 2) continue;
            throw error;
          }
        }
      }
      return { cambiadas };
    },

    async guardarEdicionPrecio() {
      const edicion = this.edicionPrecio;
      if (!edicion || edicion.guardando) return;
      const precio = Number(edicion.nuevoPrecio);
      if (!(precio > 0)) {
        edicion.error = 'Escribe un precio mayor a 0.';
        return;
      }
      if (!navigator.onLine) {
        edicion.error = 'Necesitas internet para cambiar precios.';
        return;
      }
      if (edicion.alcance === 'cliente' && !edicion.clienteId) {
        edicion.error = 'Este cliente no tiene precios propios en la lista de Precios.';
        return;
      }

      edicion.guardando = true;
      edicion.error = '';
      try {
        const db = getFirestore();
        const quitarPropio = edicion.alcance === 'general' && edicion.origen === 'especifico' &&
          Boolean(edicion.clienteId) && edicion.quitarPropio;

        if (edicion.alcance !== 'embarque') {
          const producto = this.nombreProductoCatalogo(edicion.medidaPrecio);
          const registro = {
            producto,
            precio,
            fecha: edicion.fecha,
            categoria: categoriaProductoPrecio(producto),
            timestamp: Date.now(),
            fechaCreacion: this.toLocalYMD(new Date()),
            horaCreacion: new Date().toLocaleTimeString('es-ES')
          };
          if (edicion.alcance === 'cliente') registro.clienteId = edicion.clienteId;
          await addDoc(collection(db, 'precios'), registro);

          // Igual que "Sobreescribir con precio general" en Precios: el
          // cliente deja de tener precio propio para ese producto.
          if (quitarPropio) {
            const clave = normalizarMedida(producto);
            const grupo = this.encontrarPreciosParaMedida(edicion.medidaPrecio);
            const propios = (grupo?.precios || []).filter(p =>
              p?.id && p.clienteId === edicion.clienteId && normalizarMedida(p.producto) === clave);
            for (const registroPropio of propios) {
              await deleteDoc(doc(db, 'precios', registroPropio.id));
            }
          }
        }

        const { cambiadas } = await this.aplicarPrecioEnEmbarquesDelDia({
          medida: edicion.medida,
          precio,
          alcance: edicion.alcance,
          cliente: edicion.cliente,
          fecha: edicion.fecha,
          clienteId: edicion.clienteId,
          quitarPropio
        });

        if (edicion.alcance !== 'embarque') await this.cargarPreciosVenta();
        await this.cargarEmbarque();
        await this.calcularGanancias();

        const donde = {
          embarque: 'solo en este embarque',
          cliente: `como precio de ${edicion.cliente}`,
          general: 'como precio general'
        }[edicion.alcance];
        let aviso = `Precio $${this.formatearPrecioVenta(precio)} guardado ${donde}`;
        aviso += cambiadas ? ` · ${cambiadas} ${cambiadas === 1 ? 'línea actualizada' : 'líneas actualizadas'}` : '';
        this.avisoPrecio = aviso;
        clearTimeout(this._timerAvisoPrecio);
        this._timerAvisoPrecio = setTimeout(() => { this.avisoPrecio = ''; }, 6000);
        this.edicionPrecio = null;
      } catch (error) {
        console.error('[Rendimientos] No se pudo guardar el precio:', error);
        edicion.guardando = false;
        edicion.error = esErrorConflictoEmbarque(error)
          ? 'Otra pantalla está guardando este embarque. Intenta de nuevo en unos segundos.'
          : 'No se pudo guardar el precio. ' + (error?.message || 'Intenta de nuevo.');
      }
    },

    describirOrigenPrecio(detalle) {
      const textos = {
        manual: 'Precio capturado a mano en el embarque',
        especifico: 'Precio específico del cliente',
        general: 'Precio general'
      };
      const base = textos[detalle.origen] || 'Precio general';
      const donde = detalle.desdeEmbarque ? ' (línea del embarque)' : ' (catálogo de precios)';
      const fecha = detalle.fechaPrecio ? `, del ${detalle.fechaPrecio}` : '';
      return base + donde + fecha;
    },

    // Precio de maquila por kg: el capturado en Rendimientos y, si está
    // vacío, el que traen las líneas de maquila del embarque (el mismo que
    // se le cobra a Ozuna). Antes, vacío daba ganancia de maquila 0.
    precioMaquilaDelEmbarque(medida) {
      if (!/maquila\s+ozuna/i.test(medida || '')) return 0;
      return precioMaquilaPonderado(
        this.obtenerLineasVentaMedida(medida).map(({ kilos, producto }) => ({ kilos, precio: producto.precio }))
      );
    },

    precioMaquilaEfectivo(medida) {
      const capturado = Number(this.precioMaquila[medida]);
      if (capturado > 0) return capturado;
      return this.precioMaquilaDelEmbarque(medida);
    },

    calcularGananciaMaquila(medida) {
      return this.obtenerTotalEmbarcado(medida) * this.precioMaquilaEfectivo(medida);
    },



  },

  watch: {
    kilosCrudos: {
      handler() {
        if (this._hidratandoRendimientos) return;
        this.guardarCambiosEnTiempoReal();
        // Recalcular ganancias cuando cambien los kilos crudos
        this.$nextTick(async () => {
          await this.calcularGanancias();
        });
      },
      deep: true
    },
    analizarGanancia: {
      handler() {
        // Recalcular ganancias cuando se active/desactive el análisis
        this.$nextTick(async () => {
          await this.calcularGanancias();
        });
      },
      deep: true
    },
    analizarGananciaCrudos: {
      handler(newValue, oldValue) {
        // Verificar si se activó algún análisis nuevo
        const seMadeChangio = Object.keys(newValue).some(talla => {
          return newValue[talla] && !oldValue[talla];
        });
        
        // Si se activó algún análisis nuevo, inicializar costos automáticamente
        if (seMadeChangio) {
          this.inicializarCostosPorMedida().then(() => {
            // Recalcular ganancias después de inicializar costos
            this.$nextTick(() => {
              this.calcularGananciasCrudos();
            });
          });
        } else {
          // Solo recalcular ganancias si no se activó nuevo análisis
          this.$nextTick(() => {
            this.calcularGananciasCrudos();
          });
        }
      },
      deep: true
    },

    // Watchers para configuración de pesos
    pesoTaraCosto: {
      handler() {
        if (this.embarqueData) {
          this.$nextTick(() => {
            this.calcularGanancias();
          });
        }
      }
    },

    pesoTaraVenta: {
      handler() {
        if (this.embarqueData) {
          this.$nextTick(() => {
            this.calcularGanancias();
          });
        }
      }
    },

    // Maquila y precio se guardan en guardarEstadoAnalisis (el @change / @input).
    // Un watcher además de eso disparaba un segundo guardado con la revisión
    // vieja y lo interpretaba como conflicto.



  },

  beforeDestroy() {
    if (this.guardarCambiosEnTiempoReal.cancel) {
      this.guardarCambiosEnTiempoReal.cancel();
    }
    if (this.programarGuardadoAnalisis && this.programarGuardadoAnalisis.cancel) {
      this.programarGuardadoAnalisis.cancel();
    }
    window.removeEventListener('online', this.syncOfflineRendimientos);
  }
}
</script>

<style scoped>
.rendimientos-container {
  padding: 20px;
}

.aviso-conflicto {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 12px 0;
  padding: 12px 14px;
  border: 1px solid #e0b15a;
  border-radius: 8px;
  background: #fff4e5;
  color: #6a4b12;
}

.aviso-error {
  border-color: #d36b6b;
  background: #fdecec;
  color: #7a2424;
}

.aviso-conflicto p {
  margin: 0;
  flex: 1 1 220px;
  line-height: 1.35;
}

.aviso-conflicto button {
  border: 1px solid #c4923a;
  background: #fff;
  color: #6a4b12;
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
}

@media (max-width: 640px) {
  .aviso-conflicto button {
    flex: 1 1 calc(50% - 8px);
  }
}

.rendimientos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.rendimiento-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background-color: #fff;
}

.medida-label {
  font-size: 1.2em;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 10px;
  display: block;
}

.input-group {
  margin: 15px 0;
}

.input-group label {
  display: block;
  margin-bottom: 5px;
  color: #666;
}

.rendimiento-manual-group {
  padding: 12px;
  background: #f8fbff;
  border: 1px solid #d8e8f8;
  border-radius: 8px;
}

.rendimiento-manual-group label {
  color: #2c3e50;
  font-weight: 600;
}

input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.resultados {
  margin-top: 15px;
}

.rendimiento {
  font-weight: bold;
}

.rendimiento-alto {
  color: #27ae60;
}

.header-container {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

/* Total general de ganancias del día: barra fija al hacer scroll */
.ganancia-total-sticky {
  position: sticky;
  top: 0;
  z-index: 60;
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
  background: #1a202c;
  color: #fff;
  padding: 10px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

.ganancia-total-sticky-label {
  font-size: 0.95rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #cbd5e0;
}

.ganancia-total-sticky-valor {
  font-size: 1.5rem;
  font-weight: 800;
  color: #fff;
}

.ganancia-total-sticky-detalle {
  font-size: 0.85rem;
  color: #a0aec0;
  margin-left: auto;
}

.resumen-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.resumen-header {
  background-color: #343a40;
  color: white;
  padding: 10px 12px;
  border-radius: 4px;
  margin: 0;
}

.resumen-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.resumen-tab-button {
  border: 1px solid #2d3748;
  background: #fff;
  color: #1a202c;
  border-radius: 14px;
  padding: 10px 14px;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.35;
  cursor: pointer;
  flex: 1 1 160px;
  min-height: 44px;
  text-align: center;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease,
    border-color 0.15s ease;
}

.resumen-tab-button:active {
  transform: scale(0.99);
}

.resumen-tab-button.activo {
  background: #343a40;
  color: #fff;
  border-color: #343a40;
  box-shadow: 0 2px 6px rgba(52, 58, 64, 0.25);
}

.resumen-dia-panel {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

.resumen-dia-total {
  margin: 6px 0;
  font-weight: 600;
}

.resumen-dia-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
  margin-bottom: 14px;
}

.resumen-dia-table th,
.resumen-dia-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.resumen-dia-table th {
  background: #f2f2f2;
}

.resumen-dia-estado {
  margin: 0;
  color: #4b5563;
}

.resumen-dia-estado.error {
  color: #b91c1c;
}

.medidas-hoy-panel {
  border: 1px solid #c7d7f0;
  border-radius: 10px;
  padding: 14px 16px;
  background: linear-gradient(180deg, #f8fbff 0%, #fff 100%);
}

.medidas-hoy-title {
  margin: 0 0 6px;
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #1f4f9c;
}

.medidas-hoy-fecha {
  margin: 0 0 14px;
  color: #4b5563;
  font-size: 1.05rem;
}

.btn-volver {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-volver:hover {
  background-color: #2980b9;
}

.btn-volver i {
  margin-right: 10px;
}

.resultados p {
  margin: 8px 0;
  font-size: 1.1em;
}

.resultados .rendimiento {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid #eee;
}

.rendimiento span {
  font-size: 1.2em;
  font-weight: bold;
}

.mix-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.mix-input {
  flex: 1;
}

.mix-input label {
  font-size: 0.9em;
}

.editable-label {
  cursor: pointer;
  user-select: none;
}

.editable-label:hover {
  color: #3498db;
  text-decoration: underline;
}

.btn-pdf {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-left: auto;
}

.btn-pdf:hover {
  background-color: #c0392b;
}

.btn-pdf i {
  margin-right: 10px;
}

.nombre-medida-input {
  max-width: 100%;
  min-width: 0;
  font: inherit;
}

.medida-label.editable-label {
  cursor: pointer;
  transition: color 0.3s ease;
}

.medida-label.editable-label:hover {
  color: #3498db;
}

.btn-nota {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  background-color: #f39c12;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-left: auto;
  margin-right: 10px;
}

.btn-nota:hover {
  background-color: #d68910;
}

.btn-nota i {
  margin-right: 10px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
}

.modal-content h3 {
  margin-top: 0;
  color: #2c3e50;
}

.modal-content textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin: 10px 0;
  font-size: 16px;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 15px;
}

.btn-guardar {
  background-color: #2ecc71;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-cancelar {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.modal-descripcion {
  font-size: 0.95rem;
  margin: 10px 0;
}

.costos-faltantes-lista {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 15px 0;
}

.costo-faltante-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

/* El nombre ocupa su propio renglón: en celular no se corta ("P." en vez de "Piojo panga") */
.costo-faltante-medida {
  flex: 1 0 100%;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.costo-faltante-input {
  flex: 1 1 110px;
  min-width: 0;
  width: 110px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.btn-chico {
  padding: 8px 10px;
}

.ganancia-total-sticky-costos {
  background: #e53e3e;
  color: #fff;
  border: none;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.configuracion-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin: 20px 0;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-item label {
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 5px;
}

.config-item input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.config-help {
  font-size: 0.85em;
  color: #666;
  font-style: italic;
  margin-top: 5px;
}

.medida-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.controles-medida {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ocultar-control {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.9em;
  color: #666;
}

.ocultar-control input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.ocultar-control label {
  cursor: pointer;
  user-select: none;
}

.analizar-ganancia-control {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.9em;
  color: #27ae60;
  font-weight: bold;
}

.analizar-ganancia-control input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.analizar-ganancia-control label {
  cursor: pointer;
  user-select: none;
}

.maquila-ganancia-control {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.9em;
  color: #27ae60;
  font-weight: bold;
}

.maquila-ganancia-control input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.maquila-ganancia-control label {
  cursor: pointer;
  user-select: none;
}



.ganancia-info {
  margin-top: 15px;
  padding: 12px;
  background-color: #f8fafc;
  border: 1px solid #dfe7ef;
  border-radius: 10px;
}

.ganancia-header h4 {
  margin-top: 0;
  margin-bottom: 8px;
  color: #34495e;
  font-size: 1em;
}

.ganancia-detalles {
  display: grid;
  grid-template-columns: 1fr;
  gap: 5px;
}

.ganancia-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  padding: 6px 9px;
  background: #fff;
  border: 1px solid #edf1f5;
  border-radius: 8px;
}

.ganancia-item .label {
  font-weight: bold;
  color: #607080;
  font-size: 0.86em;
}

.ganancia-item .valor {
  font-weight: bold;
  font-size: 1em;
  color: #2c3e50;
  text-align: right;
}

.costo-medida {
  color: #2980b9;
}

.ganancia-positiva {
  color: #27ae60;
}

.ganancia-negativa {
  color: #e74c3c;
}

.ganancia-total-item {
  margin-top: 4px;
  border-color: #d8efe1;
  background: #f3fbf6;
}

.ganancia-fecha {
  margin-top: 4px;
  padding: 0 2px;
  font-size: 0.9em;
  color: #777;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.indicador-precio-reciente {
  font-size: 0.8em;
  color: #28a745;
  font-weight: bold;
  background-color: #d4edda;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #c3e6cb;
  align-self: flex-start;
}

.sin-precio-venta {
  margin-top: 10px;
  padding: 10px;
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  border-radius: 5px;
  color: #856404;
  font-weight: bold;
  text-align: center;
}

.aviso-sin-precio {
  margin: 0;
  padding: 0;
}

.btn-costos {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  background-color: #2ecc71;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-left: auto;
  margin-right: 10px;
}

.btn-costos:hover {
  background-color: #27ae60;
}

.btn-costos i {
  margin-right: 10px;
}

.btn-pesadas {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-preparacion {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-left: auto;
  margin-right: 10px;
}

.btn-preparacion:hover {
  background-color: #2980b9;
}

.btn-preparacion i {
  margin-right: 10px;
}

.btn-configuracion {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  background-color: #9b59b6;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-left: auto;
  margin-right: 10px;
}

.btn-configuracion:hover {
  background-color: #8e44ad;
}

.btn-configuracion i {
  margin-right: 10px;
}



.precio-venta-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  min-width: 0;
}

.precio-especifico-badge, .precio-general-badge, .precio-promedio-badge {
  font-size: 0.75em;
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: bold;
  white-space: nowrap;
}

.precio-especifico-badge {
  background-color: #e8f5e8;
  color: #2d5a2d;
  border: 1px solid #a5d6a7;
}

.precio-general-badge {
  background-color: #e3f2fd;
  color: #1565c0;
  border: 1px solid #90caf9;
}

.precio-promedio-badge {
  background-color: #fff3e0;
  color: #e65100;
  border: 1px solid #ffcc80;
}

/* Estilos para la sección de ganancias de crudos */
.crudos-ganancias-section {
  margin-top: 40px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.crudos-ganancias-section h2 {
  color: #2c3e50;
  margin-bottom: 20px;
  text-align: center;
  font-size: 1.6em;
}

.crudos-ganancias-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.crudo-ganancia-card {
  background-color: #ffffff;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s ease;
}

.crudo-ganancia-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.crudo-ganancia-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e9ecef;
}

.crudo-ganancia-header h4 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.2em;
  font-weight: bold;
}

.crudo-ganancia-controls {
  display: flex;
  align-items: center;
}

.checkbox-container {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  font-size: 0.9em;
  color: #27ae60;
  font-weight: bold;
}

.checkbox-container input[type="checkbox"] {
  width: auto;
  margin: 0;
  cursor: pointer;
}

.checkmark {
  cursor: pointer;
}

.crudo-ganancia-info {
  margin-top: 15px;
}

.crudo-ganancia-detalles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 15px;
}

.detalles-clientes {
  margin-top: 15px;
  padding: 15px;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 5px;
}

.detalles-clientes h5 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #495057;
  font-size: 1em;
}

.detalle-cliente {
  display: grid;
  grid-template-columns: 1fr auto auto auto auto;
  gap: 10px;
  align-items: center;
  padding: 8px;
  background-color: #ffffff;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  margin-bottom: 8px;
}

.cliente-nombre {
  font-weight: bold;
  color: #2c3e50;
}

.cliente-kilos {
  font-size: 0.9em;
  color: #6c757d;
}

.cliente-precio {
  font-weight: bold;
  color: #007bff;
}

.cliente-ganancia {
  font-weight: bold;
  font-size: 1.1em;
}

.fuente-precio {
  font-size: 1.2em;
  cursor: help;
}

.precio-individual-badge, .precio-sistema-badge {
  font-size: 0.75em;
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: bold;
  white-space: nowrap;
}

.precio-individual-badge {
  background-color: #e8f5e8;
  color: #2d5a2d;
  border: 1px solid #a5d6a7;
}

.precio-sistema-badge {
  background-color: #e3f2fd;
  color: #1565c0;
  border: 1px solid #90caf9;
}

.sin-analisis-crudo {
  margin-top: 15px;
  padding: 20px;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 5px;
  text-align: center;
}

.aviso-sin-analisis {
  margin: 0;
  color: #6c757d;
  font-style: italic;
}

.sin-datos-crudo {
  margin-top: 15px;
  padding: 20px;
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  border-radius: 5px;
  text-align: center;
}

.aviso-sin-datos {
  margin: 0;
  color: #856404;
  font-weight: bold;
}

.maquila-precio-input {
  margin-top: 10px;
  padding: 10px;
  background-color: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.precio-maquila-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.maquila-ganancia-info {
  margin-top: 15px;
  padding: 15px;
  background-color: #f4f8ff;
  border: 1px solid #b3d9ff;
  border-radius: 5px;
}

.maquila-ganancia-header h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #2c5282;
  font-size: 1.1em;
}

.maquila-ganancia-detalles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.precio-maquila {
  color: #2c5282;
  font-weight: bold;
}

.costo-final-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  min-width: 0;
}

.costo-extra-indicator {
  font-size: 0.8em;
  color: #f39c12;
  font-weight: normal;
  text-align: right;
}

@media (max-width: 768px) {
  .resumen-header-row {
    flex-direction: column;
    align-items: stretch;
  }

  .resumen-tabs {
    width: 100%;
    flex-direction: column;
    gap: 10px;
  }

  .resumen-tab-button {
    width: 100%;
    min-height: unset;
    padding: 13px 18px;
    font-size: 1.0625rem;
    line-height: 1.3;
    border-radius: 12px;
    box-shadow: 0 2px 4px rgba(15, 23, 42, 0.08);
  }

  .medidas-hoy-panel {
    padding: 16px 14px;
  }

  .medidas-hoy-title {
    font-size: 1.5rem;
  }

  .medidas-hoy-fecha {
    font-size: 1.08rem;
  }

  .controles-medida {
    flex-direction: column;
    gap: 10px;
  }
  
  .medida-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .ocultar-control,
  .analizar-ganancia-control,
  .maquila-ganancia-control {
    font-size: 0.8em;
  }
  
  .ganancia-detalles {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .maquila-ganancia-detalles {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .precio-venta-container {
    align-items: flex-start;
  }
  
  .costo-final-container {
    align-items: flex-start;
  }
  
  .crudos-ganancias-grid {
    grid-template-columns: 1fr;
  }
  
  .crudo-ganancia-detalles {
    grid-template-columns: 1fr;
  }
  
  .crudo-ganancia-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .detalle-cliente {
    grid-template-columns: 1fr;
    gap: 5px;
    text-align: left;
  }
  
  .cliente-nombre {
    font-size: 1.1em;
  }

  .configuracion-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .header-container {
    flex-wrap: wrap;
    gap: 10px;
  }

  .btn-preparacion {
    margin-left: 0;
    margin-right: 0;
  }

  .btn-configuracion {
    margin-left: 0;
    margin-right: 0;
  }
}

/* Cabina visual de rendimientos */
.rendimientos-container {
  --rend-bg: #050914;
  --rend-panel: rgba(11, 20, 36, .86);
  --rend-border: rgba(148, 163, 184, .16);
  --rend-text: #e8eef9;
  --rend-muted: #8da0bd;
  --rend-cyan: #38d9ff;
  --rend-violet: #8b5cf6;
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  overflow-x: hidden;
  padding: clamp(14px, 2.4vw, 34px);
  color: var(--rend-text);
  background:
    radial-gradient(circle at 84% 3%, rgba(56, 217, 255, .13), transparent 29rem),
    radial-gradient(circle at 22% 34%, rgba(139, 92, 246, .1), transparent 34rem),
    var(--rend-bg);
  font-family: Inter, Roboto, 'Segoe UI', sans-serif;
}

.rendimientos-container::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  opacity: .2;
  background-image:
    linear-gradient(rgba(82, 104, 138, .16) 1px, transparent 1px),
    linear-gradient(90deg, rgba(82, 104, 138, .16) 1px, transparent 1px);
  background-size: 42px 42px;
  -webkit-mask-image: linear-gradient(to bottom, #000, transparent 86%);
  mask-image: linear-gradient(to bottom, #000, transparent 86%);
}

.header-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  overflow: hidden;
  margin: 0 0 10px;
  padding: 11px 12px;
  border: 1px solid var(--rend-border);
  border-radius: 16px;
  background: linear-gradient(125deg, rgba(18, 30, 52, .96), rgba(8, 15, 29, .91));
  box-shadow: 0 24px 62px rgba(0, 0, 0, .34), inset 0 1px rgba(255, 255, 255, .07);
  backdrop-filter: blur(22px);
}

.header-container::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(110deg, transparent 38%, rgba(255, 255, 255, .045) 48%, transparent 58%);
  transform: translateX(-120%);
  animation: rend-panel-scan 9s ease-in-out infinite;
}

.rendimientos-title-block,
.header-actions {
  position: relative;
  z-index: 1;
}

.rendimientos-title-block {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.rendimientos-title-icon {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  place-items: center;
  color: #06101c;
  border-radius: 10px;
  background: linear-gradient(135deg, #b8f4ff, var(--rend-cyan) 55%, var(--rend-violet));
  box-shadow: 0 0 28px rgba(56, 217, 255, .3);
}

.rendimientos-eyebrow {
  display: block;
  margin-bottom: 2px;
  color: #71839f;
  font-size: .55rem;
  font-weight: 850;
  letter-spacing: .13em;
  text-transform: uppercase;
}

.rendimientos-title-block h2 {
  margin: 0;
  color: #f8fbff;
  font-size: clamp(1.08rem, 2vw, 1.42rem);
  font-weight: 820;
  letter-spacing: -.035em;
  line-height: 1.05;
}

.medidas-counter {
  padding: 5px 8px;
  color: #a8efff;
  border: 1px solid rgba(56, 217, 255, .2);
  border-radius: 999px;
  background: rgba(56, 217, 255, .07);
  font-size: .62rem;
  font-weight: 800;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 5px;
}

.header-actions .btn-volver,
.header-actions .btn-pesadas,
.header-actions .btn-nota,
.header-actions .btn-costos,
.header-actions .btn-preparacion,
.header-actions .btn-configuracion,
.header-actions .btn-pdf {
  min-height: 40px;
  margin: 0;
  padding: 9px 13px;
  gap: 8px;
  color: #dbe7f8;
  border: 1px solid rgba(148, 163, 184, .17);
  border-radius: 9px;
  background: rgba(20, 33, 55, .78);
  box-shadow: inset 0 1px rgba(255, 255, 255, .06);
  font-size: .84rem;
  font-weight: 800;
  line-height: 1;
  transition: transform .18s ease, border-color .18s ease, background .18s ease, box-shadow .18s ease;
}

.header-actions button i {
  margin: 0;
  font-size: 1rem;
}

.header-actions .btn-volver:hover,
.header-actions .btn-pesadas:hover,
.header-actions .btn-nota:hover,
.header-actions .btn-costos:hover,
.header-actions .btn-preparacion:hover,
.header-actions .btn-configuracion:hover,
.header-actions .btn-pdf:hover {
  transform: translateY(-2px);
  color: #fff;
  border-color: rgba(56, 217, 255, .48);
  background: rgba(28, 48, 78, .95);
  box-shadow: 0 8px 22px rgba(0, 0, 0, .2), 0 0 16px rgba(56, 217, 255, .07);
}

.header-actions .btn-volver i { color: #93c5fd; }
.header-actions .btn-pesadas i { color: #7dd3fc; }
.header-actions .btn-nota i { color: #fbbf24; }
.header-actions .btn-costos i { color: #4ade80; }
.header-actions .btn-preparacion i { color: #38d9ff; }
.header-actions .btn-configuracion i { color: #c4b5fd; }
.header-actions .btn-pdf i { color: #fb7185; }

.resumen-header-row {
  margin: 0 0 12px;
  padding: 5px;
  border: 1px solid rgba(148, 163, 184, .12);
  border-radius: 12px;
  background: rgba(3, 8, 18, .42);
  backdrop-filter: blur(14px);
}

.resumen-tabs { gap: 5px; }

.resumen-tab-button {
  min-height: 34px;
  padding: 7px 12px;
  color: #9aabc4;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  box-shadow: none;
  font-size: .76rem;
  font-weight: 750;
}

.resumen-tab-button:hover {
  color: #edf8ff;
  border-color: rgba(56, 217, 255, .18);
  background: rgba(56, 217, 255, .06);
}

.resumen-tab-button.activo {
  color: #06101c;
  border-color: rgba(184, 244, 255, .7);
  background: linear-gradient(135deg, #b8f4ff, var(--rend-cyan));
  box-shadow: 0 0 22px rgba(56, 217, 255, .2);
}

.rendimientos-grid {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 315px), 1fr));
  gap: 14px;
  margin-top: 12px;
}

.rendimiento-card {
  --card-accent: #38d9ff;
  position: relative;
  overflow: hidden;
  padding: 14px;
  color: #172033;
  border: 1px solid rgba(255, 255, 255, .92);
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(255, 255, 255, .99), rgba(235, 242, 250, .97));
  box-shadow: 0 16px 34px rgba(0, 6, 18, .22), inset 0 1px rgba(255, 255, 255, .92);
  transition: transform .24s cubic-bezier(.22, 1, .36, 1), box-shadow .24s ease, border-color .24s ease;
}

.rendimiento-card:nth-child(4n + 2) { --card-accent: #8b5cf6; }
.rendimiento-card:nth-child(4n + 3) { --card-accent: #10b981; }
.rendimiento-card:nth-child(4n + 4) { --card-accent: #f59e0b; }

.rendimiento-card.rendimiento-pendiente {
  --card-accent: #f43f5e;
  border-color: rgba(244, 63, 94, .72);
  box-shadow: 0 18px 38px rgba(0, 6, 18, .24), 0 0 0 2px rgba(244, 63, 94, .16), 0 0 28px rgba(244, 63, 94, .2);
}

.rendimiento-card::before {
  content: '';
  position: absolute;
  top: 0;
  right: 14px;
  left: 14px;
  height: 3px;
  border-radius: 0 0 5px 5px;
  background: var(--card-accent);
  box-shadow: 0 0 18px var(--card-accent);
}

.rendimiento-card:hover {
  transform: translateY(-4px);
  border-color: color-mix(in srgb, var(--card-accent) 40%, white);
  box-shadow: 0 24px 48px rgba(0, 6, 18, .28), 0 0 24px color-mix(in srgb, var(--card-accent) 11%, transparent);
}

.medida-header {
  align-items: flex-start;
  gap: 10px;
  margin: 0 0 11px;
  padding-bottom: 11px;
  border-bottom: 1px solid #dce4ef;
}

.medida-identidad {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  flex-direction: column;
  gap: 7px;
}

.datos-pendientes {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  color: #fff;
  border: 1px solid #fb7185;
  border-radius: 8px;
  background: linear-gradient(135deg, #e11d48, #be123c);
  box-shadow: 0 6px 14px rgba(190, 18, 60, .23), 0 0 14px rgba(244, 63, 94, .2);
  font-size: .66rem;
  font-weight: 900;
  letter-spacing: .055em;
  text-transform: uppercase;
  animation: alerta-cero-pulse 1.8s ease-in-out infinite;
}

.medida-label {
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  margin: 0;
  padding: 8px 11px;
  color: #ecfbff;
  border: 1px solid color-mix(in srgb, var(--card-accent) 65%, #fff);
  border-radius: 11px;
  background: linear-gradient(135deg, #0b5f78, #07364d);
  box-shadow: 0 8px 18px rgba(6, 78, 99, .22), 0 0 18px color-mix(in srgb, var(--card-accent) 22%, transparent);
  font-size: 1.08rem;
  font-weight: 900;
  line-height: 1.1;
}

.controles-medida {
  min-width: 172px;
  gap: 7px;
  padding: 9px;
  border: 1px solid #dae3ee;
  border-radius: 10px;
  background: rgba(235, 241, 248, .86);
}

.ocultar-control,
.analizar-ganancia-control,
.maquila-ganancia-control {
  color: #52627a;
  font-size: .82rem;
  font-weight: 800;
  line-height: 1.2;
}

.rendimiento-card input[type='checkbox'] {
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  margin: 0;
  accent-color: var(--card-accent);
  cursor: pointer;
}

.ocultar-control label,
.analizar-ganancia-control label,
.maquila-ganancia-control label {
  margin: 0;
  cursor: pointer;
}

.input-group,
.rendimiento-manual-group {
  margin: 10px 0;
  padding: 9px;
  border: 1px solid #dce4ef;
  border-radius: 11px;
  background: rgba(238, 243, 249, .82);
}

.input-group label,
.rendimiento-manual-group label,
.mix-input label {
  margin-bottom: 4px;
  color: #607087;
  font-size: .68rem;
  font-weight: 800;
  letter-spacing: .04em;
  text-transform: uppercase;
}

.rendimiento-card input:not([type='checkbox']),
.modal-content input,
.modal-content textarea {
  min-height: 38px;
  padding: 7px 9px;
  color: #172033;
  border: 1px solid #d3deeb;
  border-radius: 9px;
  outline: none;
  background: rgba(255, 255, 255, .94);
  box-shadow: inset 0 1px 2px rgba(15, 23, 42, .04);
  font-weight: 700;
  transition: border-color .18s ease, box-shadow .18s ease;
}

.rendimiento-card input:not([type='checkbox']):focus,
.modal-content input:focus,
.modal-content textarea:focus {
  border-color: #22b8dc;
  box-shadow: 0 0 0 3px rgba(34, 184, 220, .13), 0 5px 14px rgba(15, 23, 42, .07);
}

.mix-inputs { gap: 8px; }

.input-group.grupo-cero-alerta,
.rendimiento-manual-group.grupo-cero-alerta {
  border-color: rgba(244, 63, 94, .58);
  background: linear-gradient(135deg, rgba(255, 228, 230, .9), rgba(255, 241, 242, .82));
  box-shadow: 0 0 0 3px rgba(244, 63, 94, .08);
}

.rendimiento-card input.valor-cero-alerta:not([type='checkbox']) {
  color: #be123c;
  border: 2px solid #f43f5e;
  background: #fff1f2;
  box-shadow: 0 0 0 4px rgba(244, 63, 94, .11), inset 0 1px 2px rgba(190, 18, 60, .05);
  font-weight: 950;
}

.rendimiento-card input.valor-cero-alerta:not([type='checkbox']):focus {
  border-color: #e11d48;
  box-shadow: 0 0 0 4px rgba(225, 29, 72, .18), 0 7px 18px rgba(190, 18, 60, .12);
}

.resultados {
  margin-top: 10px;
}

.resultados > p {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin: 0 0 7px;
  padding: 8px 10px;
  color: #53647b;
  border: 1px solid #dce4ef;
  border-radius: 10px;
  background: rgba(241, 245, 249, .86);
  font-size: .76rem;
  font-weight: 750;
}

.resultados > p.total-embarcado {
  font-size: 1rem;
  font-weight: 850;
}

.resultados .rendimiento {
  margin: 0 0 8px;
  padding: 11px 12px;
  color: #dff9ff;
  border: 1px solid rgba(56, 217, 255, .45);
  border-radius: 12px;
  background: linear-gradient(135deg, #075d75, #062f45);
  box-shadow: 0 10px 22px rgba(6, 78, 99, .2), 0 0 19px rgba(56, 217, 255, .13), inset 0 1px rgba(255, 255, 255, .12);
}

.resultados > p.valor-resumen-alerta {
  color: #be123c;
  border-color: rgba(244, 63, 94, .42);
  background: #fff1f2;
  box-shadow: 0 0 0 3px rgba(244, 63, 94, .07);
}

.resultados .rendimiento.rendimiento-cero-alerta {
  color: #ffe4e6;
  border-color: #fb7185;
  background: linear-gradient(135deg, #be123c, #881337);
  box-shadow: 0 10px 24px rgba(136, 19, 55, .3), 0 0 22px rgba(244, 63, 94, .24), inset 0 1px rgba(255, 255, 255, .14);
}

.resultados .rendimiento.rendimiento-cero-alerta span {
  color: #fff;
  text-shadow: 0 0 16px rgba(255, 228, 230, .65);
}

.rendimiento span {
  color: #fff;
  font-size: 1.45rem;
  font-weight: 950;
  letter-spacing: -.035em;
  text-shadow: 0 0 17px rgba(56, 217, 255, .55);
}

.rendimiento .rendimiento-alto { color: #86efac; }

.ganancia-info,
.maquila-ganancia-info {
  margin-top: 9px;
  padding: 9px;
  border: 1px solid #dbe5ef;
  border-radius: 12px;
  background: rgba(247, 250, 252, .9);
}

.ganancia-header h4,
.maquila-ganancia-header h4 {
  margin: 0 0 7px;
  color: #26364b;
  font-size: .82rem;
  font-weight: 850;
}

.ganancia-detalles,
.maquila-ganancia-detalles { gap: 5px; }

.ganancia-item {
  min-height: 34px;
  padding: 6px 8px;
  border-color: #e4ebf2;
  border-radius: 8px;
  background: #fff;
}

.ganancia-item .label { color: #6b7b90; font-size: .7rem; }
.ganancia-item .valor { color: #243247; font-size: .82rem; }

.ganancia-total-item {
  border-color: rgba(16, 185, 129, .28);
  background: linear-gradient(90deg, rgba(16, 185, 129, .08), rgba(255, 255, 255, .94));
}

.ganancia-total-item .ganancia-total {
  font-size: 1.08rem;
  font-weight: 950;
}

.ganancia-positiva { color: #059669 !important; }
.ganancia-negativa { color: #e11d48 !important; }

.sin-precio-venta,
.sin-datos-crudo {
  border-color: rgba(245, 158, 11, .3);
  border-radius: 10px;
  background: rgba(254, 243, 199, .75);
}

.crudos-ganancias-section,
.resumen-dia-panel,
.medidas-hoy-panel {
  margin-top: 14px;
  padding: 14px;
  color: var(--rend-text);
  border: 1px solid var(--rend-border);
  border-radius: 18px;
  background: var(--rend-panel);
  box-shadow: 0 22px 54px rgba(0, 0, 0, .28), inset 0 1px rgba(255, 255, 255, .05);
  backdrop-filter: blur(20px);
}

.crudos-ganancias-section h2,
.medidas-hoy-title {
  margin: 0 0 12px;
  color: #f3f8ff;
  font-size: 1.22rem;
  font-weight: 850;
  letter-spacing: -.025em;
  text-align: left;
}

.crudos-ganancias-grid {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 315px), 1fr));
  gap: 12px;
}

.crudo-ganancia-card {
  padding: 14px;
  color: #172033;
  border: 1px solid rgba(255, 255, 255, .92);
  border-radius: 15px;
  background: linear-gradient(145deg, #fff, #edf3f9);
  box-shadow: 0 14px 28px rgba(0, 6, 18, .2);
}

.crudo-ganancia-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 20px 38px rgba(0, 6, 18, .26), 0 0 20px rgba(56, 217, 255, .07);
}

.crudo-ganancia-header {
  margin-bottom: 10px;
  padding-bottom: 9px;
  border-color: #dce4ef;
}

.crudo-ganancia-header h4 {
  padding: 6px 9px;
  color: #eafaff;
  border-radius: 9px;
  background: linear-gradient(135deg, #0b5f78, #07364d);
  font-size: .95rem;
}

.crudo-ganancia-detalles { gap: 7px; }

.detalles-clientes {
  padding: 10px;
  border-color: #dce4ef;
  border-radius: 10px;
  background: #eef3f8;
}

.detalle-cliente {
  border-color: #e1e8f0;
  border-radius: 8px;
}

/* Análisis de ganancia: fuente del costo y desglose de precio por cliente */
.costo-fuente-badge {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: .72rem;
  font-weight: 600;
  line-height: 1.5;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
  color: #36506b;
  background: #e6edf5;
}
.costo-fuente-manual { color: #7a4b00; background: #fff1d6; }
.costo-fuente-catalogo { color: #1d5c3a; background: #e1f4e8; }
.costo-fuente-embarque { color: #36506b; background: #e6edf5; }
.costo-fuente-ninguno { color: #9b1c1c; background: #fde2e2; }

.detalles-clientes-limpio { margin-top: 8px; }
.detalles-clientes-limpio .detalle-cliente {
  grid-template-columns: minmax(0, 1fr) auto auto auto auto;
  padding: 5px 8px;
  margin-bottom: 5px;
  font-size: .85rem;
}
.ganancia-info .detalles-clientes-limpio h5 { font-size: .85rem; margin-bottom: 6px; }
.detalles-clientes-limpio .detalle-cliente-total {
  margin-top: 2px;
  border-color: #b8c6d6;
  border-top-width: 2px;
  background: #eef3f8;
  font-weight: 700;
}
.detalles-clientes-limpio .detalle-cliente-refri { background: #f3f5f8; color: #7b8794; }
.detalles-clientes-limpio .detalle-cliente-refri .cliente-nombre,
.detalles-clientes-limpio .detalle-cliente-refri .cliente-precio { color: #7b8794; }
.detalles-clientes-limpio .cliente-no-cuenta { color: #7b8794; font-size: .8rem; font-weight: 600; font-style: italic; }
.detalles-clientes-limpio .detalle-cliente-total .cliente-kilos { color: #2c3e50; font-weight: 700; }
.detalles-clientes-limpio .detalle-cliente-total .fuente-precio { cursor: default; color: #6c7a89; font-weight: 700; }
.ganancia-info .detalles-clientes-limpio .leyenda-origen-precio {
  margin: 4px 0 0;
  font-size: .7rem;
  line-height: 1.4;
  color: #6c7a89;
}
.ayuda-editar-precio { font-weight: 400; color: #6c7a89; font-size: .75rem; }
.detalle-cliente-editable { cursor: pointer; transition: border-color .15s, box-shadow .15s; }
.detalle-cliente-editable:hover,
.detalle-cliente-editable:focus-visible {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, .18);
  outline: none;
}
.btn-cliente-sin-precio {
  margin: 4px 4px 0 0;
  padding: 3px 9px;
  border: 1px solid #f0b429;
  border-radius: 999px;
  background: #fff8e6;
  color: #7a4b00;
  font-size: .8rem;
  font-weight: 600;
  cursor: pointer;
}
/* Modal "Editar precio": mismo tema oscuro que los demás modales */
.modal-content.modal-editar-precio { max-width: 440px; width: calc(100% - 32px); text-align: left; }
.modal-content.modal-editar-precio h3 { margin: 0 0 4px; }
.modal-editar-precio .editar-precio-actual { margin: 0 0 12px; color: #9fb3cc; }
.modal-editar-precio .editar-precio-actual strong { color: #fff; }
.modal-editar-precio .editar-precio-label { display: block; margin: 12px 0 6px; font-weight: 700; color: #c8d8eb; }
.modal-content.modal-editar-precio .editar-precio-input {
  width: 100%;
  box-sizing: border-box;
  font-size: 1.25rem;
}
.modal-editar-precio .editar-precio-opciones { display: flex; flex-direction: column; gap: 8px; }
.modal-editar-precio .editar-precio-opcion {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 12px;
  border: 1px solid rgba(148, 163, 184, .24);
  border-radius: 12px;
  background: rgba(255, 255, 255, .04);
  cursor: pointer;
}
.modal-editar-precio .editar-precio-opcion span { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.modal-editar-precio .editar-precio-opcion strong { color: #f3f8ff; }
.modal-editar-precio .editar-precio-opcion small { color: #9fb3cc; line-height: 1.35; }
.modal-editar-precio .editar-precio-opcion.activa { border-color: #38bdf8; background: rgba(56, 189, 248, .12); }
.modal-editar-precio .editar-precio-opcion.deshabilitada { opacity: .5; cursor: not-allowed; }
.modal-editar-precio button.opcion-proveedor {
  width: 100%;
  min-height: 0;
  text-align: left;
  font: inherit;
  color: inherit;
}
.modal-editar-precio button.opcion-proveedor:disabled { opacity: .6; cursor: wait; }
.modal-content.modal-editar-precio input[type='radio'],
.modal-content.modal-editar-precio input[type='checkbox'] {
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  min-height: 0;
  margin: 2px 0 0;
  padding: 0;
  border: 0;
  box-shadow: none;
  background: none;
  accent-color: #38bdf8;
}
.modal-editar-precio .editar-precio-quitar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 2px 0 0 4px;
  font-size: .9rem;
  color: #fcd34d;
  cursor: pointer;
}
.modal-editar-precio .editar-precio-nota { margin: 12px 0 0; font-size: .78rem; color: #8da0bd; }
.modal-editar-precio .editar-precio-error { margin: 8px 0 0; color: #fca5a5; font-weight: 700; }
button.costo-fuente-btn {
  border: 1px solid transparent;
  cursor: pointer;
  font-family: inherit;
}
button.costo-fuente-btn:hover,
button.costo-fuente-btn:focus-visible { border-color: currentColor; outline: none; }
.recordar-costo {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin: 12px 0 0;
  padding: 10px 12px;
  border: 1px solid rgba(56, 189, 248, .35);
  border-radius: 12px;
  background: rgba(56, 189, 248, .08);
  cursor: pointer;
}
.recordar-costo span { display: flex; flex-direction: column; gap: 3px; }
.recordar-costo strong { color: #f3f8ff; }
.recordar-costo small { color: #9fb3cc; line-height: 1.35; }
.recordar-costo.deshabilitada { opacity: .6; cursor: not-allowed; }
.modal-content .recordar-costo input[type='checkbox'] {
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  min-height: 0;
  margin: 2px 0 0;
  padding: 0;
  border: 0;
  box-shadow: none;
  background: none;
  accent-color: #38bdf8;
}
.editar-costo-nota-base { margin-top: 0; }

.rendimiento-ganancia-ref {
  margin: 6px 0 0;
  padding: 8px 12px;
  border: 1px dashed #38bdf8;
  border-radius: 10px;
  background: #eff8ff;
  color: #1e4e79;
  font-size: .9rem;
}
.rendimiento-ganancia-ref strong { font-size: 1.05rem; }
.rendimiento-ganancia-ref small { display: block; color: #5b7088; }

.toggle-costo-extra {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  padding: 3px 9px;
  border: 1px solid #d8e0ea;
  border-radius: 999px;
  color: #6c7a89;
  font-size: .8rem;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
}
.toggle-costo-extra.activo { color: #b45309; border-color: #f59e0b; background: #fff7e6; }
.rendimiento-card .toggle-costo-extra input[type='checkbox'] {
  width: 16px;
  height: 16px;
  min-height: 0;
  margin: 0;
  padding: 0;
  accent-color: #f59e0b;
}

.aviso-precio-guardado {
  position: fixed;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  z-index: 2000;
  max-width: calc(100% - 32px);
  padding: 10px 16px;
  border-radius: 10px;
  background: #14532d;
  color: #fff;
  font-weight: 600;
  box-shadow: 0 6px 20px rgba(0, 0, 0, .25);
  cursor: pointer;
}

.aviso-kilos-sin-precio {
  margin: 8px 0 0;
  font-size: .82rem;
}

.resumen-dia-total {
  display: inline-flex;
  margin: 0 7px 10px 0;
  padding: 8px 11px;
  color: #e5f9ff;
  border: 1px solid rgba(56, 217, 255, .25);
  border-radius: 10px;
  background: rgba(56, 217, 255, .08);
  font-size: .8rem;
}

.resumen-dia-panel h4 { color: #c8d8eb; }

.resumen-dia-table {
  overflow: hidden;
  color: #dbe7f8;
  border-radius: 10px;
  background: rgba(4, 11, 23, .5);
}

.resumen-dia-table th,
.resumen-dia-table td {
  border-color: rgba(148, 163, 184, .14);
}

.resumen-dia-table th {
  color: #a8efff;
  background: rgba(56, 217, 255, .08);
}

.resumen-dia-estado,
.medidas-hoy-fecha { color: #9fb0c8; }
.resumen-dia-estado.error { color: #fda4af; }

.medidas-hoy-panel ::v-deep .medidas-hoy-grid { gap: 12px; }

.medidas-hoy-panel ::v-deep .medidas-hoy-card {
  border-color: rgba(255, 255, 255, .88);
  border-radius: 14px;
  background: linear-gradient(145deg, #fff, #edf3f9);
  box-shadow: 0 14px 28px rgba(0, 6, 18, .2);
}

.medidas-hoy-panel ::v-deep .medidas-hoy-card--ozuna {
  border-color: rgba(16, 185, 129, .48);
  background: linear-gradient(145deg, #f3fff9, #dff7eb);
}

.medidas-hoy-panel ::v-deep .medidas-hoy-totales-valor,
.medidas-hoy-panel ::v-deep .medidas-hoy-limpios {
  color: #075d75;
  font-weight: 900;
}

.modal-overlay {
  z-index: 10000;
  padding: 16px;
  background: rgba(2, 6, 15, .76);
  backdrop-filter: blur(10px);
}

.modal-content {
  padding: 18px;
  color: #e8eef9;
  border: 1px solid rgba(148, 163, 184, .2);
  border-radius: 16px;
  background: linear-gradient(145deg, rgba(19, 32, 54, .98), rgba(8, 16, 30, .98));
  box-shadow: 0 30px 80px rgba(0, 0, 0, .52), inset 0 1px rgba(255, 255, 255, .07);
}

.modal-content h3,
.config-item label { color: #f3f8ff; }
.config-help { color: #8da0bd; }

.modal-content textarea,
.modal-content input {
  color: #e8eef9;
  border-color: rgba(148, 163, 184, .24);
  background: rgba(3, 8, 18, .55);
}

.btn-guardar,
.btn-cancelar {
  min-height: 36px;
  padding: 7px 13px;
  border: 1px solid transparent;
  border-radius: 9px;
  font-weight: 800;
}

.btn-guardar {
  color: #d1fae5;
  border-color: rgba(74, 222, 128, .28);
  background: rgba(16, 185, 129, .16);
}

.btn-cancelar {
  color: #fecdd3;
  border-color: rgba(251, 113, 133, .25);
  background: rgba(244, 63, 94, .12);
}

@keyframes rend-panel-scan {
  0%, 58% { transform: translateX(-120%); }
  82%, 100% { transform: translateX(120%); }
}

@keyframes alerta-cero-pulse {
  50% { box-shadow: 0 7px 16px rgba(190, 18, 60, .3), 0 0 22px rgba(244, 63, 94, .34); }
}

@media (max-width: 900px) {
  .header-container { align-items: stretch; }
  .rendimientos-title-block { width: 100%; }
  .header-actions { width: 100%; justify-content: flex-start; }
  .header-actions button { flex: 1 1 105px; justify-content: center; }
  .header-actions .btn-pesadas { flex-basis: 148px; white-space: nowrap; }
}

@media (max-width: 768px) {
  .rendimientos-container { padding: 12px 12px 88px; }
  .header-container { padding: 10px; }
  .medidas-counter { margin-left: auto; }
  .resumen-tabs { flex-direction: row; gap: 5px; }
  .resumen-tab-button {
    width: auto;
    min-height: 36px;
    padding: 8px 9px;
    border-radius: 9px;
    font-size: .72rem;
  }
  .medida-header { flex-direction: column; }
  .controles-medida { width: 100%; min-width: 0; }
  .mix-inputs { grid-template-columns: 1fr; }
  .crudos-ganancias-section,
  .resumen-dia-panel,
  .medidas-hoy-panel { padding: 11px; border-radius: 15px; }
}

@media (prefers-reduced-motion: reduce) {
  .rendimientos-container,
  .rendimientos-container * {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
</style>
