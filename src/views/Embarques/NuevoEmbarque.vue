<template>
  <div class="nuevo-embarque-container">

     <Sidebar
          :embarque="embarque"
          :clientesPredefinidos="clientesPredefinidos"
          :clientesPersonalizadosEmbarque="clientesPersonalizadosEmbarque"
          :clienteCrudos="clienteCrudos"
          :clienteActivo="clienteActivo"
          @seleccionar-cliente="clienteActivo = $event"
          @toggle-sidebar="sidebarCollapsed = $event"
          @mostrar-modal-nuevo-cliente="mostrarModalNuevoCliente = true"
        />


        <div class="nuevo-embarque">
      <h1>{{ modoEdicion ? 'Embarque' : 'Nuevo Embarque' }}</h1>
      <div class="botones">
        <button @click="volverAEmbarquesMenu" class="btn-volver">
          <i class="fas fa-arrow-left"></i> Volver a Menu
        </button>
        <button 
          @click="toggleBloqueo" 
          :class="['btn-bloqueo', { 'bloqueado': embarqueBloqueado }]"
        >
          <i :class="['fas', embarqueBloqueado ? 'fa-lock' : 'fa-lock-open']"></i>
          {{ embarqueBloqueado ? 'Desbloquear' : 'Bloquear' }} Embarque
        </button>
      </div>
      
      <div class="header">
        <div class="header-row">
          <div class="fecha-selector">
            <label for="fecha">Fecha de Embarque:</label>
            <input type="date" id="fecha" v-model="embarque.fecha" class="form-control" required :disabled="embarqueBloqueado">
          </div>
          <div class="carga-selector">
            <label for="cargaCon">Carga con:</label>
            <select id="cargaCon" v-model="embarque.cargaCon" class="form-control" required :disabled="embarqueBloqueado">
              <option value="">Seleccionar</option>
              <option value="Porro">Porro</option>
              <option value="Caminante">Caminante</option>
            </select>
          </div>
        </div>
      </div>
      
      <div class="botones-accion">
        <button @click="generarResumenTarasPDF" class="btn btn-info" :disabled="isGeneratingPdf">
          <span v-if="isGeneratingPdf && pdfType === 'taras'" class="loader-inline"></span>
          <i v-else class="fas fa-file-pdf"></i> PDF Taras
        </button>
        <button @click="generarResumenEmbarque2" class="btn btn-info" :disabled="isGeneratingPdf">
          <span v-if="isGeneratingPdf && pdfType === 'resumen'" class="loader-inline"></span>
          <i v-else class="fas fa-file-pdf"></i> Resumen Embarque
        </button>
        <router-link :to="{ name: 'Rendimientos', params: { id: embarqueId } }" class="btn btn-warning" :class="{ 'disabled': isGeneratingPdf }">
          <i class="fas fa-chart-line"></i> Rendimientos
        </router-link>
      </div>
      
  
      
      <div class="botones-undo-redo">
        <button type="button" @click="undo" :disabled="undoStack.length <= 1" class="btn btn-secondary btn-sm">Deshacer</button>
        <button type="button" @click="redo" :disabled="redoStack.length === 0" class="btn btn-secondary btn-sm">Rehacer</button>
      </div>
      
      <form @submit.prevent="guardarEmbarque" @keydown.enter.prevent>
        <div v-for="(clienteProductos, clienteId) in productosPorCliente" 
             :key="clienteId" 
             class="cliente-grupo"
             v-show="clienteActivo === clienteId || clienteActivo === null">
          <div class="cliente-header sticky-header" :data-cliente="obtenerNombreCliente(clienteId)" :style="{  }">
            <div class="cliente-info">
              <h3>
                {{ obtenerNombreCliente(clienteId) }}
                <button type="button" @click.stop="generarNotaVenta(clienteId)" class="btn-pdf-mini" title="Vista previa PDF">
                  <i class="fas fa-eye"></i>
                </button>
              </h3>
              <div class="cliente-totales">
                <span>Limpio: {{ calcularTotalLimpioCliente(clienteId) }}T / {{ formatearKilos(calcularKilosLimpioCliente(clienteId)) }}Kg</span>
                <span>Crudo: {{ calcularTotalCrudoCliente(clienteId) }}T / {{ formatearKilos(calcularKilosCrudoCliente(clienteId)) }}Kg</span>
              </div>
            </div>
            <div class="cliente-header-controls">
              <div class="juntar-medidas-checkbox">
                <input 
                  type="checkbox" 
                  :id="'juntar-medidas-' + clienteId"
                  v-model="clientesJuntarMedidas[clienteId]"
                  @change="handleJuntarMedidasChange(clienteId, $event.target.checked)"
                  @click.stop
                  :disabled="embarqueBloqueado"
                >
                <label :for="'juntar-medidas-' + clienteId" @click.stop>Juntar medidas</label>
              </div>
              <button 
                type="button" 
                @click.stop="generarNotaVenta(clienteId)" 
                class="btn btn-primary btn-sm generar-pdf-cliente" 
                title="Generar Nota de Venta PDF"
                :disabled="isGeneratingPdf"
              >
                <span v-if="isGeneratingPdf && pdfType === 'cliente-' + clienteId" class="loader-inline"></span>
                <i v-else class="fas fa-file-pdf"></i> Generar Nota PDF
              </button>
              <!-- Agregar botón para crear cuenta de Joselito -->
              <button 
                v-if="esClienteJoselito(clienteId)"
                type="button" 
                @click.stop="crearCuentaJoselito(obtenerEmbarqueCliente(clienteId), productosPorCliente[clienteId], clienteCrudos[clienteId] || [])" 
                class="btn btn-success btn-sm crear-cuenta-joselito" 
                title="Crear Cuenta para Joselito"
                :disabled="isCreatingAccount"
              >
                <span v-if="isCreatingAccount" class="loader-inline"></span>
                <i v-else class="fas fa-plus-circle"></i> Crear Cuenta
              </button>
              <!-- Agregar botón para crear cuenta de Catarro -->
              <button 
                v-if="esClienteCatarro(clienteId)"
                type="button" 
                @click.stop="crearCuentaCatarro(obtenerEmbarqueCliente(clienteId), productosPorCliente[clienteId], clienteCrudos[clienteId] || [])" 
                class="btn btn-success btn-sm crear-cuenta-catarro" 
                title="Crear Cuenta para Catarro"
                :disabled="isCreatingAccount"
              >
                <span v-if="isCreatingAccount" class="loader-inline"></span>
                <i v-else class="fas fa-plus-circle"></i> Crear Cuenta
              </button>
              <button type="button" @click.stop="eliminarCliente(clienteId)" class="btn btn-danger btn-sm eliminar-cliente" :disabled="embarqueBloqueado">Eliminar Cliente</button>
            </div>
          </div>
          <div class="productos-container">
            <div v-for="(producto, index) in clienteProductos" :key="index" class="producto" 
              :data-es-venta="producto.esVenta"
              :class="{
                'reporte-completo': coincideTarasYBolsas(producto),
                'reporte-incompleto': !coincideTarasYBolsas(producto) && tieneAlgunReporte(producto)
              }"
            >
              <!-- Encabezado de la medida y selección -->
              <h2 class="encabezado-medida">
                <div class="botones-encabezado">
                  <div class="botones-fila-superior">
                    <button 
                      @click="abrirModalPrecio(producto)" 
                      class="btn-precio"
                      :class="{ 'tiene-precio': producto.precio }"
                    >
                      $
                    </button>
                    <button 
                      @click="abrirModalHilos(producto)" 
                      class="btn-hilos"
                      :class="{ 'tiene-hilos': producto.hilos }"
                    >
                      H
                    </button>
                  </div>
                  <div class="botones-fila-inferior">
                    <button 
                      @click="abrirModalNota(producto)" 
                      class="btn-nota"
                      :class="{ 'tiene-nota': producto.nota }"
                    >
                      N
                    </button>
                    <div class="kg-radio">
                      <input 
                        type="checkbox"
                        v-model="producto.noSumarKilos"
                        class="kg-checkbox"
                        :id="'kg-' + producto.id"
                        :disabled="embarqueBloqueado"
                      >
                      <label :for="'kg-' + producto.id">kg</label>
                    </div>
                  </div>
                </div>
                <span 
                  class="medida-texto" 
                  @click="embarqueBloqueado ? null : abrirModalNombreAlternativo(producto)"
                  :class="{ 
                    'disabled': embarqueBloqueado,
                    'tiene-nombre-alternativo': producto.nombreAlternativoPDF
                  }"
                >
                  <template v-if="producto.tipo === 'c/h20'">
                    {{ producto.nombreAlternativoPDF || producto.medida || 'Sin Medida' }}
                    <span class="ch20-text">c/h20</span>
                    <span v-if="producto.nombreAlternativoPDF" class="pdf-badge" title="Nombre personalizado para PDF">PDF</span>
                  </template>
                  <template v-else>
                    {{ producto.nombreAlternativoPDF || producto.medida || 'Sin Medida' }}
                    - {{ obtenerTipoProducto(producto) }}
                    <span v-if="producto.nombreAlternativoPDF" class="pdf-badge" title="Nombre personalizado para PDF">PDF</span>
                  </template>
                </span>
                <span v-if="producto.precio" class="precio-tag">${{ producto.precio }}</span>
              </h2>
              <div class="producto-header">
                <div class="medida-input-container">
                  <input
                    type="text"
                    v-model="producto.medida"
                    class="medida-input"
                    placeholder="Medida"
                    @input="onMedidaInput(producto, $event)"
                    @blur="onMedidaBlur(producto)"
                    :disabled="embarqueBloqueado"
                  >
                  <button 
                    @click="abrirModalAlt(producto)" 
                    class="btn-alt"
                    :class="{ 'tiene-alt': producto.textoAlternativo }"
                    :disabled="embarqueBloqueado"
                  >
                    Alt
                  </button>
                  <!-- Modificar la condición para mostrar sugerencias -->
                  <div 
                    v-if="productoEditandoId === producto.id && sugerenciasMedidas.length > 0" 
                    class="sugerencias-container"
                  >
                    <div
                      v-for="medida in sugerenciasMedidas"
                      :key="medida"
                      class="sugerencia-item"
                      @mousedown="seleccionarMedida(producto, medida)"
                    >
                      {{ medida }}
                    </div>
                  </div>
                </div>
                <select 
                  v-model="producto.tipo" 
                  class="form-control tipo-select" 
                  @change="onTipoChange(producto)"
                  :class="{
                    'tipo-azul': producto.tipo === 'c/h20',
                    'tipo-verde': producto.tipo === 's/h20'
                  }"
                  :disabled="embarqueBloqueado"
                >
                  <option value="">Seleccionar</option>
                  <option value="s/h20">S/H20</option>
                  <option value="c/h20">C/H20</option>
                  <option value="otro">Otro</option>
                </select>

                <!-- Checkbox de venta movido aquí, después del tipo -->
                <div v-if="obtenerNombreCliente(producto.clienteId) === 'Ozuna'" class="venta-checkbox-container">
                  <input 
                    type="checkbox" 
                    v-model="producto.esVenta" 
                    class="form-check-input venta-checkbox" 
                    :id="'ventaCheck-' + producto.id"
                    :disabled="embarqueBloqueado"
                  >
                  <label :for="'ventaCheck-' + producto.id">Venta</label>
                </div>
                
                <div v-if="producto.tipo === 'c/h20'" class="valores-container">
                  <div class="valor-neto-container">
                    <label>Valor neto:</label>
                    <input
                      type="number"
                      v-model="producto.camaronNeto"
                      class="camaron-neto-input ios-numeric"
                      step="0.01"
                      min="0"
                      max="1"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      :disabled="embarqueBloqueado"
                    >
                  </div>

                </div>
                <input
                  v-if="producto.tipo === 'otro'"
                  type="text" 
                  v-model="producto.tipoPersonalizado" 
                  class="form-control tipo-input" 
                  placeholder="Especificar"
                  :disabled="embarqueBloqueado"
                >
                <button type="button" @click="eliminarProducto(producto)" class="btn btn-danger btn-sm eliminar-producto" :disabled="embarqueBloqueado">X</button>
              </div>
              <div class="sumas-verticales">
                <div class="columna">
                  <div class="taras-header">
                    <h5>Taras</h5>
                    <div class="checkbox-container">
                      <input 
                        type="checkbox" 
                        v-model="producto.restarTaras"
                        :disabled="embarqueBloqueado"
                      >
                      <label>-3</label>
                    </div>
                  </div>
                  <div v-for="(tara, taraIndex) in producto.taras" :key="taraIndex" class="input-group">
                    <input 
                      v-model.number="producto.taras[taraIndex]" 
                      type="tel"
                      class="form-control tara-input" 
                      placeholder="Tara"
                      :size="String(producto.taras[taraIndex] || '').length || 1"
                      @focus="$event.target.select()"
                      :disabled="embarqueBloqueado"
                    >
                    <button type="button" @click="eliminarTara(producto, taraIndex)" class="btn btn-danger btn-sm" :disabled="embarqueBloqueado">-</button>
                  </div>
                  <div v-for="(taraExtra, taraExtraIndex) in producto.tarasExtra" :key="'extra-' + taraExtraIndex" class="input-group">
                    <input 
                      v-model.number="producto.tarasExtra[taraExtraIndex]" 
                      type="tel"
                      class="form-control tara-input" 
                      placeholder="Tara Extra"
                      :size="String(producto.tarasExtra[taraExtraIndex] || '').length || 1"
                      @focus="$event.target.select()"
                      :disabled="embarqueBloqueado"
                    >
                    <button type="button" @click="eliminarTaraExtra(producto, taraExtraIndex)" class="btn btn-danger btn-sm" :disabled="embarqueBloqueado">-</button>
                  </div>
                  <div class="botones-tara">
                    <button type="button" @click="agregarTara(producto)" class="btn btn-success btn-sm agregar-tara" :disabled="embarqueBloqueado">+</button>
                    <button type="button" @click="agregarTaraExtra(producto)" class="btn btn-warning btn-sm agregar-tara-extra" :disabled="embarqueBloqueado">+ Extra</button>
                  </div>
                  <div class="total">Total: {{ totalTaras(producto) }}</div>
                </div>
                <div class="columna">
                  <h5>Kilos</h5>
                  <div v-for="(kilo, kiloIndex) in producto.kilos" :key="kiloIndex" class="input-group">
                    <input 
                      v-model.number="producto.kilos[kiloIndex]" 
                      type="tel"
                      class="form-control kilo-input" 
                      placeholder="Kilos"
                      :size="String(producto.kilos[kiloIndex] || '').length || 1"
                      @focus="$event.target.select()"
                      :disabled="embarqueBloqueado"
                    >
                  </div>
                  <div style="height: 38px"></div>
                  <div class="total">Total: {{ totalKilos(producto) }}</div>
                </div>
              </div>
              <div class="reporte-taras-bolsas">
                <div class="reporte-item">
                  <h5>Taras</h5>
                  <div v-for="(tara, index) in producto.reporteTaras" :key="index" class="input-group mb-2">
                    <input 
                      type="tel"
                      v-model="producto.reporteTaras[index]" 
                      class="form-control reporte-input"
                      @focus="$event.target.select()"
                      :disabled="embarqueBloqueado"
                    >
                    <button type="button" @click="eliminarReporteTara(producto, index)" class="btn btn-danger btn-sm" :disabled="embarqueBloqueado">-</button>
                  </div>
                  <button type="button" @click="agregarReporteTara(producto)" class="btn btn-success btn-sm" :disabled="embarqueBloqueado">+</button>
                  <div class="total-taras-reporte" :class="{ 'coincide': coincideTaras(producto), 'no-coincide': !coincideTaras(producto) }">
                     Reportadas: {{ totalTarasReportadas(producto) }}
                  </div>
                </div>
                <div class="reporte-item">
                  <h5>Bolsas</h5>
                  <div v-for="(bolsa, index) in producto.reporteBolsas" :key="index" class="input-group mb-2">
                    <input 
                      type="tel"
                      v-model="producto.reporteBolsas[index]" 
                      class="form-control reporte-input"
                      @focus="$event.target.select()"
                      :disabled="embarqueBloqueado"
                    >
                  </div>
                  <div style="height: 38px"></div>
                  <div class="total-bolsas-reporte">
                    Bolsas: {{ totalBolsasReportadas(producto) }}
                  </div>
                </div>
              </div>
              <div v-if="reporteExcedeTresParentesis(producto)" class="reporte-extenso">
                {{ generarReporteExtenso(producto) }}
              </div>
            </div>
            <div v-for="(crudo, index) in clienteCrudos[clienteId] || []" :key="'crudo-'+index" class="producto crudo">
              <h2 class="crudo-header">Crudos</h2>
              
              <div class="crudo-items">
                <div v-for="(item, itemIndex) in crudo.items || []" :key="'item-'+itemIndex" class="crudo-item">
                  <div class="crudo-talla-container">
                    <button 
                      @click="abrirModalPrecio(item)" 
                      class="btn-precio"
                      :class="{ 'tiene-precio': item.precio }"
                      :disabled="embarqueBloqueado"
                    >
                      $
                    </button>
                    <select 
                      v-model="item.talla" 
                      class="form-control talla-select"
                      @change="onTallaCrudoChange(item)"
                      :disabled="embarqueBloqueado"
                    >
                      <option value="">Elige talla</option>
                      <option value="Med c/c">Med c/c</option>
                      <option value="Med-Esp c/c">Med-Esp c/c</option>
                      <option value="Med-gde c/c">Med-gde c/c</option>
                      <option value="Gde c/c">Gde c/c</option>
                      <option value="Gde c/ Extra">Gde c/ Extra c/c</option>
                      <option value="Extra c/c">Extra c/c</option>
                      <option value="Jumbo c/c">Jumbo c/c</option>
                      <option value="Linea">Linea</option>
                      <option value="Lag gde c/c">Lag gde c/c</option>
                      <option value="Rechazo">Rechazo</option>
                    </select>
                    <span v-if="item.precio" class="precio-tag">${{ item.precio }}</span>
                    
                    <input 
                      type="text" 
                      v-model="item.barco" 
                      class="form-control barco-input" 
                      placeholder="Barco"
                      :disabled="embarqueBloqueado"
                    >
                  </div>
                  
                  <div class="crudo-taras-container">
                    <div class="taras-wrapper">
                      <input 
                        type="text" 
                        v-model="item.taras" 
                        class="form-control taras-input" 
                        placeholder="Taras"
                        @input="actualizarTotalCrudos(clienteId, index)"
                        :disabled="embarqueBloqueado"
                      >
                      <input 
                        v-if="item.mostrarSobrante"
                        type="text" 
                        v-model="item.sobrante" 
                        class="form-control taras-input" 
                        placeholder="Sbrte"
                        @input="actualizarTotalCrudos(clienteId, index)"
                        :disabled="embarqueBloqueado"
                      >
                    </div>
                    <div class="buttons-wrapper">
                      <button type="button" @click="eliminarCrudoItem(clienteId, index, itemIndex)" class="btn btn-danger btn-sm eliminar-crudo-item" :disabled="embarqueBloqueado">-</button>
                      <button type="button" @click="toggleSobrante(clienteId, index, itemIndex)" class="btn btn-success btn-sm agregar-sobrante" :disabled="embarqueBloqueado">+</button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="crudo-footer">
                <button type="button" @click="agregarCrudoItem(clienteId, index)" class="btn btn-primary btn-sm agregar-crudo-item" :disabled="embarqueBloqueado">+ Agregar Talla/Taras</button>
                <button type="button" @click="eliminarCrudo(clienteId, index)" class="btn btn-danger btn-sm eliminar-crudo" :disabled="embarqueBloqueado">Eliminar Crudo</button>
                <div class="total-crudos">Total de taras: {{ calcularTotalCrudos(crudo) }}</div>
              </div>
            </div>
          </div>
          <div class="botones-agregar">
            <button type="button" @click="agregarProducto(clienteId)" class="btn btn-primary btn-sm agregar-producto" :disabled="embarqueBloqueado">Agregar Producto</button>
            <button type="button" @click="agregarCrudo(clienteId)" class="btn btn-info btn-sm agregar-crudo" :disabled="embarqueBloqueado">Agregar Crudos</button>
          </div>
        </div>
      </form> <!-- Cerrando el form que se abrió para guardarEmbarque -->
    </div> <!-- Cerrando nuevo-embarque-container -->

    <!-- Modal para agregar nuevo cliente -->
    <div class="modal-overlay" v-if="mostrarModalNuevoCliente" @click.self="cerrarModalNuevoCliente">
      <div class="modal-contenido">
        <div class="modal-header">
          <h3>Agregar Nuevo Cliente</h3>
          <button @click="cerrarModalNuevoCliente" class="btn-cerrar-modal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="nombreCliente">Nombre del Cliente:</label>
            <input 
              type="text" 
              id="nombreCliente" 
              v-model="nuevoClienteNombre" 
              class="form-control" 
              placeholder="Ingrese el nombre del cliente"
              @keyup.enter="agregarNuevoCliente"
            >
          </div>

        </div>
        <div class="modal-footer">
          <button @click="cerrarModalNuevoCliente" class="btn btn-secondary">Cancelar</button>
          <button @click="agregarNuevoCliente" class="btn btn-primary">Agregar</button>
        </div>
      </div>
    </div>
    
    <!-- Modal para cambiar nombre alternativo para PDF -->
    <div class="modal-overlay" v-if="mostrarModalNombreAlternativo" @click.self="cerrarModalNombreAlternativo">
      <div class="modal-contenido">
        <div class="modal-header">
          <h3>Nombre para PDF</h3>
          <button @click="cerrarModalNombreAlternativo" class="btn-cerrar-modal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="nombreAlternativoPDF">Nombre que aparecerá en el PDF:</label>
            <input 
              type="text" 
              id="nombreAlternativoPDF" 
              v-model="nombreAlternativoTemp" 
              class="form-control" 
              placeholder="Ingrese el nombre para el PDF"
              @keyup.enter="guardarNombreAlternativo"
              ref="nombreAlternativoInput"
            >
            <small class="form-text text-muted">
              Este nombre solo se mostrará en el PDF generado. El nombre original se mantendrá en la aplicación.
            </small>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="cerrarModalNombreAlternativo" class="btn btn-secondary">Cancelar</button>
          <button @click="guardarNombreAlternativo" class="btn btn-primary">Guardar</button>
        </div>
      </div>
    </div>

    <!-- Modal para precio -->
    <div class="modal-overlay" v-if="mostrarModalPrecio" @click.self="cerrarModalPrecio">
      <div class="modal-contenido">
        <div class="modal-header">
          <h3>Establecer Precio</h3>
          <button @click="cerrarModalPrecio" class="btn-cerrar-modal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="precioInput">Precio:</label>
            <input 
              type="number" 
              id="precioInput" 
              v-model="precioTemp" 
              class="form-control" 
              placeholder="Ingrese el precio"
              @keyup.enter="guardarPrecio"
              ref="precioInput"
            >
          </div>
        </div>
        <div class="modal-footer">
          <button @click="cerrarModalPrecio" class="btn btn-secondary">Cancelar</button>
          <button @click="guardarPrecio" class="btn btn-primary">Guardar</button>
        </div>
      </div>
    </div>

    <!-- Modal para hilos -->
    <div class="modal-overlay" v-if="mostrarModalHilos" @click.self="cerrarModalHilos">
      <div class="modal-contenido">
        <div class="modal-header">
          <h3>Establecer Hilos</h3>
          <button @click="cerrarModalHilos" class="btn-cerrar-modal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="hilosInput">Hilos:</label>
            <input 
              type="text" 
              id="hilosInput" 
              v-model="hilosTemp" 
              class="form-control" 
              placeholder="Ingrese los hilos"
              @keyup.enter="guardarHilos"
              ref="hilosInput"
            >
          </div>
        </div>
        <div class="modal-footer">
          <button @click="cerrarModalHilos" class="btn btn-secondary">Cancelar</button>
          <button @click="guardarHilos" class="btn btn-primary">Guardar</button>
        </div>
      </div>
    </div>

    <!-- Modal para notas -->
    <div class="modal-overlay" v-if="mostrarModalNota" @click.self="cerrarModalNota">
      <div class="modal-contenido">
        <div class="modal-header">
          <h3>Establecer Nota</h3>
          <button @click="cerrarModalNota" class="btn-cerrar-modal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="notaInput">Nota:</label>
            <textarea 
              id="notaInput" 
              v-model="notaTemp" 
              class="form-control" 
              placeholder="Ingrese la nota"
              @keyup.enter="guardarNota"
              ref="notaInput"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="cerrarModalNota" class="btn btn-secondary">Cancelar</button>
          <button @click="guardarNota" class="btn btn-primary">Guardar</button>
        </div>
      </div>
    </div>

    <!-- Modal para Alt (nombre alternativo para PDF) -->
    <div class="modal-overlay" v-if="mostrarModalAlt" @click.self="cerrarModalAlt">
      <div class="modal-contenido">
        <div class="modal-header">
          <h3>Nombre Alternativo para PDF</h3>
          <button @click="cerrarModalAlt" class="btn-cerrar-modal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="altInput">Nombre alternativo:</label>
            <input 
              type="text" 
              id="altInput" 
              v-model="altTemp" 
              class="form-control" 
              placeholder="Ingrese el nombre alternativo para PDF"
              @keyup.enter="guardarAlt"
              ref="altInput"
            >
            <small class="form-text text-muted">
              Este nombre solo se mostrará en el PDF de resumen de embarque.
            </small>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="cerrarModalAlt" class="btn btn-secondary">Cancelar</button>
          <button @click="guardarAlt" class="btn btn-primary">Guardar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getFirestore, collection, addDoc, doc, getDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { debounce } from 'lodash';
import { ref, onValue, onDisconnect, set } from 'firebase/database'
import { rtdb } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { ref as vueRef, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import Sidebar from '@/components/Sidebar.vue'

// Lazy loaded components
const Rendimientos = defineAsyncComponent(() => import('./Rendimientos.vue'))

// Import PDF generators directly
import { generarNotaVentaPDF } from '@/utils/pdfGenerator';
import { generarResumenTarasPDF } from '@/utils/resumenTarasPdf';
import { generarResumenEmbarquePDF } from '@/utils/resumenEmbarque2';

// Lazy load PDF libraries when needed
const loadPdfLibs = async () => {
  try {
    const jsPDFModule = await import('jspdf')
    await import('jspdf-autotable')
    
    // Ensure global pdfMake availability if needed by other libraries
    if (typeof window !== 'undefined' && !window.jsPDF) {
      window.jsPDF = jsPDFModule.default
    }
    
    return jsPDFModule.default
  } catch (error) {
    console.error('Error loading PDF libraries:', error)
    throw new Error('No se pudieron cargar las bibliotecas de PDF: ' + error.message)
  }
}

export default {
  name: 'NuevoEmbarque',
  components: {
    Rendimientos,
    Sidebar
  },
  setup() {
    const authStore = useAuthStore();
    return { authStore };
  },
  data() {
    return {
      usuariosActivos: [],
      clientesJuntarMedidas: {},
      clientesPredefinidos: [
        { id: 1, nombre: 'Joselito', color: '#3498db', textColor: 'white' },
        { id: 2, nombre: 'Catarro', color: '#e74c3c', textColor: 'white' },
        { id: 3, nombre: 'Otilio', color: '#f1c40f', textColor: 'black' },
        { id: 4, nombre: 'Ozuna', color: '#2ecc71', textColor: 'white' },
      ],
      clientesPersonalizados: [],
      ultimoIdPersonalizado: 0,
      embarque: {
        fecha: null,
        cargaCon: '',
        productos: [],
        crudos: []
      },
      nuevoClienteId: '',
      undoStack: [],
      redoStack: [],
      isUndoRedo: false,
      cambios: [],
      producto: {
        reporteTaras: [],
        reporteBolsas: []
      },
      embarqueId: null,
      modoEdicion: false,
      guardadoAutomaticoActivo: false,
      clienteCrudos: {},
      unsubscribe: null,
      medidasSugeridas: [],
      medidasUsadas: [], // Array para almacenar medidas únicas usadas
      mostrarSugerencias: false,
      sugerenciasMedidas: [],
      mostrarModalPrecio: false,
      precioTemp: '',
      itemSeleccionado: null,
      mostrarModalHilos: false,
      hilosTemp: '',
      juntarMedidas: false,
      mostrarModalNota: false,
      notaTemp: '',
      mostrarModalNombreAlternativo: false,
      nombreAlternativoTemp: '',
      productoSeleccionado: null,
      productoEditandoId: null,
      mostrarModalAlt: false,
      altTemp: '',
      clientesOffsets: {},
      embarqueBloqueado: false,
      clienteActivo: null,
      sidebarCollapsed: false,
      mostrarModalNuevoCliente: false,
      nuevoClienteNombre: '',
      nuevoClienteColor: '#007bff',
      // New properties for PDF generation
      isGeneratingPdf: false,
      pdfType: null,
      isCreatingAccount: false,
    };
  },
  clientesJuntarMedidas: {},

  computed: {
    clientesDisponibles() {
      const clienteSet = new Set();
      const clientesPredefinidosUnicos = this.clientesPredefinidos.filter(cliente => {
        if (!clienteSet.has(cliente.nombre)) {
          clienteSet.add(cliente.nombre);
          return true;
        }
        return false;
      });

      const clientesPersonalizadosUnicos = this.clientesPersonalizados.filter(cliente => {
        if (!clienteSet.has(cliente.nombre)) {
          clienteSet.add(cliente.nombre);
          return true;
        }
        return false;
      });

      return [...clientesPredefinidosUnicos, ...clientesPersonalizadosUnicos, { id: 'otro', nombre: 'Otro', key: 'otro' }];
    },
    productosPorCliente() {
      const productosPorCliente = {};
      
      this.embarque.productos.forEach(producto => {
        const clienteId = producto.clienteId;
        if (!productosPorCliente[clienteId]) {
          productosPorCliente[clienteId] = [];
        }
        productosPorCliente[clienteId].push(producto);
        
        // Ordenar solo si los productos tienen medida y tipo
        if (!producto.isEditing) {
          productosPorCliente[clienteId].sort((a, b) => {
            // Solo ordenar si ambos productos tienen medida y tipo
            if (a.medida && a.tipo && b.medida && b.tipo) {
              return this.compararMedidas(b.medida, a.medida);
            }
            // Si alguno no tiene medida o tipo, mantener el orden original
            if (!a.medida || !a.tipo) return 1;
            if (!b.medida || !b.tipo) return -1;
            return 0;
          });
        }
      });
      
      return productosPorCliente;
    },
    clientesPersonalizadosEmbarque() {
      // Obtener IDs de clientes que tienen productos en este embarque
      const clientesEnEmbarque = Object.keys(this.productosPorCliente);
      
      // Filtrar los clientes personalizados que están en este embarque
      // y que no son parte de los predefinidos
      const clientesPredefinidosIds = this.clientesPredefinidos.map(c => c.id.toString());
      
      return this.clientesPersonalizados.filter(cliente => 
        clientesEnEmbarque.includes(cliente.id.toString()) && 
        !clientesPredefinidosIds.includes(cliente.id.toString())
      );
    },
  },
  methods: {
    agregarProducto(clienteId) {
      // Eliminar la verificación que impide agregar múltiples productos para el mismo cliente
      // const existeProductoParaCliente = this.embarque.productos.some(p => p.clienteId.toString() === clienteId.toString());
      
      // if (existeProductoParaCliente) {
      //   console.log(`Ya existe un producto para el cliente ${clienteId}`);
      //   return;
      // }
      
      const nuevoProducto = {
        id: Date.now(),
        clienteId: clienteId,
        medida: '',
        tipo: '',
        tipoPersonalizado: '',
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
        noSumarKilos: false
      };

      // Establecer tipo por defecto según el cliente
      this.setTipoDefaultParaCliente(nuevoProducto);
      
      // Agregar directamente al embarque.productos
      this.embarque.productos.push(nuevoProducto);
      
      if (!this.guardadoAutomaticoActivo && this.embarqueId) {
        this.guardadoAutomaticoActivo = true;
      }
      
      if (this.embarqueId) {
        this.guardarCambiosEnTiempoReal();
      }
      
      this.actualizarMedidasUsadas();

      // Esperar a que el DOM se actualice y enfocar el nuevo input
      this.$nextTick(() => {
        const inputs = document.querySelectorAll('.medida-input');
        const nuevoInput = Array.from(inputs).find(input => {
          const productoId = input.closest('.producto').dataset.productoId;
          return productoId === String(nuevoProducto.id);
        });
        if (nuevoInput) {
          nuevoInput.focus();
        }
      });
    },
    eliminarProducto(producto) {
      const index = this.embarque.productos.indexOf(producto);
      if (index > -1) {
        this.embarque.productos.splice(index, 1);
      }
    },
    async agregarClienteProducto() {
      if (!this.embarque.fecha) {
        alert('Por favor, seleccione una fecha para el embarque.');
        return;
      }

      if (this.nuevoClienteId === 'otro') {
        const nuevoNombre = prompt('Ingrese el nombre del nuevo cliente:');
        if (nuevoNombre && nuevoNombre.trim() !== '') {
          this.ultimoIdPersonalizado++;
          const nuevoClienteId = `personalizado_${this.ultimoIdPersonalizado}`;
          const nuevoCliente = {
            id: nuevoClienteId,
            nombre: nuevoNombre.trim(),
            editable: true,
            personalizado: true
          };
          this.clientesPersonalizados.push(nuevoCliente);
          await this.guardarEmbarqueInicial(nuevoClienteId);
        }
      } else if (this.nuevoClienteId) {
        await this.guardarEmbarqueInicial(this.nuevoClienteId);
      }
      this.nuevoClienteId = '';
    },
    async guardarEmbarqueInicial(clienteId) {
      // Si no existe embarqueId, crear nuevo embarque
      if (!this.embarqueId) {
        const db = getFirestore();
        try {
          // Primero crear el embarque
          const embarqueData = this.prepararDatosEmbarque();
          const docRef = await addDoc(collection(db, "embarques"), embarqueData);
          
          // Guardar el ID y activar modo edición
          this.embarqueId = docRef.id;
          this.modoEdicion = true;
          this.guardadoAutomaticoActivo = true;
          
          // Luego agregar el producto
          this.agregarProducto(clienteId);
          
          console.log('Embarque inicial creado con ID:', this.embarqueId);
          return this.embarqueId; // Retornar el ID para encadenar operaciones
        } catch (error) {
          console.error("Error al crear el embarque inicial:", error);
          alert('Hubo un error al crear el embarque. Por favor, intente nuevamente.');
          return null;
        }
      } else {
        // Si ya existe el embarqueId, solo agregar el producto
        this.agregarProducto(clienteId);
        return this.embarqueId;
      }
    },
    eliminarCliente(clienteId) {
      // Filtrar los productos para eliminar los del cliente seleccionado
      this.embarque.productos = this.embarque.productos.filter(p => p.clienteId !== clienteId);
      
      // Actualizar el estado para reflejar los cambios
      this.$forceUpdate();

      // Opcional: Agregar un mensaje a la lista de cambios
      this.cambios.push(`Cliente ${this.obtenerNombreCliente(clienteId)} eliminado`);
    },
    agregarTara(producto) {
      producto.taras.push(null);
      producto.kilos.push(null);
    },
    eliminarTara(producto, index) {
      producto.taras.splice(index, 1);
      producto.kilos.splice(index, 1);
    },
    totalTaras(producto) {
      console.log('Taras normales:', producto.taras);
      console.log('Taras extra:', producto.tarasExtra);
      const tarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (tara || 0), 0);
      const tarasExtra = (producto.tarasExtra || []).reduce((sum, tara) => sum + (tara || 0), 0);
      console.log('Total taras:', tarasNormales + tarasExtra);
      return tarasNormales + tarasExtra;
    },
    totalKilos(producto) {
      console.log('Kilos:', producto.kilos);
      console.log('Restar taras:', producto.restarTaras);
      const sumaKilos = (producto.kilos || []).reduce((sum, kilo) => sum + (kilo || 0), 0);
      const sumaTarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (tara || 0), 0);
      // No incluimos las taras extra en el descuento
      const descuentoTaras = producto.restarTaras ? sumaTarasNormales * 3 : 0;
      const resultado = Number((sumaKilos - descuentoTaras).toFixed(1));
      console.log('Total kilos:', resultado);
      return resultado;
    },
    obtenerNombreCliente(clienteId) {
      const clienteEnLista = this.clientesDisponibles.find(c => c.id.toString() === clienteId.toString());
      if (clienteEnLista) {
        return clienteEnLista.nombre;
      }
      // Buscar en los productos por si el cliente ya no está en la lista
      const productoConCliente = this.embarque.productos.find(p => p.clienteId.toString() === clienteId.toString());
      return productoConCliente ? productoConCliente.nombreCliente : 'Cliente Desconocido';
    },
    editarNombreCliente(clienteId) {
      const cliente = this.clientesDisponibles.find(c => c.id === clienteId);
      if (cliente && cliente.editable) {
        const nuevoNombre = prompt('Ingrese el nuevo nombre del cliente:', cliente.nombre);
        if (nuevoNombre !== null && nuevoNombre.trim() !== '') {
          cliente.nombre = nuevoNombre.trim();
          // Actualizar el nombre en los productos existentes
          this.embarque.productos.forEach(producto => {
            if (producto.clienteId === clienteId) {
              producto.nombreCliente = nuevoNombre.trim();
            }
          });
        }
      }
    },
    async cargarEmbarque(id) {
      console.log('Cargando embarque con ID:', id);
      if (id === 'nuevo') {
        this.resetearEmbarque();
        return;
      }

      const db = getFirestore();
      const embarqueRef = doc(db, "embarques", id);

      this.unsubscribe = onSnapshot(embarqueRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          console.log('Datos del embarque cargado:', data);
          
          // Cargar el estado de bloqueo
          this.embarqueBloqueado = data.embarqueBloqueado || false;
          
          // Cargar el estado de juntar medidas
          if (data.clientesJuntarMedidas) {
            this.clientesJuntarMedidas = data.clientesJuntarMedidas;
          } else {
            // Si no existe, inicializar con valores por defecto
            this.clientesJuntarMedidas = {};
            data.clientes.forEach(cliente => {
              this.$set(this.clientesJuntarMedidas, cliente.id, false);
            });
          }

          let fecha;
          if (data.fecha && typeof data.fecha.toDate === 'function') {
            fecha = data.fecha.toDate();
          } else if (data.fecha instanceof Date) {
            fecha = data.fecha;
          } else if (typeof data.fecha === 'string') {
            fecha = new Date(data.fecha);
          } else {
            console.warn('Formato de fecha no reconocido, usando la fecha actual');
            fecha = new Date();
          }

          // Crear un Map con los clientes predefinidos
          const clientesPredefinidosMap = new Map(this.clientesPredefinidos.map(c => [c.id, c]));

          // Filtrar y mapear clientes
          this.clientesPersonalizados = data.clientes
            .filter(cliente => !clientesPredefinidosMap.has(cliente.id))
            .map(cliente => ({
              id: cliente.id,
              nombre: cliente.nombre,
              editable: true,
              personalizado: true,
              key: `personalizado_${cliente.id}`
            }));

          console.log('Clientes personalizados después de filtrar:', this.clientesPersonalizados);

          this.embarque = {
            fecha: fecha.toISOString().split('T')[0],
            cargaCon: data.cargaCon || '', // Cargamos el valor de cargaCon
            productos: data.clientes.flatMap(cliente => {
              const clienteInfo = clientesPredefinidosMap.get(cliente.id) || cliente;
              return cliente.productos.map(producto => ({
                ...producto,
                clienteId: cliente.id,
                nombreCliente: clienteInfo.nombre,
                restarTaras: producto.restarTaras || false,
              }));
            }),
            // Agregar los kilos crudos
            kilosCrudos: data.kilosCrudos || {}
          };

          // Cargar los crudos
          this.clienteCrudos = {};
          data.clientes.forEach(cliente => {
            if (cliente.crudos && cliente.crudos.length > 0) {
              this.$set(this.clienteCrudos, cliente.id, cliente.crudos);
            }
          });

          console.log('Embarque procesado:', this.embarque);
          console.log('Crudos cargados:', this.clienteCrudos);
          
          this.embarqueId = id;
          this.modoEdicion = true;
          this.guardadoAutomaticoActivo = true;
        } else {
          console.error("No se encontró el embarque");
          this.resetearEmbarque();
        }
      }, (error) => {
        console.error("Error al escuchar cambios del embarque:", error);
      });
    },
    resetearEmbarque() {
      this.embarque = {
        fecha: new Date().toISOString().split('T')[0], // Establecer fecha actual por defecto
        cargaCon: '',
        productos: [],
      };
      this.clientesJuntarMedidas = {};
      this.embarqueId = null;
      this.modoEdicion = false;
      this.guardadoAutomaticoActivo = false;
      this.embarqueBloqueado = false;
      this.clientesPersonalizados = []; // Reiniciar clientes personalizados
      
      // Agregar automáticamente los clientes predeterminados
      this.$nextTick(async () => {
        if (this.embarque.fecha) {
          try {
            // Crear el embarque inicial con el primer cliente (Joselito)
            await this.guardarEmbarqueInicial(this.clientesPredefinidos[0].id.toString());
            
            // Esperar un momento para asegurar que el primer cliente se haya agregado correctamente
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Agregar el resto de clientes predeterminados
            for (let i = 1; i < this.clientesPredefinidos.length; i++) {
              // Crear un producto para cada cliente predeterminado
              const clienteId = this.clientesPredefinidos[i].id.toString();
              
              // Verificar si ya existe un producto para este cliente
              const existeProducto = this.embarque.productos.some(p => p.clienteId.toString() === clienteId);
              
              // Solo agregar si no existe
              if (!existeProducto) {
                const nuevoProducto = {
                  id: Date.now() + i,
                  clienteId: clienteId,
                  medida: '',
                  tipo: '',
                  tipoPersonalizado: '',
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
                  noSumarKilos: false
                };
                
                // Establecer tipo por defecto según el cliente
                this.setTipoDefaultParaCliente(nuevoProducto);
                
                // Agregar directamente al embarque.productos
                this.embarque.productos.push(nuevoProducto);
                
                // Esperar un momento entre cada adición
                await new Promise(resolve => setTimeout(resolve, 50));
              }
            }
            
            // Establecer el primer cliente como activo
            this.clienteActivo = this.clientesPredefinidos[0].id.toString();
            
            // Guardar los cambios
            this.guardarCambiosEnTiempoReal();
          } catch (error) {
            console.error("Error al crear clientes predeterminados:", error);
          }
        }
      });
    },
    guardarCambiosEnTiempoReal: debounce(function() {
      if (!this.guardadoAutomaticoActivo || !this.embarqueId || this.mostrarModalPrecio) return;

      // Crear una copia profunda de los datos antes de guardar
      const embarqueData = {
        ...JSON.parse(JSON.stringify(this.prepararDatosEmbarque())),
        clientesJuntarMedidas: { ...this.clientesJuntarMedidas }
      };

      const db = getFirestore();
      
      updateDoc(doc(db, "embarques", this.embarqueId), embarqueData)
        .then(() => {
          console.log('Cambios guardados automáticamente:', new Date().toLocaleString());
          this.$emit('guardado-automatico');
        })
        .catch((error) => {
          console.error("Error al guardar automáticamente:", error);
        });
    }, 2000), // Aumentar el tiempo del debounce a 2000ms

    async guardarEmbarque() {
      if (!this.embarque.fecha) {
        alert('Por favor, seleccione una fecha para el embarque.');
        return;
      }

      const embarqueData = this.prepararDatosEmbarque();
      const db = getFirestore();

      try {
        if (this.modoEdicion) {
          await updateDoc(doc(db, "embarques", this.embarqueId), embarqueData);
          alert('Embarque actualizado exitosamente.');
        } else {
          const docRef = await addDoc(collection(db, "embarques"), {
            ...embarqueData,
            ultimaEdicion: {
              userId: this.authStore.userId,
              username: this.authStore.user.username,
              timestamp: serverTimestamp()
            }
          });
          
          // Notificar a otros usuarios sobre el cambio
          const cambiosRef = ref(rtdb, `cambios/${docRef.id}`)
          await set(cambiosRef, {
            tipo: 'guardar',
            userId: this.authStore.userId,
            username: this.authStore.user.username,
            timestamp: serverTimestamp()
          })
          
          this.embarqueId = docRef.id;
          alert('Embarque creado exitosamente y guardado en la base de datos.');
          this.modoEdicion = true;
        }
        this.guardadoAutomaticoActivo = true;
        this.$router.push('/lista-embarques');
      } catch (error) {
        console.error("Error al guardar el embarque: ", error);
        alert('Hubo un error al guardar el embarque. Por favor, intente nuevamente.');
      }
    },
    prepararDatosEmbarque() {
      const embarqueData = {
        fecha: new Date(this.embarque.fecha),
        cargaCon: this.embarque.cargaCon,
        clientes: [],
        clientesJuntarMedidas: this.clientesJuntarMedidas,
        embarqueBloqueado: this.embarqueBloqueado
      };

      const clientesPredefinidosMap = new Map(this.clientesPredefinidos.map(c => [c.id, c]));

      Object.entries(this.productosPorCliente).forEach(([clienteId, productos]) => {
        const clientePredefinido = clientesPredefinidosMap.get(parseInt(clienteId));
        const clienteData = {
          id: clienteId,
          nombre: clientePredefinido ? clientePredefinido.nombre : this.obtenerNombreCliente(clienteId),
          productos: productos.map(producto => ({
            ...producto,
            restarTaras: producto.restarTaras || false,
            noSumarKilos: producto.noSumarKilos || false // Agregar esta línea
          })),
          crudos: this.clienteCrudos[clienteId] || []
        };
        embarqueData.clientes.push(clienteData);
      });

      return embarqueData;
    },
    onTipoChange(producto) {
      if (producto.tipo !== 'otro') {
        producto.tipoPersonalizado = '';
      }
      if (producto.tipo === 'c/h20' && !producto.camaronNeto) {
        producto.camaronNeto = 0.65;
      }
      
      // Marcar temporalmente como editando para evitar ordenamiento inmediato
      producto.isEditing = true;
      this.$nextTick(() => {
        // Después de un breve retraso, permitir el ordenamiento
        setTimeout(() => {
          if (producto.medida && producto.tipo) {
            producto.isEditing = false;
          }
        }, 100);
      });
    },
    // Agregar este nuevo método
    setTipoDefaultParaCliente(producto) {
      const clienteNombre = this.obtenerNombreCliente(producto.clienteId);
      if (clienteNombre === 'Catarro') {
        producto.tipo = 's/h20';
      }
    },
    undo() {
      if (this.undoStack.length > 1) { // Asegura que haya al menos un estado previo
        // Obtener el estado actual y moverlo al redoStack
        const estadoActual = this.undoStack.pop();
        this.redoStack.push(estadoActual);
        // Obtener el estado anterior del undoStack
        const estadoAnterior = this.undoStack[this.undoStack.length - 1];
        this.isUndoRedo = true; // Indicar que se está realizando una operación de Undo
        this.embarque = JSON.parse(estadoAnterior);
        console.log('Undo realizado. Estado actual restaurado.');
        
        // Llamar al método de guardado automático
        this.guardarCambiosEnTiempoReal();
      } else {
        console.log('No hay más acciones para deshacer.');
      }
    },
    redo() {
      if (this.redoStack.length > 0) {
        // Obtener el último estado del redoStack
        const estadoRehacer = this.redoStack.pop();
        this.undoStack.push(estadoRehacer);
        this.isUndoRedo = true; // Indicar que se está realizando una operación de Redo
        this.embarque = JSON.parse(estadoRehacer);
        console.log('Redo realizado. Estado actual restaurado.');
        
        // Llamar al método de guardado automático
        this.guardarCambiosEnTiempoReal();
      } else {
        console.log('No hay más acciones para rehacer.');
      }
    },
    agregarReporteTara(producto) {
      if (!Array.isArray(producto.reporteTaras)) {
        this.$set(producto, 'reporteTaras', []);
      }
      if (!Array.isArray(producto.reporteBolsas)) {
        this.$set(producto, 'reporteBolsas', []);
      }
      producto.reporteTaras.push(null);
      producto.reporteBolsas.push(null);
    },
    eliminarReporteTara(producto, index) {
      producto.reporteTaras.splice(index, 1);
      producto.reporteBolsas.splice(index, 1);
    },
    obtenerTipoProducto(producto) {
      if (producto.tipo === 'otro') {
        return producto.tipoPersonalizado || 'Otro';
      }
      return producto.tipo || 'Sin Tipo';
    },
    
    // Removed initPdfMake method in favor of lazy loading PDF libraries directly in each PDF generation method

    async generarResumenEmbarque2() {
      // Show loading indicator
      this.$set(this, 'isGeneratingPdf', true);
      this.$set(this, 'pdfType', 'resumen');
      
      try {
        const medidasCrudos = new Set();
        Object.values(this.clienteCrudos).forEach(crudos => {
          crudos.forEach(crudo => {
            crudo.items.forEach(item => {
              if (item.talla) {
                medidasCrudos.add(item.talla);
              }
            });
          });
        });

        const embarqueData = {
          ...this.embarque,
          crudos: Object.entries(this.clienteCrudos).flatMap(([clienteId, crudos]) => 
            crudos.flatMap(crudo => 
              crudo.items.map(item => {
                const tarasArray = [];
                
                // Agregar taras principales
                if (item.taras) {
                  tarasArray.push(item.taras);
                }
                
                // Agregar sobrante si existe
                if (item.sobrante) {
                  tarasArray.push(item.sobrante);
                }
                
                return {
                  clienteId,
                  medida: item.talla,
                  taras: tarasArray,
                  barco: item.barco,
                  textoAlternativo: item.textoAlternativo // Incluir el texto alternativo
                };
              })
            )
          ),
          medidasCrudos: Array.from(medidasCrudos)
        };

        console.log('Generando PDF de resumen de embarque...');
        
        // Use directly imported function
        generarResumenEmbarquePDF(embarqueData, this.productosPorCliente, this.obtenerNombreCliente, this.clientesDisponibles);
        
        console.log('PDF generado con éxito');
      } catch (error) {
        console.error('Error al generar el PDF:', error);
        alert('Hubo un error al generar el resumen de embarque: ' + error.message);
      } finally {
        // Hide loading indicator
        this.$set(this, 'isGeneratingPdf', false);
        this.$set(this, 'pdfType', null);
      }
    },

    calcularAlturaCliente(productos, crudos) {
      try {
        // Altura base para el header del cliente
        let altura = 40;

        // Altura para la tabla de productos
        if (Array.isArray(productos) && productos.length > 0) {
          altura += 30; // Header de la tabla
          altura += productos.length * 25; // Cada fila de producto
        }

        // Altura para la tabla de crudos
        if (Array.isArray(crudos) && crudos.length > 0) {
          altura += 30; // Header de la tabla
          altura += crudos.reduce((total, crudo) => {
            if (crudo && Array.isArray(crudo.items)) {
              return total + (crudo.items.length * 25); // Cada fila de crudo
            }
            return total;
          }, 0);
        }

        // Margen entre clientes
        altura += 20;

        return altura;
      } catch (error) {
        console.error('Error en calcularAlturaCliente:', error);
        return 60; // Retornar altura base en caso de error
      }
    },

    generarContenidoCliente(clienteId, productos, crudos, colorCliente) {
      const nombreCliente = this.obtenerNombreCliente(clienteId);
      const totalTarasCliente = productos.reduce((sum, p) => sum + this.totalTaras(p), 0);
      const totalKilosCliente = productos.reduce((sum, p) => sum + this.totalKilos(p), 0);
      
      // Calcular totales de crudos
      const crudosTotalKilos = crudos.reduce((sum, crudo) => {
        return sum + crudo.items.reduce((itemSum, item) => {
          return itemSum + this.calcularKilosCrudos(item);
        }, 0);
      }, 0);

      const crudosTotalTaras = crudos.reduce((sum, crudo) => {
        return sum + crudo.items.reduce((itemSum, item) => {
          return itemSum + this.calcularTarasCrudos(item);
        }, 0);
      }, 0);

      // Formatear el total de kilos para eliminar decimales innecesarios
      const totalKilosFormateado = (totalKilosCliente + crudosTotalKilos).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
      });

      const contenido = [{
        table: {
          widths: ['*', 200],
          body: [[
            {
              text: nombreCliente,
              style: 'clienteHeader',
              fillColor: colorCliente
            },
            {
              text: `Total: ${totalTarasCliente + crudosTotalTaras}T | ${totalKilosFormateado}Kg`,
              style: 'total',
              fillColor: colorCliente,
              alignment: 'right'
            }
          ]]
        },
        margin: [0, 10, 0, 0]
      }];

      // Verificar si hay crudos para determinar el layout
      const hayCrudos = crudos && crudos.length > 0 && crudos.some(crudo => crudo.items && crudo.items.length > 0);

      // Si hay productos, crear la tabla de productos
      if (productos.length > 0) {
        const tablaProductos = {
          table: {
            headerRows: 1,
            widths: hayCrudos ? [190, 50, 85] : [200, 80, 120],
            body: [
              [
                { text: 'Medida', style: 'tableHeader', fontSize: 20 },
                { text: 'Kg', style: 'tableHeader', fontSize: 20 },
                { text: 'Taras', style: 'tableHeader', fontSize: 20 }
              ],
              ...productos.map(producto => {
                // Formatear los kilos para el producto
                const kilos = producto.tipo === 'c/h20' ? 
                  this.calcularKilosProductoCH20(producto) : 
                  this.totalKilos(producto);
                
                const kilosFormateados = kilos.toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 1
                });

                // Construir el texto de la medida con el precio
                const medidaTexto = [
                  { text: producto.medida || '', fontSize: 18 }
                ];

                // Agregar el tipo si existe
                if (producto.tipo === 'c/h20') {
                  medidaTexto.push(
                    { text: ' c/h20', color: '#3498db', fontSize: 18 },
                    { text: ` (${producto.camaronNeto || 0.65})`, color: '#3498db', fontSize: 18 }
                  );
                } else if (producto.tipo === 'otro') {
                  medidaTexto.push({ text: ` ${producto.tipoPersonalizado}`, fontSize: 18 });
                } else if (producto.tipo) {
                  medidaTexto.push({ text: ` ${producto.tipo}`, fontSize: 18 });
                }

                // Agregar el precio si existe
                if (producto.precio) {
                  medidaTexto.push({ text: ` $${producto.precio}`, color: '#27ae60', fontSize: 18 });
                }

                return [
                  { 
                    text: medidaTexto,
                    fontSize: 18 
                  },
                  { 
                    text: kilosFormateados, 
                    fontSize: 18 
                  },
                  { 
                    text: `${this.totalTaras(producto)}-${this.generarDetallesProductoCompacto(producto)}`, 
                    fontSize: 18 
                  }
                ];
              })
            ]
          },
          margin: [0, 5, hayCrudos ? 5 : 0, 10]
        };

        if (hayCrudos) {
          // Si hay crudos, usar el layout de columnas
          contenido.push({
            columns: [
              {
                width: '*',
                stack: [tablaProductos]
              },
              {
                width: '*',
                stack: [{
                  table: {
                    headerRows: 1,
                    widths: [45, 55, 25, 40],
                    body: [
                      [
                        { text: 'Talla', style: 'crudosHeader', fontSize: 20 },
                        { text: 'Barco', style: 'crudosHeader', fontSize: 20 },
                        { text: 'T', style: 'crudosHeader', fontSize: 20 },
                        { text: 'Kg', style: 'crudosHeader', fontSize: 20 }
                      ],
                      ...crudos.flatMap(crudo =>
                        crudo.items.map(item => [
                          { 
                            text: [
                              { text: this.formatearTallaCrudo(item.talla), fontSize: 18 },
                              item.precio ? { text: `\n$${item.precio}`, color: '#27ae60', fontSize: 18 } : ''
                            ],
                            fontSize: 18 
                          },
                          { text: item.barco, fontSize: 18 },
                          { text: this.calcularTarasCrudos(item), fontSize: 18 },
                          { text: this.calcularKilosCrudos(item).toFixed(0), fontSize: 18 }
                        ])
                      )
                    ]
                  },
                  margin: [5, 5, 0, 10]
                }]
              }
            ]
          });
        } else {
          // Si no hay crudos, agregar solo la tabla de productos a todo el ancho
          contenido.push(tablaProductos);
        }
      }

      return contenido;
    },

    // Método auxiliar para generar detalles compactos
    generarDetallesProductoCompacto(producto) {
      let detalles = [];
      
      if (producto.reporteTaras && producto.reporteTaras.length > 0) {
        const reporteCombinado = this.combinarTarasBolsasCompacto(producto.reporteTaras, producto.reporteBolsas);
        if (reporteCombinado) detalles.push(reporteCombinado);
      }
      
      if (producto.esVenta) {
        detalles.push('V');
      }
      
      return detalles.join('|');
    },

    // Nuevo método para combinar taras y bolsas de forma más compacta
    combinarTarasBolsasCompacto(taras, bolsas) {
      const combinado = {};
      
      taras.forEach((tara, index) => {
        const bolsa = bolsas[index] || '';
        const key = bolsa;
        combinado[key] = (combinado[key] || 0) + parseInt(tara || 1);
      });

      return Object.entries(combinado)
        .map(([bolsa, count]) => `(${count}-${bolsa})`) // Agregamos los paréntesis aquí
        .join(' ');
    },

    // Método auxiliar para generar detalles del producto
    generarDetallesProducto(producto) {
      let detalles = [];
      
      if (producto.reporteTaras && producto.reporteTaras.length > 0) {
        const reporteCombinado = this.combinarTarasBolsas(producto.reporteTaras, producto.reporteBolsas);
        if (reporteCombinado) detalles.push(reporteCombinado);
      }
      
      if (producto.tipo === 'c/h20') {
        detalles.push(`Neto: ${producto.camaronNeto || 0.65}`);
      }
      
      if (producto.esVenta) {
        detalles.push('(Venta)');
      }
      
      return detalles.join(' | ');
    },

    // Método auxiliar para convertir color hex a RGB
    hexToRgb(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    },
    getClienteColor(clienteId) {
      const cliente = this.clientesDisponibles.find(c => c.id.toString() === clienteId.toString());
      if (cliente && (cliente.personalizado || clienteId.toString().startsWith('personalizado_'))) {
        return '#95a5a6'; // Color gris para clientes personalizados
      }
      const colores = {
        '1': '#3498db', // Joselito
        '2': '#e74c3c', // Catarro
        '3': '#f1c40f', // Otilio
        '4': '#2ecc71'  // Ozuna
      };
      return colores[clienteId] || '#95a5a6'; // Color por defecto
    },
    volverAEmbarquesMenu() {
      // Navegar de vuelta al menú de embarques
      this.$router.push({ name: 'EmbarquesMenu' });
    },
    combinarTarasBolsas(taras, bolsas) {
      const combinado = {};
      
      taras.forEach((tara, index) => {
        const bolsa = bolsas[index] || '';
        const key = bolsa;
        combinado[key] = (combinado[key] || 0) + parseInt(tara || 1);
      });

      return Object.entries(combinado)
        .map(([bolsa, count]) => `(${count}-${bolsa})`)
        .join(' ');
    },
    totalTarasReportadas(producto) {
      return (producto.reporteTaras || []).reduce((total, tara) => {
        return total + (parseInt(tara) || 0);
      }, 0);
    },
    totalBolsasReportadas(producto) {
      return (producto.reporteTaras || []).reduce((total, tara, index) => {
        const taraNum = parseInt(tara) || 0;
        const bolsaNum = parseInt(producto.reporteBolsas[index]) || 0;
        return total + (taraNum * bolsaNum);
      }, 0);
    },
    coincideTaras(producto) {
      const totalReportadas = this.totalTarasReportadas(producto);
      const totalRegistradas = this.totalTaras(producto);
      return totalReportadas === totalRegistradas;
    },
    agregarTaraExtra(producto) {
      if (!Array.isArray(producto.tarasExtra)) {
        this.$set(producto, 'tarasExtra', []);
      }
      producto.tarasExtra.push(null);
    },
    eliminarTaraExtra(producto, index) {
      producto.tarasExtra.splice(index, 1);
    },
    agregarCrudo(clienteId) {
      if (!this.clienteCrudos[clienteId]) {
        this.$set(this.clienteCrudos, clienteId, []);
      }
      this.clienteCrudos[clienteId].push({
        items: [{ talla: '', barco: '', taras: null }]
      });
      this.guardarCambiosEnTiempoReal();
    },
    agregarCrudoItem(clienteId, index) {
      if (!this.clienteCrudos[clienteId]) {
        this.$set(this.clienteCrudos, clienteId, []);
      }
      if (!this.clienteCrudos[clienteId][index]) {
        this.$set(this.clienteCrudos[clienteId], index, { items: [] });
      }
      this.clienteCrudos[clienteId][index].items.push({
        talla: '',
        barco: '',
        taras: null,
        sobrante: null,
        mostrarSobrante: false
      });
      this.guardarCambiosEnTiempoReal();
    },
    eliminarCrudoItem(clienteId, crudoIndex, itemIndex) {
      this.clienteCrudos[clienteId][crudoIndex].items.splice(itemIndex, 1);
      if (this.clienteCrudos[clienteId][crudoIndex].items.length === 0) {
        this.eliminarCrudo(clienteId, crudoIndex);
      }
      this.guardarCambiosEnTiempoReal();
    },
    eliminarCrudo(clienteId, index) {
      this.clienteCrudos[clienteId].splice(index, 1);
      if (this.clienteCrudos[clienteId].length === 0) {
        this.$delete(this.clienteCrudos, clienteId);
      }
      this.guardarCambiosEnTiempoReal();
    },
    toggleSobrante(clienteId, crudoIndex, itemIndex) {
      const item = this.clienteCrudos[clienteId][crudoIndex].items[itemIndex];
      if (!item.hasOwnProperty('mostrarSobrante')) {
        this.$set(item, 'mostrarSobrante', true);
      } else {
        item.mostrarSobrante = !item.mostrarSobrante;
      }
      this.guardarCambiosEnTiempoReal();
    },
    calcularTotalCrudos(crudo) {
      return crudo.items.reduce((total, item) => {
        let taras = this.extraerNumero(item.taras);
        let sobrante = this.extraerNumero(item.sobrante);
        return total + taras + sobrante;
      }, 0);
    },

    extraerNumero(valor) {
      if (!valor) return 0;
      const match = valor.toString().match(/^(\d+)/);
      return match ? parseInt(match[1]) : 0;
    },
    actualizarTotalCrudos(clienteId, index) {
      // Forzar la actualización del componente
      this.$forceUpdate();
      this.guardarCambiosEnTiempoReal();
    },
    actualizarCrudos() {
      this.guardarCambiosEnTiempoReal();
    },
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
            console.log(`Ajustando tara de formato ${item.taras} a ${cantidad}-${medida}`);
          }
          
          kilosTotales += cantidad * medida;
        } else {
          // Formato original si no coincide con el patrón
          const [cantidad, medida] = item.taras.split('-').map(Number);
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
            console.log(`Ajustando sobrante de formato ${item.sobrante} a ${cantidadSobrante}-${medidaSobrante}`);
          }
          
          kilosTotales += cantidadSobrante * medidaSobrante;
        } else {
          // Formato original si no coincide con el patrón
          const [cantidadSobrante, medidaSobrante] = item.sobrante.split('-').map(Number);
          kilosTotales += cantidadSobrante * medidaSobrante;
        }
      }
      
      return kilosTotales;
    },
    calcularTarasCrudos(item) {
      let totalTaras = 0;
      if (item.taras) {
        const [cantidad] = item.taras.split('-').map(Number);
        totalTaras += cantidad;
      }
      if (item.sobrante) {
        const [cantidadSobrante] = item.sobrante.split('-').map(Number);
        totalTaras += cantidadSobrante;
      }
      return totalTaras;
    },
    async generarNotaVenta(clienteId) {
      // Show loading indicator
      this.$set(this, 'isGeneratingPdf', true);
      this.$set(this, 'pdfType', 'cliente-' + clienteId);
      
      try {
        const clienteProductos = this.productosPorCliente[clienteId];
        const clienteCrudos = this.clienteCrudos[clienteId];
        
        // Crear una copia del embarque con todos los datos necesarios
        const embarqueCliente = {
          fecha: this.embarque.fecha,
          cargaCon: this.embarque.cargaCon,
          productos: clienteProductos,
          clienteCrudos: { [clienteId]: clienteCrudos },
          kilosCrudos: this.embarque.kilosCrudos || {}
        };

        console.log(`Generando nota de venta para cliente ${clienteId}...`);
        
        // Use directly imported function
        generarNotaVentaPDF(embarqueCliente, this.clientesDisponibles, this.clientesJuntarMedidas);
        
        // Eliminamos la creación automática de la cuenta
        
        console.log('Nota de venta generada con éxito');
      } catch (error) {
        console.error('Error al generar la nota de venta:', error);
        alert('Hubo un error al generar la nota de venta: ' + error.message);
      } finally {
        // Hide loading indicator
        this.$set(this, 'isGeneratingPdf', false);
        this.$set(this, 'pdfType', null);
      }
    },
    onRestarTarasChange(producto) {
      console.log('Restar taras cambiado:', producto.restarTaras);
      this.$nextTick(() => {
        this.actualizarProducto(producto);
      });
    },

    actualizarProducto(producto) {
      const index = this.embarque.productos.findIndex(p => p === producto);
      if (index !== -1) {
        // Crear una copia profunda del producto para asegurar la reactividad
        const productoActualizado = JSON.parse(JSON.stringify(producto));
        this.$set(this.embarque.productos, index, productoActualizado);
        
        // Forzar la actualización del componente
        this.$forceUpdate();
        
        // Guardar cambios en Firestore
        if (this.guardadoAutomaticoActivo && this.embarqueId) {
          this.guardarCambiosEnTiempoReal();
        }
      }
    },
    reporteExcedeTresParentesis(producto) {
      const reporte = this.combinarTarasBolsas(producto.reporteTaras, producto.reporteBolsas);
      return (reporte.match(/\(/g) || []).length > 3;
    },

    generarReporteExtenso(producto) {
      const reporte = this.combinarTarasBolsas(producto.reporteTaras, producto.reporteBolsas);
      return reporte.replace(/\) /g, ')\n');
    },

    calcularTarasLimpio() {
      return this.embarque.productos.reduce((total, producto) => {
        // Verificar si el cliente es uno de los predefinidos
        const clienteId = producto.clienteId;
        const clientePredefinido = this.clientesPredefinidos.find(c => c.id.toString() === clienteId.toString());
        
        // Solo sumar si es un cliente predefinido
        if (clientePredefinido) {
          return total + this.totalTaras(producto);
        }
        return total;
      }, 0);
    },

    calcularTarasCrudo() {
      return Object.entries(this.clienteCrudos).reduce((total, [clienteId, crudos]) => {
        // Verificar si el cliente es uno de los predefinidos
        const clientePredefinido = this.clientesPredefinidos.find(c => c.id.toString() === clienteId.toString());
        
        // Solo sumar si es un cliente predefinido
        if (clientePredefinido) {
          return total + crudos.reduce((clienteTotal, crudo) => {
            return clienteTotal + this.calcularTotalCrudos(crudo);
          }, 0);
        }
        return total;
      }, 0);
    },

    calcularTotalTaras() {
      return this.calcularTarasLimpio() + this.calcularTarasCrudo();
    },

    calcularKilosLimpio() {
      return this.embarque.productos.reduce((total, producto) => {
        if (producto.tipo === 'c/h20') {
          // Para productos c/h20, calcular la suma de (taras * bolsa) para cada grupo
          const reporteTaras = producto.reporteTaras || [];
          const reporteBolsas = producto.reporteBolsas || [];
          let sumaTotalKilos = 0;

          for (let i = 0; i < reporteTaras.length; i++) {
            const taras = parseInt(reporteTaras[i]) || 0;
            const bolsa = parseInt(reporteBolsas[i]) || 0;
            sumaTotalKilos += taras * bolsa;
          }

          // Multiplicar por el valor neto (0.65 por defecto)
          const kilosReales = sumaTotalKilos * (producto.camaronNeto || 0.65);
          return total + kilosReales;
        } else {
          // Para otros productos, mantener el clculo original
          return total + this.totalKilos(producto);
        }
      }, 0).toFixed(2);
    },

    obtenerUltimaBolsa(producto) {
      const bolsas = producto.reporteBolsas || [];
      // Obtener el último valor válido de bolsa
      for (let i = bolsas.length - 1; i >= 0; i--) {
        const valor = parseInt(bolsas[i]);
        if (!isNaN(valor)) {
          return valor;
        }
      }
      return 0;
    },

    calcularKilosCrudo() {
      return Object.values(this.clienteCrudos).reduce((total, crudos) => {
        return total + crudos.reduce((clienteTotal, crudo) => {
          return clienteTotal + crudo.items.reduce((itemTotal, item) => {
            return itemTotal + parseFloat(this.calcularKilosCrudos(item));
          }, 0);
        }, 0);
      }, 0);
    },

    calcularTotalKilos() {
      const kilosLimpio = parseFloat(this.calcularKilosLimpio());
      const kilosCrudo = parseFloat(this.calcularKilosCrudo());
      return (kilosLimpio + kilosCrudo).toFixed(2);
    },

    calcularTotalBolsas: function(producto) {
      let total = 0;
      for (let i = 0; i < producto.reporteTaras.length; i++) {
        const tara = parseInt(producto.reporteTaras[i]) || 0;
        const bolsa = parseInt(producto.reporteBolsas[i]) || 0;
        total += tara * bolsa;
      }
      // Almacenar el total en el producto
      producto.totalKilos = total;
      return total;
    },

    formatearTallaCrudo(talla) {
      const abreviaturas = {
        'Med c/c': 'Med',
        'Med-Esp c/c': 'Esp',
        'Med-gde c/c': 'M-G',
        'Gde c/c': 'Gde',
        'Extra c/c': 'Ext',
        'Jumbo c/c': 'Jbo',
        'Linea': 'Lin',
        'Rechazo': 'Rch'
      };
      return abreviaturas[talla] || talla;
    },
    abrirModalPrecio(item) {
      event?.preventDefault();
      event?.stopPropagation();
      
      this.itemSeleccionado = item;
      this.precioTemp = item.precio || '';
      this.mostrarModalPrecio = true;
      this.$nextTick(() => {
        this.$refs.precioInput?.focus();
      });
    },
    cerrarModalPrecio() {
      event?.preventDefault();
      event?.stopPropagation();
      
      this.mostrarModalPrecio = false;
      this.itemSeleccionado = null;
      this.precioTemp = '';
    },
    guardarPrecio() {
      event?.preventDefault();
      event?.stopPropagation();
      
      if (this.itemSeleccionado) {
        const precio = parseFloat(this.precioTemp);
        if (!isNaN(precio)) {
          this.$set(this.itemSeleccionado, 'precio', precio);
          const guardadoActivo = this.guardadoAutomaticoActivo;
          this.guardadoAutomaticoActivo = false;
          
          this.$nextTick(() => {
            this.guardadoAutomaticoActivo = guardadoActivo;
            this.guardarCambiosEnTiempoReal();
          });
        }
      }
      this.cerrarModalPrecio();
    },
    abrirModalHilos(item) {
      event?.preventDefault();
      event?.stopPropagation();
      
      this.itemSeleccionado = item;
      // Si hilos no existe o es undefined, establecer como string vacío
      this.hilosTemp = item.hilos || '';
      this.mostrarModalHilos = true;
      this.$nextTick(() => {
        this.$refs.hilosInput?.focus();
      });
    },
    cerrarModalHilos() {
      event?.preventDefault();
      event?.stopPropagation();
      
      this.mostrarModalHilos = false;
      this.itemSeleccionado = null;
      this.hilosTemp = '';
    },
    guardarHilos() {
      event?.preventDefault();
      event?.stopPropagation();
      
      if (this.itemSeleccionado) {
        const hilos = this.hilosTemp.trim();
        // Si hilos está vacío, eliminamos la propiedad hilos del item
        if (!hilos) {
          this.$delete(this.itemSeleccionado, 'hilos');
        } else {
          this.$set(this.itemSeleccionado, 'hilos', hilos);
        }
        
        const guardadoActivo = this.guardadoAutomaticoActivo;
        this.guardadoAutomaticoActivo = false;
        
        this.$nextTick(() => {
          this.guardadoAutomaticoActivo = guardadoActivo;
          this.guardarCambiosEnTiempoReal();
        });
      }
      this.cerrarModalHilos();
    },
    async generarNotaVentaPDF() {
      // Show loading indicator
      this.$set(this, 'isGeneratingPdf', true);
      this.$set(this, 'pdfType', 'all');
      
      try {
        const embarqueCliente = {
          fecha: this.embarque.fecha,
          cargaCon: this.embarque.cargaCon,
          productos: this.embarque.productos,
          clienteCrudos: this.clienteCrudos,
          kilosCrudos: this.embarque.kilosCrudos || {}
        };

        console.log('Generando notas de venta para todos los clientes...');
        
        // Use directly imported function
        generarNotaVentaPDF(embarqueCliente, this.clientesDisponibles, this.clientesJuntarMedidas);
        
        console.log('Notas de venta generadas con éxito');
      } catch (error) {
        console.error('Error al generar notas de venta:', error);
        alert('Hubo un error al generar las notas de venta: ' + error.message);
      } finally {
        // Hide loading indicator
        this.$set(this, 'isGeneratingPdf', false);
        this.$set(this, 'pdfType', null);
      }
    },
    handleJuntarMedidasChange(clienteId, checked) {
      // Actualizar el estado local
      this.$set(this.clientesJuntarMedidas, clienteId, checked);
      
      // Guardar inmediatamente si estamos en modo edición
      if (this.modoEdicion && this.embarqueId) {
        this.guardarCambiosEnTiempoReal();
      }
    },
    guardarCambiosEnTiempoReal: debounce(function() {
      if (!this.guardadoAutomaticoActivo || !this.embarqueId || this.mostrarModalPrecio) return;

      const embarqueData = {
        ...this.prepararDatosEmbarque(),
        clientesJuntarMedidas: this.clientesJuntarMedidas
      };

      const db = getFirestore();
      
      updateDoc(doc(db, "embarques", this.embarqueId), embarqueData)
        .then(() => {
          console.log('Cambios guardados automáticamente:', new Date().toLocaleString());
          this.$emit('guardado-automatico');
        })
        .catch((error) => {
          console.error("Error al guardar automáticamente:", error);
        });
    }, 1500),
    abrirModalNota(item) {
      event?.preventDefault();
      event?.stopPropagation();
      
      this.itemSeleccionado = item;
      this.notaTemp = item.nota || '';
      this.mostrarModalNota = true;
      this.$nextTick(() => {
        this.$refs.notaInput?.focus();
      });
    },

    cerrarModalNota() {
      event?.preventDefault();
      event?.stopPropagation();
      
      this.mostrarModalNota = false;
      this.itemSeleccionado = null;
      this.notaTemp = '';
    },

    guardarNota() {
      event?.preventDefault();
      event?.stopPropagation();
      
      if (this.itemSeleccionado) {
        const nota = this.notaTemp.trim();
        if (nota) {
          this.$set(this.itemSeleccionado, 'nota', nota);
        } else {
          this.$delete(this.itemSeleccionado, 'nota');
        }
        
        const guardadoActivo = this.guardadoAutomaticoActivo;
        this.guardadoAutomaticoActivo = false;
        
        this.$nextTick(() => {
          this.guardadoAutomaticoActivo = guardadoActivo;
          this.guardarCambiosEnTiempoReal();
        });
      }
      this.cerrarModalNota();
    },
    // Agregar este nuevo método para calcular kilos de productos c/h20
    calcularKilosProductoCH20(producto) {
      const reporteTaras = producto.reporteTaras || [];
      const reporteBolsas = producto.reporteBolsas || [];
      let sumaTotalKilos = 0;

      console.log('Calculando kilos para producto c/h20:', producto.medida);
      console.log('reporteTaras:', reporteTaras);
      console.log('reporteBolsas:', reporteBolsas);
      console.log('camaronNeto:', producto.camaronNeto);

      // Verificar si hay datos de reporteTaras y reporteBolsas
      if (reporteTaras.length > 0 && reporteBolsas.length > 0) {
        for (let i = 0; i < reporteTaras.length; i++) {
          const taras = parseInt(reporteTaras[i]) || 0;
          const bolsa = parseInt(reporteBolsas[i]) || 0;
          sumaTotalKilos += taras * bolsa;
          console.log(`Grupo ${i+1}: ${taras} taras * ${bolsa} bolsas = ${taras * bolsa} kg`);
        }

        console.log('sumaTotalKilos antes de multiplicar:', sumaTotalKilos);
        
        // Asegurarnos de que camaronNeto no sea 0
        const valorNeto = (producto.camaronNeto && producto.camaronNeto > 0) ? producto.camaronNeto : 0.65;
        const resultado = sumaTotalKilos * valorNeto;
        
        console.log(`Resultado final: ${sumaTotalKilos} * ${valorNeto} = ${resultado}`);
        
        return resultado;
      } else {
        // Si no hay datos de reporteTaras o reporteBolsas, usar los kilos directamente
        console.log('No hay datos de reporteTaras o reporteBolsas, usando kilos directamente');
        const kilos = (producto.kilos || []).reduce((sum, kilo) => sum + (Number(kilo) || 0), 0);
        console.log('Kilos calculados directamente:', kilos);
        
        // Multiplicar por el valor neto
        const valorNeto = (producto.camaronNeto && producto.camaronNeto > 0) ? producto.camaronNeto : 0.65;
        const resultado = kilos * valorNeto;
        console.log(`Kilos después de multiplicar por valorNeto (${valorNeto}):`, resultado);
        
        return resultado;
      }
    },
    // Agregar esta nueva función para comparar medidas
    compararMedidas(medidaA, medidaB) {
      // Si alguna medida es vacía o undefined, ponerla al final
      if (!medidaA) return 1;
      if (!medidaB) return -1;

      // Función auxiliar para extraer números de una medida
      const extraerNumeros = (medida) => {
        const numeros = medida.match(/\d+/g);
        if (!numeros) return [0, 0];
        if (numeros.length === 1) return [parseInt(numeros[0]), parseInt(numeros[0])];
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
    async generarResumenTarasPDF() {
      // Show loading indicator
      this.$set(this, 'isGeneratingPdf', true);
      this.$set(this, 'pdfType', 'taras');
      
      try {
        const embarqueData = {
          fecha: this.embarque.fecha,
          cargaCon: this.embarque.cargaCon,
          productos: this.embarque.productos,
          clienteCrudos: this.clienteCrudos
        };
        
        console.log('Generando PDF de taras...');
        
        // Use directly imported function
        generarResumenTarasPDF(embarqueData, this.clientesDisponibles);
        
        console.log('PDF de taras generado con éxito');
      } catch (error) {
        console.error('Error al generar PDF de taras:', error);
        alert('Hubo un error al generar el PDF de taras: ' + error.message);
      } finally {
        // Hide loading indicator
        this.$set(this, 'isGeneratingPdf', false);
        this.$set(this, 'pdfType', null);
      }
    },
    onMedidaInput(producto, event) {
      // Eliminar la función trim() para permitir espacios
      const valor = event.target.value.toLowerCase();
      this.productoEditandoId = producto.id;
      
      // Actualizar la medida sin eliminar espacios
      producto.medida = event.target.value;
      
      if (valor) {
        this.sugerenciasMedidas = this.medidasUsadas.filter(m => 
          m.toLowerCase().includes(valor) && 
          m.toLowerCase() !== valor
        );
      } else {
        this.sugerenciasMedidas = [];
      }
      producto.isEditing = true;
      
      // Guardar cambios inmediatamente
      this.actualizarProducto(producto);
    },

    onMedidaBlur(producto) {
      // Dar un pequeño delay antes de ocultar las sugerencias para permitir clicks
      setTimeout(() => {
        this.productoEditandoId = null;
      }, 200);
      
      // Solo quitar la marca de edición si tiene tanto medida como tipo
      // Permitir espacios en la validación
      if (producto.medida && producto.medida.length > 0 && producto.tipo) {
        producto.isEditing = false;
        producto.isNew = false;
      }
    },

    abrirModalNombreAlternativo(producto) {
      this.productoSeleccionado = producto;
      this.nombreAlternativoTemp = producto.nombreAlternativoPDF || producto.medida;
      this.mostrarModalNombreAlternativo = true;
      this.$nextTick(() => {
        this.$refs.nombreAlternativoInput?.focus();
      });
    },

    cerrarModalNombreAlternativo() {
      this.mostrarModalNombreAlternativo = false;
      this.productoSeleccionado = null;
      this.nombreAlternativoTemp = '';
    },

    guardarNombreAlternativo() {
      if (this.productoSeleccionado) {
        // Desactivar temporalmente el guardado automático
        const guardadoActivo = this.guardadoAutomaticoActivo;
        this.guardadoAutomaticoActivo = false;

        // Crear una copia del valor para asegurar que tenemos el valor más reciente
        const nuevoNombre = this.nombreAlternativoTemp.trim();
        
        if (nuevoNombre) {
          // Usar Vue.set para asegurar reactividad
          this.$set(this.productoSeleccionado, 'nombreAlternativoPDF', nuevoNombre);
          
          // Forzar la actualización del producto
          this.actualizarProducto(this.productoSeleccionado);
        } else {
          this.$delete(this.productoSeleccionado, 'nombreAlternativoPDF');
          this.actualizarProducto(this.productoSeleccionado);
        }

        // Esperar a que Vue actualice el DOM
        this.$nextTick(() => {
          // Reactivar el guardado automático
          this.guardadoAutomaticoActivo = guardadoActivo;
          
          // Forzar un guardado inmediato
          this.guardarCambiosEnTiempoReal();
          
          // Cerrar el modal después de asegurarnos que los cambios se guardaron
          this.cerrarModalNombreAlternativo();
        });
      } else {
        this.cerrarModalNombreAlternativo();
      }
    },

    // Asegurarnos de que actualizarProducto maneje correctamente los cambios
    actualizarProducto(producto) {
      const index = this.embarque.productos.findIndex(p => p.id === producto.id);
      if (index !== -1) {
        // Crear una copia profunda del producto
        const productoActualizado = JSON.parse(JSON.stringify(producto));
        // Actualizar el producto en el array
        this.$set(this.embarque.productos, index, productoActualizado);
        
        // Forzar la actualización del componente
        this.$forceUpdate();
      }
    },

    // Agregar estos nuevos métodos
    coincideTarasYBolsas(producto) {
      const totalTarasRegistradas = this.totalTaras(producto);
      const totalTarasReportadas = this.totalTarasReportadas(producto);
      
      // Si no hay taras registradas ni reportadas, retornar false
      if (totalTarasRegistradas === 0 && totalTarasReportadas === 0) {
        return false;
      }
      
      return totalTarasRegistradas === totalTarasReportadas;
    },

    tieneAlgunReporte(producto) {
      return (producto.reporteTaras || []).some(tara => tara) || 
             (producto.reporteBolsas || []).some(bolsa => bolsa);
    },

    calcularTotalLimpioCliente(clienteId) {
      const productos = this.productosPorCliente[clienteId] || [];
      return productos.reduce((total, producto) => total + this.totalTaras(producto), 0);
    },

    calcularKilosLimpioCliente(clienteId) {
      const productos = this.productosPorCliente[clienteId] || [];
      return productos.reduce((total, producto) => {
        if (producto.tipo === 'c/h20') {
          const reporteTaras = producto.reporteTaras || [];
          const reporteBolsas = producto.reporteBolsas || [];
          let sumaTotalKilos = 0;

          for (let i = 0; i < reporteTaras.length; i++) {
            const taras = parseInt(reporteTaras[i]) || 0;
            const bolsa = parseInt(reporteBolsas[i]) || 0;
            sumaTotalKilos += taras * bolsa;
          }

          return total + (sumaTotalKilos * (producto.camaronNeto || 0.65));
        } else {
          return total + this.totalKilos(producto);
        }
      }, 0);
    },

    calcularTotalCrudoCliente(clienteId) {
      const crudos = this.clienteCrudos[clienteId] || [];
      return crudos.reduce((total, crudo) => {
        return total + crudo.items.reduce((itemTotal, item) => {
          return itemTotal + this.calcularTarasCrudos(item);
        }, 0);
      }, 0);
    },

    calcularKilosCrudoCliente(clienteId) {
      const crudos = this.clienteCrudos[clienteId] || [];
      return crudos.reduce((total, crudo) => {
        return total + crudo.items.reduce((itemTotal, item) => {
          return itemTotal + this.calcularKilosCrudos(item);
        }, 0);
      }, 0);
    },

    formatearKilos(kilos) {
      return kilos.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
      });
    },

    // Agregar este nuevo método
    actualizarMedidasUsadas() {
      // Obtener todas las medidas únicas del embarque actual
      const medidas = this.embarque.productos
        .map(p => p.medida)
        .filter(m => m && m.trim()) // Filtrar valores vacíos
        .filter((m, i, arr) => arr.indexOf(m) === i); // Eliminar duplicados
      this.medidasUsadas = medidas;
    },

    // Método para seleccionar una sugerencia
    seleccionarMedida(producto, medida) {
      producto.medida = medida;
      this.productoEditandoId = null;
      this.actualizarProducto(producto);
    },
    async generarResumenEmbarque2() {
      try {
        // Obtener las medidas únicas de los crudos
        const medidasCrudos = new Set();
        Object.values(this.clienteCrudos).forEach(crudos => {
          crudos.forEach(crudo => {
            crudo.items.forEach(item => {
              if (item.talla) {
                medidasCrudos.add(item.talla);
              }
            });
          });
        });

        // Crear el objeto embarque con la información necesaria
        const embarqueData = {
          ...this.embarque,
          crudos: Object.entries(this.clienteCrudos).flatMap(([clienteId, crudos]) => 
            crudos.flatMap(crudo => 
              crudo.items.map(item => {
                const tarasArray = [];
                
                // Agregar taras principales
                if (item.taras) {
                  tarasArray.push(item.taras);
                }
                
                // Agregar sobrante si existe
                if (item.sobrante) {
                  tarasArray.push(item.sobrante);
                }
                
                return {
                  clienteId,
                  medida: item.talla,
                  taras: tarasArray,
                  barco: item.barco
                };
              })
            )
          ),
          medidasCrudos: Array.from(medidasCrudos)
        };

        console.log('Datos del embarque:', embarqueData); // Para depuración
        generarResumenEmbarquePDF(embarqueData, this.productosPorCliente, this.obtenerNombreCliente, this.clientesDisponibles);
      } catch (error) {
        console.error('Error al generar el PDF:', error);
      }
    },
    onTallaCrudoChange(item) {
      // Asegurarse de que el item tenga todas las propiedades necesarias
      if (!item.medida) {
        item.medida = item.talla;
      }
      this.guardarCambiosEnTiempoReal();
    },
    abrirModalAlt(item) {
      event?.preventDefault();
      event?.stopPropagation();
      
      this.itemSeleccionado = item;
      this.altTemp = item.textoAlternativo || '';
      this.mostrarModalAlt = true;
      this.$nextTick(() => {
        this.$refs.altInput?.focus();
      });
    },
    cerrarModalAlt() {
      event?.preventDefault();
      event?.stopPropagation();
      
      this.mostrarModalAlt = false;
      this.itemSeleccionado = null;
      this.altTemp = '';
    },
    guardarAlt() {
      event?.preventDefault();
      event?.stopPropagation();
      
      if (this.itemSeleccionado) {
        const alt = this.altTemp.trim();
        if (alt) {
          this.itemSeleccionado.textoAlternativo = alt;
        } else {
          delete this.itemSeleccionado.textoAlternativo;
        }
        this.guardarCambiosEnTiempoReal();
      }
      this.cerrarModalAlt();
    },
    async escucharUsuariosActivos() {
      try {
        console.log('Iniciando escucha de usuarios activos');
        const statusRef = ref(rtdb, 'status');
        
        // Primero, asegurarse de que el usuario actual esté marcado como activo
        if (this.authStore.isLoggedIn && this.authStore.user) {
          console.log('Usuario autenticado:', this.authStore.user.username);
          const userStatusRef = ref(rtdb, `status/${this.authStore.userId}`);
          
          try {
            await set(userStatusRef, {
              username: this.authStore.user.username,
              status: 'online',
              lastSeen: new Date().toISOString()
            });
            console.log('Estado del usuario actualizado correctamente');
          } catch (error) {
            console.error('Error al actualizar estado del usuario:', error);
          }
        } else {
          console.log('Usuario no autenticado');
        }

        // Luego, escuchar cambios en los usuarios activos
        this.unsubscribeUsuarios = onValue(statusRef, (snapshot) => {
          const usuarios = [];
          console.log('Recibiendo actualización de usuarios activos');
          
          snapshot.forEach((childSnapshot) => {
            const usuario = childSnapshot.val();
            console.log('Usuario encontrado:', usuario);
            
            // Solo agregar usuarios que tengan datos válidos
            if (usuario && usuario.username) {
              usuarios.push({
                userId: childSnapshot.key,
                username: usuario.username,
                status: usuario.status || 'online',
                lastSeen: usuario.lastSeen
              });
            }
          });

          console.log('Total usuarios activos:', usuarios.length);
          this.usuariosActivos = usuarios;
        }, (error) => {
          console.error('Error al escuchar usuarios activos:', error);
        });
      } catch (error) {
        console.error('Error al iniciar escucha de usuarios:', error);
      }
    },

    async iniciarPresenciaUsuario() {
      try {
        if (!this.authStore.isLoggedIn || !this.authStore.user) {
          console.log('Usuario no autenticado');
          return;
        }

        console.log('Iniciando presencia para usuario:', this.authStore.user.username);
        const userStatusRef = ref(rtdb, `status/${this.authStore.userId}`);
        
        // Configurar limpieza al desconectar
        await onDisconnect(userStatusRef).remove();
        
        // Establecer estado inicial
        await set(userStatusRef, {
          username: this.authStore.user.username,
          status: 'online',
          lastSeen: new Date().toISOString()
        });

        console.log('Presencia iniciada exitosamente');
      } catch (error) {
        console.error('Error al iniciar presencia:', error.message, error.stack);
      }
    },
    calcularPosicionSticky(clienteId) {
      const clientes = Object.keys(this.productosPorCliente);
      const index = clientes.indexOf(clienteId.toString());
      
      if (index === 0) return 0;
      
      let offset = 0;
      for (let i = 0; i < index; i++) {
        const prevClienteId = clientes[i];
        const headerHeight = this.$el.querySelector(`[data-cliente="${this.obtenerNombreCliente(prevClienteId)}"]`)?.offsetHeight || 0;
        offset += headerHeight;
      }
      
      return offset;
    },
    calcularAlturaCliente(productos = [], crudos = []) {
      try {
        // Altura base para el header del cliente
        let altura = 40;

        // Altura para la tabla de productos
        if (Array.isArray(productos) && productos.length > 0) {
          altura += 30; // Header de la tabla
          altura += productos.length * 25; // Cada fila de producto
        }

        // Altura para la tabla de crudos
        if (Array.isArray(crudos) && crudos.length > 0) {
          altura += 30; // Header de la tabla
          altura += crudos.reduce((total, crudo) => {
            if (crudo && Array.isArray(crudo.items)) {
              return total + (crudo.items.length * 25); // Cada fila de crudo
            }
            return total;
          }, 0);
        }

        // Margen entre clientes
        altura += 20;

        return altura;
      } catch (error) {
        console.error('Error en calcularAlturaCliente:', error);
        return 60; // Retornar altura base en caso de error
      }
    },
    toggleBloqueo() {
      this.embarqueBloqueado = !this.embarqueBloqueado;
      
      // Guardar el estado en Firebase si estamos en modo edición
      if (this.modoEdicion && this.embarqueId) {
        const db = getFirestore();
        updateDoc(doc(db, "embarques", this.embarqueId), {
          embarqueBloqueado: this.embarqueBloqueado
        }).catch(error => {
          console.error("Error al guardar estado de bloqueo:", error);
        });
      }
    },
    seleccionarCliente(clienteId) {
      // Verificar si ya existe el embarque, si no, crear uno
      if (!this.embarque.fecha) {
        alert('Por favor, seleccione una fecha para el embarque.');
        return;
      }

      // Verificar si el cliente ya existe en el embarque
      const clienteExiste = this.embarque.productos.some(p => p.clienteId.toString() === clienteId.toString());
      
      if (!clienteExiste) {
        // Si el cliente no existe, lo agregamos
        this.guardarEmbarqueInicial(clienteId).then(() => {
          // Establecer el cliente activo
          this.clienteActivo = clienteId;
        });
      } else {
        // Si el cliente ya existe, simplemente lo establecemos como activo
        this.clienteActivo = clienteId;
      }
    },
    scrollToCliente(clienteId) {
      // Buscar el elemento del cliente y hacer scroll hasta él
      this.$nextTick(() => {
        const clienteHeader = document.querySelector(`.cliente-header[data-cliente="${this.obtenerNombreCliente(clienteId)}"]`);
        if (clienteHeader) {
          // Eliminar la clase de resaltado de todos los headers de cliente
          document.querySelectorAll('.cliente-header').forEach(header => {
            header.classList.remove('cliente-seleccionado');
          });
          
          // Agregar la clase de resaltado al cliente seleccionado
          clienteHeader.classList.add('cliente-seleccionado');
          
          // Hacer scroll al cliente
          clienteHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
          
          // Quitar la clase después de 2 segundos
          setTimeout(() => {
            clienteHeader.classList.remove('cliente-seleccionado');
          }, 2000);
        }
      });
    },
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    },
    cerrarModalNuevoCliente() {
      this.mostrarModalNuevoCliente = false;
      this.nuevoClienteNombre = '';
      this.nuevoClienteColor = '#007bff';
    },
    agregarNuevoCliente() {
      if (this.nuevoClienteNombre.trim() === '') {
        alert('Por favor, ingrese un nombre para el nuevo cliente.');
        return;
      }

      const nuevoCliente = {
        id: Date.now().toString(), // Convertir a string para mantener consistencia con los IDs existentes
        nombre: this.nuevoClienteNombre,
        color: this.nuevoClienteColor,
        editable: true,
        personalizado: true,
        key: `personalizado_${Date.now()}`
      };

      // Agregar a la lista de clientes personalizados
      this.clientesPersonalizados.push(nuevoCliente);
      
      // Crear un producto para este cliente en el embarque actual
      const nuevoProducto = {
        id: Date.now(),
        clienteId: nuevoCliente.id,
        medida: '',
        tipo: '',
        tipoPersonalizado: '',
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
        noSumarKilos: false
      };
      
      // Agregar el producto al embarque
      this.embarque.productos.push(nuevoProducto);
      
      // Guardar los cambios
      this.guardarClientesPersonalizados();
      this.guardarCambiosEnTiempoReal();
      this.cerrarModalNuevoCliente();
      
      // Seleccionar automáticamente el cliente recién creado
      this.seleccionarCliente(nuevoCliente.id);
    },
    guardarClientesPersonalizados() {
      localStorage.setItem('clientesPersonalizados', JSON.stringify(this.clientesPersonalizados));
    },
    cargarClientesPersonalizados() {
      const clientesGuardados = localStorage.getItem('clientesPersonalizados');
      if (clientesGuardados) {
        // Solo cargar la lista de clientes personalizados disponibles
        // pero no agregarlos automáticamente al embarque
        this.clientesPersonalizados = JSON.parse(clientesGuardados);
        console.log('Clientes personalizados disponibles cargados:', this.clientesPersonalizados);
      }
    },
    obtenerColorCliente(nombreCliente) {
      const nombreNormalizado = nombreCliente.toLowerCase();
      if (nombreNormalizado.includes('joselito')) {
        return '#3498db'; // Azul para Joselito
      } else if (nombreNormalizado.includes('catarro')) {
        return '#e74c3c'; // Rojo para Catarro
      } else if (nombreNormalizado.includes('otilio')) {
        return '#f1c40f'; // Amarillo para Otilio
      } else if (nombreNormalizado.includes('ozuna')) {
        return '#2ecc71'; // Verde para Ozuna
      }
      return '#95a5a6'; // Color gris para otros clientes personalizados
    },
    obtenerColorTextoCliente(nombreCliente) {
      const nombreNormalizado = nombreCliente.toLowerCase();
      if (nombreNormalizado.includes('otilio')) {
        return 'black'; // Texto negro para Otilio (fondo amarillo)
      }
      return 'white'; // Texto blanco para el resto
    },
    // Agregar nuevo método para crear cuenta de Joselito
    async crearCuentaJoselito(embarqueCliente, clienteProductos, clienteCrudos) {
      // Mostrar indicador de carga
      this.$set(this, 'isCreatingAccount', true);
      
      try {
        // Importar funciones necesarias de Firebase
        const { collection, query, where, getDocs, addDoc, orderBy, limit } = await import('firebase/firestore');
        const { db } = await import('@/firebase');
        
        // Verificar si ya existe una cuenta para esta fecha
        const fechaEmbarque = new Date(embarqueCliente.fecha);
        const fechaFormateada = fechaEmbarque.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        
        const cuentasRef = collection(db, 'cuentasJoselito');
        const q = query(cuentasRef, where('fecha', '==', fechaFormateada));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          console.log('Ya existe una cuenta para Joselito en esta fecha');
          alert('Ya existe una cuenta para Joselito en esta fecha');
          return;
        }
        
        // Obtener los precios actuales para Joselito
        const preciosRef = collection(db, 'precios');
        const qPrecios = query(preciosRef, orderBy('fecha', 'desc'));
        const preciosSnapshot = await getDocs(qPrecios);
        
        // Crear un mapa para organizar los precios por producto
        const preciosMap = new Map();
        
        preciosSnapshot.docs.forEach(doc => {
          const precio = doc.data();
          // Dar prioridad a los precios específicos de Joselito
          const clave = precio.producto.toLowerCase();
          
          // Si ya existe un precio para este producto y es específico de Joselito, no lo sobrescribimos
          if (preciosMap.has(clave) && preciosMap.get(clave).clienteId === 'joselito') {
            return;
          }
          
          // Si es un precio específico de Joselito o no hay precio específico para este producto
          if (precio.clienteId === 'joselito' || !preciosMap.has(clave)) {
            preciosMap.set(clave, {
              precio: precio.precio,
              clienteId: precio.clienteId
            });
          }
        });
        
        console.log('Precios obtenidos:', preciosMap);
        
        // Preparar los items para la cuenta de Joselito
        const items = clienteProductos.map(producto => {
          // Calcular kilos totales considerando la resta de taras
          let kilos = 0;
          
          if (producto.tipo && producto.tipo.toLowerCase() === 'c/h20') {
            // Para productos c/h20, usar la función calcularKilosProductoCH20
            kilos = this.calcularKilosProductoCH20(producto);
            console.log(`Cuenta Joselito - Usando calcularKilosProductoCH20 para ${producto.medida}: ${kilos} kg`);
          } else {
            // Para otros productos, mantener el cálculo original
            kilos = (producto.kilos || []).reduce((sum, kilo) => sum + (Number(kilo) || 0), 0);
            
            // Restar taras si está seleccionado el checkbox
            if (producto.restarTaras) {
              const sumaTaras = (producto.taras || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
              kilos -= sumaTaras * 3; // Restar 3 kg por cada tara
            }
            
            // Lógica especial para productos s/h2o o s/h20 para cliente Catarro
            if (!producto.noSumarKilos && 
                (producto.tipo.toLowerCase().includes('s/h2o') || 
                 producto.tipo.toLowerCase().includes('s/h20'))) {
              // Verificar si el cliente es Catarro
              const clienteInfo = this.clientesDisponibles.find(c => c.id.toString() === producto.clienteId.toString());
              if (clienteInfo && clienteInfo.nombre.toLowerCase().includes('catarro')) {
                kilos += 1; // Sumar 1 kg para Catarro con productos s/h2o o s/h20
              }
            }
          }
          
          // Buscar el precio actual para este producto
          let precioVenta = producto.precio || 0;
          const medidaNormalizada = producto.medida.toLowerCase();
          
          // Intentar encontrar un precio exacto para la medida
          if (preciosMap.has(medidaNormalizada)) {
            precioVenta = preciosMap.get(medidaNormalizada).precio;
          } else {
            // Si no hay precio exacto, buscar por coincidencia parcial
            for (const [clave, datosPrecio] of preciosMap.entries()) {
              if (medidaNormalizada.includes(clave) || clave.includes(medidaNormalizada)) {
                precioVenta = datosPrecio.precio;
                break;
              }
            }
          }
          
          return {
            kilos: Number(kilos.toFixed(1)), // Redondear a 1 decimal
            medida: producto.medida,
            costo: 1, // Costo por defecto es 1
            precioVenta, // Usar el precio obtenido como precio de venta
            total: Number((kilos * 1).toFixed(2)) // Total basado en costo = 1
          };
        });
        
        // Agregar items de productos crudos si existen
        if (clienteCrudos && clienteCrudos.length > 0) {
          clienteCrudos.forEach(crudo => {
            crudo.items.forEach(item => {
              // Calcular kilos para productos crudos
              let kilosTotales = 0;
              let kilosCostos = 0;
              
              // Verificar si el producto crudo es de tipo c/h20
              const esTipoConAgua = item.tipo && item.tipo.toLowerCase() === 'c/h20';
              
              // Procesar taras
              if (item.taras) {
                // Verificar si la tara tiene formato "5-19" o similar
                const formatoGuion = /^(\d+)-(\d+)$/.exec(item.taras);
                if (formatoGuion) {
                  const cantidad = parseInt(formatoGuion[1]) || 0;
                  let peso = parseInt(formatoGuion[2]) || 0;
                  
                  // Guardar el peso original para la tabla de costos
                  const pesoOriginal = peso;
                  
                  // Si el peso es 19, sustituirlo por 20 solo para el cálculo de venta
                  if (peso === 19) {
                    peso = 20;
                    console.log(`Cuenta Joselito - Ajustando tara de formato ${item.taras} a ${cantidad}-${peso} para cálculo de venta`);
                  }
                  
                  // Calcular kilos totales con el peso ajustado (para la tabla de venta)
                  kilosTotales += cantidad * peso;
                  
                  // Calcular kilos para la tabla de costos con el peso original
                  kilosCostos += cantidad * pesoOriginal;
                } else {
                  // Formato original si no coincide con el patrón
                  const [cantidad, peso] = item.taras.split('-').map(Number);
                  kilosTotales += cantidad * peso;
                  kilosCostos += cantidad * peso;
                }
              }
              
              // Procesar sobrante
              if (item.sobrante) {
                // Verificar si el sobrante tiene formato "5-19" o similar
                const formatoGuion = /^(\d+)-(\d+)$/.exec(item.sobrante);
                if (formatoGuion) {
                  const cantidadSobrante = parseInt(formatoGuion[1]) || 0;
                  let pesoSobrante = parseInt(formatoGuion[2]) || 0;
                  
                  // Guardar el peso original para la tabla de costos
                  const pesoSobranteOriginal = pesoSobrante;
                  
                  // Si el peso es 19, sustituirlo por 20 solo para el cálculo de venta
                  if (pesoSobrante === 19) {
                    pesoSobrante = 20;
                    console.log(`Cuenta Joselito - Ajustando sobrante de formato ${item.sobrante} a ${cantidadSobrante}-${pesoSobrante} para cálculo de venta`);
                  }
                  
                  // Calcular kilos totales con el peso ajustado (para la tabla de venta)
                  kilosTotales += cantidadSobrante * pesoSobrante;
                  
                  // Calcular kilos para la tabla de costos con el peso original
                  kilosCostos += cantidadSobrante * pesoSobranteOriginal;
                } else {
                  // Formato original si no coincide con el patrón
                  const [cantidadSobrante, pesoSobrante] = item.sobrante.split('-').map(Number);
                  kilosTotales += cantidadSobrante * pesoSobrante;
                  kilosCostos += cantidadSobrante * pesoSobrante;
                }
              }
              
              // Si es tipo c/h20, multiplicar por el valor neto
              if (esTipoConAgua) {
                kilosTotales = kilosTotales * (item.camaronNeto || 0.65);
                kilosCostos = kilosCostos * (item.camaronNeto || 0.65);
              }
              
              // Buscar el precio actual para este producto crudo
              let precioVenta = item.precio || 0;
              const medidaNormalizada = `${item.talla} (crudo)`.toLowerCase();
              
              // Intentar encontrar un precio exacto para la medida
              if (preciosMap.has(medidaNormalizada)) {
                precioVenta = preciosMap.get(medidaNormalizada).precio;
              } else {
                // Si no hay precio exacto, buscar por coincidencia parcial
                for (const [clave, datosPrecio] of preciosMap.entries()) {
                  if ((clave.includes(item.talla.toLowerCase()) && clave.includes('crudo')) || 
                      (medidaNormalizada.includes(clave))) {
                    precioVenta = datosPrecio.precio;
                    break;
                  }
                }
              }
              
              // Agregar a la lista de items
              items.push({
                kilos: Number(kilosCostos.toFixed(1)), // Redondear a 1 decimal
                medida: `${item.talla} (crudo)`,
                costo: 1, // Costo por defecto es 1
                precioVenta, // Usar el precio obtenido como precio de venta
                total: Number((kilosCostos * 1).toFixed(2)), // Total basado en costo = 1
                kilosVenta: Number(kilosTotales.toFixed(1)), // Kilos para la tabla de venta
                totalVenta: Number((kilosTotales * precioVenta).toFixed(2)) // Total de venta
              });
            });
          });
        }
        
        // Verificar si hay items para crear la cuenta
        if (items.length === 0) {
          alert('No hay productos para crear la cuenta de Joselito');
          return;
        }
        
        // Calcular el total general
        const totalGeneral = Number(items.reduce((sum, item) => sum + item.total, 0).toFixed(2));
        
        // Calcular el total general de venta
        const totalGeneralVenta = Number(items.reduce((sum, item) => {
          // Si el item tiene kilosVenta, usar ese valor, de lo contrario usar kilos
          const kilosParaVenta = item.kilosVenta || item.kilos;
          return sum + (kilosParaVenta * item.precioVenta);
        }, 0).toFixed(2));
        
        // Calcular la ganancia del día
        const gananciaDelDia = Number((totalGeneralVenta - totalGeneral).toFixed(2));
        
        // Obtener el saldo acumulado anterior
        let saldoAcumuladoAnterior = 0;
        
        // Buscar la cuenta más reciente anterior a la fecha actual
        const qCuentaAnterior = query(
          cuentasRef,
          where('fecha', '<', fechaFormateada),
          orderBy('fecha', 'desc'),
          limit(1)
        );
        
        const cuentasAnteriores = await getDocs(qCuentaAnterior);
        
        if (!cuentasAnteriores.empty) {
          const cuentaAnterior = cuentasAnteriores.docs[0].data();
          saldoAcumuladoAnterior = cuentaAnterior.nuevoSaldoAcumulado || 0;
          console.log(`Saldo acumulado anterior encontrado: ${saldoAcumuladoAnterior}`);
        } else {
          console.log('No se encontraron cuentas anteriores, usando saldo 0');
        }
        
        // Calcular el nuevo saldo acumulado
        const nuevoSaldoAcumulado = saldoAcumuladoAnterior + totalGeneral;
        
        // Crear la estructura de la cuenta
        const cuentaData = {
          fecha: fechaFormateada,
          items: items,
          itemsVenta: items.map(item => ({
            kilosVenta: item.kilosVenta || item.kilos,
            medida: item.medida,
            precioVenta: item.precioVenta,
            totalVenta: item.totalVenta || Number((item.kilos * item.precioVenta).toFixed(2)),
            ganancia: Number(((item.kilosVenta || item.kilos) * item.precioVenta - item.total).toFixed(2))
          })),
          saldoAcumuladoAnterior: saldoAcumuladoAnterior,
          cobros: [],
          abonos: [],
          totalGeneral: totalGeneral,
          totalGeneralVenta: totalGeneralVenta,
          totalDia: totalGeneralVenta, // Total del día es igual al total general de venta en este caso
          nuevoSaldoAcumulado: nuevoSaldoAcumulado,
          gananciaDelDia: gananciaDelDia, // Ganancia calculada
          estadoPagado: false,
          tieneObservacion: true,
          observacion: `Cuenta creada manualmente desde embarque del ${fechaFormateada}. Carga con: ${embarqueCliente.cargaCon || 'No especificado'}`,
          ultimaActualizacion: new Date().toISOString()
        };
        
        // Crear la cuenta en Firestore
        const docRef = await addDoc(cuentasRef, cuentaData);
        console.log('Cuenta de Joselito creada con ID:', docRef.id);
        
        // Contar cuántos productos tienen precios actualizados
        const productosConPrecioActualizado = items.filter(item => item.precioVenta > 0).length;
        
        // Mostrar alerta al usuario con información detallada
        alert(`Se ha creado la cuenta para Joselito con fecha ${fechaFormateada}\n\n` +
              `Total de productos: ${items.length}\n` +
              `Productos con precio actualizado: ${productosConPrecioActualizado}\n` +
              `Total costo: $${totalGeneral.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n` +
              `Total venta: $${totalGeneralVenta.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n` +
              `Ganancia: $${gananciaDelDia.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
        
        // Registrar información detallada para depuración
        console.log('Detalles de la cuenta creada:', {
          fecha: fechaFormateada,
          items: items,
          totalGeneral: totalGeneral,
          totalGeneralVenta: totalGeneralVenta,
          gananciaDelDia: gananciaDelDia,
          saldoAcumuladoAnterior: saldoAcumuladoAnterior,
          nuevoSaldoAcumulado: nuevoSaldoAcumulado
        });
        
        return docRef.id;
      } catch (error) {
        console.error('Error al crear cuenta para Joselito:', error);
        // Mostrar alerta de error
        alert(`No se pudo crear la cuenta para Joselito: ${error.message}`);
      } finally {
        // Ocultar indicador de carga
        this.$set(this, 'isCreatingAccount', false);
      }
    },
    // Agregar método para verificar si el cliente es Joselito
    esClienteJoselito(clienteId) {
      const clienteInfo = this.clientesDisponibles.find(c => c.id.toString() === clienteId.toString());
      return clienteInfo && clienteInfo.nombre.toLowerCase().includes('joselito');
    },
    
    // Agregar método para verificar si el cliente es Catarro
    esClienteCatarro(clienteId) {
      const clienteInfo = this.clientesDisponibles.find(c => c.id.toString() === clienteId.toString());
      return clienteInfo && clienteInfo.nombre.toLowerCase().includes('catarro');
    },
    
    // Agregar método para obtener el embarque del cliente
    obtenerEmbarqueCliente(clienteId) {
      const clienteProductos = this.productosPorCliente[clienteId];
      const clienteCrudos = this.clienteCrudos[clienteId];
      
      return {
        fecha: this.embarque.fecha,
        cargaCon: this.embarque.cargaCon,
        productos: clienteProductos,
        clienteCrudos: { [clienteId]: clienteCrudos },
        kilosCrudos: this.embarque.kilosCrudos || {}
      };
    },
    // Método para crear cuenta de Catarro
    async crearCuentaCatarro(embarqueCliente, clienteProductos, clienteCrudos) {
      // Mostrar indicador de carga
      this.$set(this, 'isCreatingAccount', true);
      
      try {
        // Importar funciones necesarias de Firebase
        const { collection, query, where, getDocs, addDoc, orderBy, limit } = await import('firebase/firestore');
        const { db } = await import('@/firebase');
        
        // Verificar si ya existe una cuenta para esta fecha
        const fechaEmbarque = new Date(embarqueCliente.fecha);
        const fechaFormateada = fechaEmbarque.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        
        const cuentasRef = collection(db, 'cuentasCatarro');
        const q = query(cuentasRef, where('fecha', '==', fechaFormateada));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          console.log('Ya existe una cuenta para Catarro en esta fecha');
          alert('Ya existe una cuenta para Catarro en esta fecha');
          return;
        }
        
        // Obtener los precios actuales para Catarro
        const preciosRef = collection(db, 'precios');
        const qPrecios = query(preciosRef, orderBy('fecha', 'desc'));
        const preciosSnapshot = await getDocs(qPrecios);
        
        // Crear un mapa para organizar los precios por producto
        const preciosMap = new Map();
        
        preciosSnapshot.docs.forEach(doc => {
          const precio = doc.data();
          const clave = precio.producto.toLowerCase();
          
          // Si ya existe un precio para este producto y es específico de Catarro, no lo sobrescribimos
          if (preciosMap.has(clave) && preciosMap.get(clave).clienteId === 'catarro') {
            return;
          }
          
          // Si es un precio específico de Catarro o no hay precio específico para este producto
          if (precio.clienteId === 'catarro' || !preciosMap.has(clave)) {
            preciosMap.set(clave, {
              precio: precio.precio,
              clienteId: precio.clienteId
            });
          }
        });
        
        console.log('Precios obtenidos:', preciosMap);
        
        // Preparar los items para la cuenta de Catarro
        const items = clienteProductos.map(producto => {
          // Calcular kilos totales considerando la resta de taras
          let kilos = 0;
          
          if (producto.tipo && producto.tipo.toLowerCase() === 'c/h20') {
            // Para productos c/h20, usar la función calcularKilosProductoCH20
            kilos = this.calcularKilosProductoCH20(producto);
            console.log(`Cuenta Catarro - Usando calcularKilosProductoCH20 para ${producto.medida}: ${kilos} kg`);
          } else {
            // Para otros productos, mantener el cálculo original
            kilos = (producto.kilos || []).reduce((sum, kilo) => sum + (Number(kilo) || 0), 0);
            
            // Restar taras si está seleccionado el checkbox
            if (producto.restarTaras) {
              const sumaTaras = (producto.taras || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
              kilos -= sumaTaras * 3; // Restar 3 kg por cada tara
            }
            
            // Lógica especial para productos s/h2o o s/h20 para Catarro
            if (!producto.noSumarKilos && 
                (producto.tipo.toLowerCase().includes('s/h2o') || 
                 producto.tipo.toLowerCase().includes('s/h20'))) {
              kilos += 1; // Sumar 1 kg para Catarro con productos s/h2o o s/h20
            }
          }
          
          // Buscar el precio actual para este producto
          let precioVenta = producto.precio || 0;
          const medidaNormalizada = producto.medida.toLowerCase();
          
          // Intentar encontrar un precio exacto para la medida
          if (preciosMap.has(medidaNormalizada)) {
            precioVenta = preciosMap.get(medidaNormalizada).precio;
          } else {
            // Si no hay precio exacto, buscar por coincidencia parcial
            for (const [clave, datosPrecio] of preciosMap.entries()) {
              if (medidaNormalizada.includes(clave) || clave.includes(medidaNormalizada)) {
                precioVenta = datosPrecio.precio;
                break;
              }
            }
          }
          
          return {
            kilos: Number(kilos.toFixed(1)), // Redondear a 1 decimal
            medida: producto.medida,
            costo: 1, // Costo por defecto es 1
            precioVenta, // Usar el precio obtenido como precio de venta
            total: Number((kilos * 1).toFixed(2)) // Total basado en costo = 1
          };
        });
        
        // Agregar items de productos crudos si existen
        if (clienteCrudos && clienteCrudos.length > 0) {
          clienteCrudos.forEach(crudo => {
            crudo.items.forEach(item => {
              // Calcular kilos para productos crudos
              let kilosTotales = 0;
              let kilosCostos = 0;
              
              // Verificar si el producto crudo es de tipo c/h20
              const esTipoConAgua = item.tipo && item.tipo.toLowerCase() === 'c/h20';
              
              // Procesar taras
              if (item.taras) {
                // Verificar si la tara tiene formato "5-19" o similar
                const formatoGuion = /^(\d+)-(\d+)$/.exec(item.taras);
                if (formatoGuion) {
                  const cantidad = parseInt(formatoGuion[1]) || 0;
                  let peso = parseInt(formatoGuion[2]) || 0;
                  
                  // Para Catarro, no se hace el ajuste de 19 a 20 kg
                  kilosTotales += cantidad * peso;
                  kilosCostos += cantidad * peso;
                } else {
                  // Formato original si no coincide con el patrón
                  const [cantidad, peso] = item.taras.split('-').map(Number);
                  kilosTotales += cantidad * peso;
                  kilosCostos += cantidad * peso;
                }
              }
              
              // Procesar sobrante
              if (item.sobrante) {
                const [cantidadSobrante, pesoSobrante] = item.sobrante.split('-').map(Number);
                kilosTotales += cantidadSobrante * pesoSobrante;
                kilosCostos += cantidadSobrante * pesoSobrante;
              }
              
              // Si es tipo c/h20, multiplicar por el valor neto
              if (esTipoConAgua) {
                kilosTotales = kilosTotales * (item.camaronNeto || 0.65);
                kilosCostos = kilosCostos * (item.camaronNeto || 0.65);
              }
              
              // Buscar el precio actual para este producto crudo
              let precioVenta = item.precio || 0;
              const medidaNormalizada = `${item.talla} (crudo)`.toLowerCase();
              
              // Intentar encontrar un precio exacto para la medida
              if (preciosMap.has(medidaNormalizada)) {
                precioVenta = preciosMap.get(medidaNormalizada).precio;
              } else {
                // Si no hay precio exacto, buscar por coincidencia parcial
                for (const [clave, datosPrecio] of preciosMap.entries()) {
                  if ((clave.includes(item.talla.toLowerCase()) && clave.includes('crudo')) || 
                      (medidaNormalizada.includes(clave))) {
                    precioVenta = datosPrecio.precio;
                    break;
                  }
                }
              }
              
              // Agregar a la lista de items
              items.push({
                kilos: Number(kilosCostos.toFixed(1)), // Redondear a 1 decimal
                medida: `${item.talla} (crudo)`,
                costo: 1, // Costo por defecto es 1
                precioVenta, // Usar el precio obtenido como precio de venta
                total: Number((kilosCostos * 1).toFixed(2)), // Total basado en costo = 1
                kilosVenta: Number(kilosTotales.toFixed(1)), // Kilos para la tabla de venta
                totalVenta: Number((kilosTotales * precioVenta).toFixed(2)) // Total de venta
              });
            });
          });
        }
        
        // Verificar si hay items para crear la cuenta
        if (items.length === 0) {
          alert('No hay productos para crear la cuenta de Catarro');
          return;
        }
        
        // Calcular totales
        const totalGeneral = items.reduce((sum, item) => sum + item.total, 0);
        const totalGeneralVenta = items.reduce((sum, item) => {
          const totalVenta = (item.kilosVenta || item.kilos) * item.precioVenta;
          return sum + totalVenta;
        }, 0);
        const gananciaDelDia = totalGeneralVenta - totalGeneral;
        
        // Obtener el saldo acumulado anterior
        let saldoAcumuladoAnterior = 0;
        const qCuentaAnterior = query(
          cuentasRef,
          where('fecha', '<', fechaFormateada),
          orderBy('fecha', 'desc'),
          limit(1)
        );
        
        const cuentasAnteriores = await getDocs(qCuentaAnterior);
        
        if (!cuentasAnteriores.empty) {
          const cuentaAnterior = cuentasAnteriores.docs[0].data();
          saldoAcumuladoAnterior = cuentaAnterior.nuevoSaldoAcumulado || 0;
          console.log(`Saldo acumulado anterior encontrado: ${saldoAcumuladoAnterior}`);
        } else {
          console.log('No se encontraron cuentas anteriores, usando saldo 0');
        }
        
        // Calcular el nuevo saldo acumulado
        const nuevoSaldoAcumulado = saldoAcumuladoAnterior + totalGeneralVenta;
        
        // Crear la estructura de la cuenta
        const cuentaData = {
          fecha: fechaFormateada,
          items: items,
          itemsVenta: items.map(item => ({
            kilosVenta: item.kilosVenta || item.kilos,
            medida: item.medida,
            precioVenta: item.precioVenta,
            totalVenta: item.totalVenta || Number((item.kilos * item.precioVenta).toFixed(2)),
            ganancia: Number(((item.kilosVenta || item.kilos) * item.precioVenta - item.total).toFixed(2))
          })),
          saldoAcumuladoAnterior: saldoAcumuladoAnterior,
          cobros: [],
          abonos: [],
          totalGeneral: totalGeneral,
          totalGeneralVenta: totalGeneralVenta,
          totalDia: totalGeneralVenta,
          nuevoSaldoAcumulado: nuevoSaldoAcumulado,
          gananciaDelDia: gananciaDelDia,
          estadoPagado: false,
          tieneObservacion: true,
          observacion: `Cuenta creada manualmente desde embarque del ${fechaFormateada}. Carga con: ${embarqueCliente.cargaCon || 'No especificado'}`,
          ultimaActualizacion: new Date().toISOString()
        };
        
        // Crear la cuenta en Firestore
        const docRef = await addDoc(cuentasRef, cuentaData);
        console.log('Cuenta de Catarro creada con ID:', docRef.id);
        
        // Contar cuántos productos tienen precios actualizados
        const productosConPrecioActualizado = items.filter(item => item.precioVenta > 0).length;
        
        // Mostrar alerta al usuario con información detallada
        alert(`Se ha creado la cuenta para Catarro con fecha ${fechaFormateada}\n\n` +
              `Total de productos: ${items.length}\n` +
              `Productos con precio actualizado: ${productosConPrecioActualizado}\n` +
              `Total costo: $${totalGeneral.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n` +
              `Total venta: $${totalGeneralVenta.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n` +
              `Ganancia: $${gananciaDelDia.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
        
        // Registrar información detallada para depuración
        console.log('Detalles de la cuenta creada:', {
          fecha: fechaFormateada,
          items: items,
          totalGeneral: totalGeneral,
          totalGeneralVenta: totalGeneralVenta,
          gananciaDelDia: gananciaDelDia,
          saldoAcumuladoAnterior: saldoAcumuladoAnterior,
          nuevoSaldoAcumulado: nuevoSaldoAcumulado
        });
        
        return docRef.id;
      } catch (error) {
        console.error('Error al crear cuenta para Catarro:', error);
        alert(`No se pudo crear la cuenta para Catarro: ${error.message}`);
      } finally {
        this.$set(this, 'isCreatingAccount', false);
      }
    },
    
    async crearCuentaParaCliente() {
      if (!this.clienteActual) return;
      
      try {
        const embarqueCliente = this.obtenerEmbarqueCliente(this.clienteActual.id);
        const clienteProductos = this.productosPorCliente[this.clienteActual.id] || [];
        const clienteCrudos = this.clienteCrudos[this.clienteActual.id] || [];
        
        if (this.esClienteCatarro(this.clienteActual.id)) {
          await this.crearCuentaCatarro(embarqueCliente, clienteProductos, clienteCrudos);
        }
      } catch (error) {
        console.error('Error al crear cuenta:', error);
        alert('Error al crear la cuenta. Por favor, intente nuevamente.');
      }
    },
  },
  async created() {
    const embarqueId = this.$route.params.id;
    await this.cargarEmbarque(embarqueId);
    this.undoStack.push(JSON.stringify(this.embarque));
    console.log('Component mounted. Estado inicial cargado.');
    this.actualizarMedidasUsadas();
    
    // Cargar clientes personalizados
    this.cargarClientesPersonalizados();
    
    // Iniciar presencia y escucha de usuarios
    await this.iniciarPresenciaUsuario();
    this.escucharUsuariosActivos();
  },
  watch: {
    embarque: {
      handler(nuevoValor) {
        if (this.isUndoRedo) {
          this.isUndoRedo = false;
          return;
        }
        localStorage.setItem('embarque', JSON.stringify(nuevoValor));
        this.undoStack.push(JSON.stringify(nuevoValor));
        this.redoStack = [];
        console.log('Embarque actualizado. Estado agregado al undoStack.');
        
        // Llamar al método de guardado automático
        this.guardarCambiosEnTiempoReal();
      },
      deep: true
    },
    clienteCrudos: {
      handler() {
        this.guardarCambiosEnTiempoReal();
      },
      deep: true
    },
    'embarque.productos': {
      handler(newProductos) {
        newProductos.forEach(producto => {
          console.log('Producto actualizado:', producto.restarTaras);
        });
      },
      deep: true
    }
  },
  mounted() {
    // Agregar este evento para actualizar los crudos cuando se modifiquen los inputs
    this.$nextTick(() => {
      const crudosInputs = document.querySelectorAll('.crudo input, .crudo select');
      crudosInputs.forEach(input => {
        input.addEventListener('input', this.actualizarCrudos);
      });
    });
  },
  beforeDestroy() {
    // Cancelar la suscripción a los cambios en tiempo real
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    // Remover los event listeners cuando el componente se destruye
    const crudosInputs = document.querySelectorAll('.crudo input, .crudo select');
    crudosInputs.forEach(input => {
      input.removeEventListener('input', this.actualizarCrudos);
    });

    // Limpiar escucha cuando el componente se destruye
    if (this.unsubscribeUsuarios) {
      console.log('Limpiando escucha de usuarios activos');
      this.unsubscribeUsuarios();
    }
  },
  updated() {
    console.log('Componente actualizado');
    this.embarque.productos.forEach(producto => {
      console.log('Estado de restarTaras:', producto.restarTaras);
    });
  }
};
</script>

<style scoped>

.totales-reporte {
    background-color: #e2e3ff; /* Azul claro */
    color: #2d31a6; /* Azul oscuro */
    margin-top: 10px;
    font-weight: bold;
    padding: 5px;
    border-radius: 5px;
}
.cliente-header-controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

.juntar-medidas-checkbox {
  display: flex;
  align-items: center;
  gap: 5px;
  background-color: rgba(255, 255, 255, 0.2);
  padding: 5px 10px;
  border-radius: 4px;
}

.juntar-medidas-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.juntar-medidas-checkbox label {
  color: white;
  margin: 0;
  cursor: pointer;
  user-select: none;
}


.resumen-container {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.resumen-columna {
  flex: 1 1 48%;
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .resumen-columna {
    flex: 1 1 100%;
  }
}

.resumen-columna {
  background-color: #ffffff;
  border: 1px solid #ddd;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  flex: 1;
  min-width: 250px;
}



.nuevo-embarque-container {
  position: relative;
  min-height: 100vh;
}

.nuevo-embarque {
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f9f9f9;
  min-height: 100vh;
}

.header {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
}

.header-row {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.fecha-selector, .carga-selector {
  flex: 1;
  min-width: 200px;
}

.botones-undo-redo {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.botones-undo-redo button {
  flex: 1;
  padding: 12px;
  font-size: 1rem;
  border-radius: 5px;
}

.botones-undo-redo button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-control {
  width: 100%;
  padding: 10px;
  font-size: 1rem;
  border-radius: 5px;
  border: 1px solid #ccc;
}

.cliente-grupo {
  background-color: #ffffff;
  border: 1px solid #ddd;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.cliente-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding: 10px 15px;
  border-radius: 10px;
}

.cliente-header h3 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: bold;
}

.cliente-header[data-cliente="Joselito"] {
  background-color: #3498db;
}

.cliente-header[data-cliente="Catarro"] {
  background-color: #e74c3c;
}

.cliente-header[data-cliente="Otilio"] {
  background-color: #f1c40f;
}

.cliente-header[data-cliente="Ozuna"] {
  background-color: #2ecc71;
}

.cliente-header[data-cliente="Joselito"] h3,
.cliente-header[data-cliente="Catarro"] h3,
.cliente-header[data-cliente="Otilio"] h3,
.cliente-header[data-cliente="Ozuna"] h3 {
  color: #ffffff;
}

.cliente-header[data-cliente="Otro"] {
  background-color: #95a5a6;
}

.cliente-header[data-cliente="Otro"] h3 {
  color: #ffffff;
}

.eliminar-cliente {
  padding: 8px 12px;
  font-size: 0.9rem;
}

.productos-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.producto {
  flex: 0 0 calc(50% - 10px); /* Dos productos por fila en escritorio */
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 1rem;
  border: 3px solid #dc3545; /* Contorno para la medida */
  transition: border-color 0.3s ease;
}

.producto:hover, .crudo:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.producto-header {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 15px;
}

.medida-input-container {
  display: flex;
  gap: 8px;
  width: 100%;
  align-items: center;
}

.medida-input {
  flex: 1;
  min-width: 120px;
  padding: 8px;
  font-size: 1.1rem;
  font-weight: bold;
  border: 2px solid #007bff;
  border-radius: 5px;
  background-color: #eceef1;
}

.tipo-select {
  flex: 1;
  min-width: 120px;
  font-weight: bold;
  border: 2px solid #28a745;
  border-radius: 5px;
  background-color: #e8f5e9;
  transition: border-color 0.3s, background-color 0.3s;
  padding: 8px;
  font-size: 1.1rem;
}

.tipo-select.tipo-azul {
  background-color: #d0e7ff;
  border-color: #0056b3;
}

.tipo-select.tipo-verde {
  background-color: #e8f5e9;
  border-color: #28a745;
}

.tipo-select:focus {
  outline: none;
  border-color: #0056b3;
  background-color: #d0e7ff;
}

.tipo-input {
  flex: 2;
  min-width: 120px;
  max-width: 200px;
  padding: 8px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.eliminar-producto {
  padding: 8px 12px;
  font-size: 0.9rem;
  background-color: #dc3545;
  border: none;
  border-radius: 5px;
  color: #fff;
}

.sumas-verticales {
  display: flex;
  flex-direction: row;
  gap: 20px;
  width: 100%;
}

.columna {
  flex: 1;
  min-width: 0;
}

.columna h5 {
  text-align: center;
  font-size: 1.2rem;
  margin-bottom: 10px;
  color: #333;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.tara-input, .kilo-input, .reporte-input {
  flex: 1;
  padding: 8px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.input-group button {
  padding: 8px 12px;
  font-size: 1rem;
  border: none;
  border-radius: 5px;
}

.agregar-tara, .agregar-kilo, .agregar-producto {
  width: 100%;
  padding: 10px;
  font-size: 1rem;
  border-radius: 5px;
}

.agregar-tara, .agregar-kilo {
  background-color: #28a745;
  color: #fff;
}

.agregar-tara:hover, .agregar-kilo:hover {
  background-color: #218838;
}

.agregar-producto {
  background-color: #007bff;
  color: #fff;
}

.agregar-producto:hover {
  background-color: #0056b3;
}

.total {
  font-weight: bold;
  margin-top: 10px;
  border-top: 2px solid #ddd;
  padding-top: 5px;
  color: #333;
  text-align: center;
}

.reporte-taras-bolsas {
  display: flex;
  flex-direction: row; /* Cambiar a row para que estén en la misma fila */
  gap: 15px;
  width: 100%;
  margin-bottom: 20px;
}

.reporte-item {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.reporte-item h5 {
  text-align: center;
  font-size: 1.2rem;
  margin-bottom: 10px;
  color: #333;
}

.reporte-input {
  flex: 1;
  padding: 8px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.cambios {
  background-color: #fff;
  border: 1px solid #ddd;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  margin-top: 30px;
}

.cambios h4 {
  margin-bottom: 10px;
  color: #333;
}

.cambios ul {
  list-style-type: disc;
  padding-left: 20px;
  color: #555;
}

.cliente-selector {
  background-color: #ffffff;
  border: 1px solid #ddd;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.cliente-selector .btn-block {
  width: 100%;
}

.crear-embarque {
  background-color: #28a745;
  color: #fff;
  padding: 15px;
  font-size: 1.2rem;
  border: none;
  border-radius: 5px;
}

.crear-embarque:hover {
  background-color: #218838;
}

.btn {
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-primary {
  background-color: #007bff;
  border: none;
  color: #fff;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  border: none;
  color: #fff;
}

.btn-secondary:hover {
  background-color: #5a6268;
}

.btn-danger {
  background-color: gray;
  border: none;
  color: #fff;
}

.btn-danger:hover {
  background-color: #c82333;
}

.btn-success {
  background-color: #28a745;
  border: none;
  color: #fff;
}

.btn-success:hover {
  background-color: #218838;
}

/* Media Queries para Responsividad en iPad */
@media (min-width: 768px) and (max-width: 1024px) {
  .productos-container {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 20px;
  }

  .producto {
    flex: 0 0 calc(50% - 10px);
    max-width: calc(50% - 10px);
  }

  .reporte-taras-bolsas {
    flex-direction: row;
  }

  .reporte-item {
    flex: 0 0 calc(50% - 10px);
    max-width: calc(50% - 10px);
  }
}

/* Media Queries para Dispositivos Móviles */
@media (max-width: 767px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
  }

  .botones-undo-redo {
    width: 100%;
    gap: 10px;
  }

  .productos-container {
    flex-direction: column;
  }

  .producto {
    width: 100%;
  }

  .sumas-verticales {
    flex-direction: row;
    gap: 10px;
  }

  .reporte-taras-bolsas {
    flex-direction: row; /* Mantener en fila incluso en móvil */
    gap: 10px;
  }

  .reporte-item {
    flex: 1;
    min-width: 0; /* Permitir que los items se reduzcan */
  }

  .reporte-input {
    width: 100%;
    min-width: 0;
    font-size: 14px; /* Reducir tamaño de fuente para mejor ajuste */
  }

  .reporte-item h5 {
    font-size: 1rem; /* Reducir tamaño del título */
    margin-bottom: 8px;
  }

  .input-group {
    margin-bottom: 5px; /* Reducir espacio entre inputs */
  }

  .input-group button {
    padding: 4px 8px; /* Reducir padding de botones */
    font-size: 12px;
  }

  .total-taras-reporte,
  .total-bolsas-reporte {
    font-size: 0.9rem; /* Reducir tamaño del texto del total */
    padding: 3px;
    margin-top: 10px;
    font-weight: bold;
    padding: 5px;
    border-radius: 5px;
  }


  .cliente-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .eliminar-cliente, .eliminar-producto {
    width: 100%;
    text-align: center;
  }

  .agregar-tara, .agregar-kilo, .agregar-producto, .crear-embarque {
    font-size: 1rem;
    padding: 12px;
  }
}

/* Añadir esta media query al final de la sección <style> */

@media (min-width: 1025px) {
  .productos-container {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 20px;
  }

  .producto {
    flex: 0 0 calc(25% - 15px); /* Cuatro por fila con espacio */
    max-width: calc(25% - 15px);
  }

  .reporte-taras-bolsas {
    flex-direction: row;
  }

  .reporte-item {
    flex: 0 0 calc(50% - 10px);
    max-width: calc(50% - 10px);
  }
}

.crudo-header {
  text-align: center;
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 15px;
  color: #007bff
}

.encabezado-medida {
  display: flex;
  align-items: flex-start; /* Cambiado a flex-start para mejor alineación con las dos filas */
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 15px;
  gap: 8px;
}

/* Opcional: Ajustes para dispositivos móviles */
@media (max-width: 767px) {
  .encabezado-medida {
    font-size: 1.2rem;
  }
}

.generar-pdf {
  background-color: #17a2b8;
  color: #fff;
  padding: 15px;
  font-size: 1.2rem;
  border: none;
  border-radius: 5px;
  margin-top: 20px;
  margin-bottom: 20px;
}

.generar-pdf:hover {
  background-color: #138496;
}

.btn-secondary {
  margin-right: 10px;
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
  text-decoration: none;
  transition: background-color 0.3s ease;
  cursor: pointer;
}

.btn-volver:hover {
  background-color: #2980b9;
}

.btn-volver i {
  margin-right: 10px;
}

.checkbox-container {
  display: flex;
  align-items: center;
  margin-left: 10px;
}

.checkbox-container input[type="checkbox"] {
  margin-right: 5px;
  width: 15px; /* Aumentamos el ancho */
  height: 15px; /* Aumentamos la altura */
  cursor: pointer;
}

.checkbox-container label {
  font-size: 0.9rem;
  color: #555;
  cursor: pointer; /* Añadimos cursor pointer para mejor interactividad */
}

.taras-header {
  display: flex;
  justify-content: center;
  align-items: center;
}

.total-taras-reporte {
  margin-top: 10px;
  font-weight: bold;
  padding: 5px;
  border-radius: 5px;
}

.total-taras-reporte.coincide {
  background-color: #d4edda;
  color: #155724;
}

.total-taras-reporte.no-coincide {
  background-color: #f8d7da;
  color: #721c24;
}

.total-bolsas-reporte {
  font-weight: bold;
  padding: 5px;
  border-radius: 5px;
  background-color: #e2e3e5;
  color: #383d41;
}

.agregar-tara-extra {
  background-color: #ffa500;
  color: #fff;
  margin-top: 1px; /* Ajuste del margen superior a 1px */
}

.agregar-tara-extra:hover {
  background-color: #ff8c00;
}

.tara-extra-input {
  border-color: #ffa500;
  border-width: 2px;
}

.tara-extra-input:focus {
  border-color: #ff8c00;
  box-shadow: 0 0 0 0.2rem rgba(255, 165, 0, 0.25);
}

.botones-tara {
  display: flex;
  gap: 5px;
  margin-top: auto; /* Empuja los botones hacia abajo */
  height: 38px; /* Altura fija para los botones */
}

.agregar-tara,
.agregar-tara-extra,
.agregar-kilo {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 38px; /* Altura fija para todos los botones */
  font-size: 0.9rem;
  padding: 0 10px;
}

.agregar-tara,
.agregar-tara-extra {
  flex: 1;
}

.total-bolsas {
  margin-top: 10px;
  font-weight: bold;
  color: #28a745;
}

.agregar-kilo {
  width: 100%;
  margin-top: 10px;
  align-self: flex-end; /* Alinea el botón al final de la columna */
}

.cliente-header[data-cliente] {
  cursor: pointer;
}

/* Estilo para clientes personalizados */
.cliente-header[data-cliente] {
  background-color: #95a5a6; /* Color gris por defecto */
}

/* Estilos específicos para clientes predefinidos */
.cliente-header[data-cliente="Joselito"] {
  background-color: #3498db;
}

.cliente-header[data-cliente="Catarro"] {
  background-color: #e74c3c;
}

.cliente-header[data-cliente="Otilio"] {
  background-color: #f1c40f;
}

.cliente-header[data-cliente="Ozuna"] {
  background-color: #2ecc71;
}

/* Asegurar que el texto sea blanco para todos los encabezados de cliente */
.cliente-header[data-cliente] h3 {
  color: #ffffff;
}

.botones-agregar {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.agregar-crudo {
  background-color: #17a2b8;
  color: white;
}

.agregar-crudo:hover {
  background-color: #138496;
}

.crudos-container {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 15px;
}

.crudo {
  background-color: #f8f9fa;
  border: 2px solid #007bff;
  padding: 15px;
  margin-bottom: 15px;
  border-radius: 8px;
}

.crudo h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 1.2rem;
}

.crudo-items {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.crudo-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #dee2e6;
}

.crudo-talla-container {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
}

.talla-select {
  flex: 2;
  min-width: 120px;
}

.barco-input {
  flex: 1;
  min-width: 80px;
}

.taras-input {
  width: 60px; /* Reducir el ancho del input de taras */
  min-width: 60px;
  padding: 4px 8px;
  text-align: center;
}

.btn-precio {
  padding: 2px 6px;
  font-size: 0.8rem;
  height: 24px;
  min-width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.crudo-taras-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.taras-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
}

.buttons-wrapper {
  display: flex;
  gap: 4px;
}

.eliminar-crudo-item,
.agregar-sobrante {
  padding: 4px 8px;
  height: 24px;
  min-width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.precio-tag {
  font-size: 0.8rem;
  color: #28a745;
  font-weight: bold;
  white-space: nowrap;
}

/* Ajustar el layout para mejor uso del espacio */
.crudo-item {
  padding: 8px;
  margin-bottom: 8px;
}

.crudo-items {
  gap: 8px;
}

/* Hacer los inputs más compactos en general */
.form-control {
  padding: 4px 8px;
  height: auto;
  font-size: 0.9rem;
}

.agregar-crudo-item,
.eliminar-crudo {
  width: 100%;
}

.eliminar-crudo-item,
.agregar-sobrante {
  padding: 5px 10px;
  font-size: 14px;
}

.btn-precio {
  padding: 2px 8px;
  margin-right: 10px;
}

.generar-nota {
  margin-right: 10px;
  background-color: #17a2b8;
  color: white;
}

.generar-nota:hover {
  background-color: #138496;
}

/* Agregar estos estilos en la sección <style> */
.botones-encabezado {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-right: 10px;
}

.botones-fila-superior,
.botones-fila-inferior {
  display: flex;
  gap: 5px;
}

.btn-precio,
.btn-hilos,
.btn-nota,
.btn-alt {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0;
  color: #666;
  transition: all 0.3s ease;
}

.btn-alt {
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  cursor: pointer;
  margin-left: 5px;
  transition: all 0.3s ease;
}

.btn-alt:hover {
  background-color: #5a6268;
}

.btn-alt.tiene-alt {
  background-color: #28a745;
}

.btn-alt.tiene-alt:hover {
  background-color: #218838;
}

.modal-alt {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}


.modal-alt .modal-contenido {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  min-width: 300px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.modal-alt h3 {
  margin-bottom: 15px;
  color: #333;
}

.modal-alt .input-alt {
  margin-bottom: 15px;
}

.modal-alt input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.modal-alt .modal-botones {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-alt .btn {
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.modal-alt .btn-success {
  background-color: #4CAF50;
  color: white;
}

.modal-alt .btn-secondary {
  background-color: #6c757d;
  color: white;
}

.kg-radio {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  height: 24px;
}

.encabezado-medida {
  display: flex;
  align-items: flex-start; /* Cambiado a flex-start para mejor alineación con las dos filas */
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 15px;
  gap: 8px;
}

.checkbox-juntar-medidas {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.checkbox-juntar-medidas input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.checkbox-juntar-medidas label {
  font-size: 0.9rem;
  color: #555;
  cursor: pointer;
}

.generar-resumen-container {
  display: flex;
  align-items: center;
  gap: 15px;
}

.checkbox-juntar-medidas {
  display: flex;
  align-items: center;
  gap: 5px;
}

.checkbox-juntar-medidas input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-juntar-medidas label {
  font-size: 1rem;
  color: #333;
  cursor: pointer;
  user-select: none;
}

.btn-nota {
  padding: 2px 8px;
  font-size: 0.9rem;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  height: 24px;
  min-width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-nota.tiene-nota {
  background-color: #17a2b8;
  color: white;
  border-color: #17a2b8;
}

.modal-nota {
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

.input-nota {
  margin: 20px 0;
}

.input-nota textarea {
  width: 100%;
  min-height: 100px;
  padding: 8px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 1rem;
  resize: vertical;
}

.input-nota textarea:focus {
  outline: none;
  border-color: #17a2b8;
  box-shadow: 0 0 0 0.2rem rgba(23, 162, 184, 0.25);
}

.resumen-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 10px;
}

.resumen-titulo {
  margin: 0;
  flex: 1;
}

.resumen-botones {
  display: flex;
  gap: 10px;
  align-items: center;
}

@media (max-width: 375px) {
  .resumen-header {
    flex-direction: column;
    align-items: stretch;
  }

  .resumen-botones {
    flex-direction: column;
    width: 100%;
  }

  .resumen-botones .btn {
    width: 100%;
    margin: 0;
    padding: 10px;
    font-size: 14px;
  }

  .productos-container {
    flex-direction: column;
    gap: 15px;
  }

  .producto {
    flex: 0 0 100%;
    width: 100%;
  }

  .botones-notas-clientes {
    flex-direction: column;
    width: 100%;
    gap: 8px;
    padding: 0 10px;
  }

  .btn-nota-cliente {
    width: 100%;
    font-size: 14px;
    padding: 10px 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cliente-header-controls {
    flex-direction: column;
    width: 100%;
    gap: 8px;
  }

  .cliente-header {
    padding: 10px;
  }

  .cliente-totales {
    flex-direction: column;
    gap: 5px;
  }

  .cliente-totales span {
    font-size: 12px;
  }
}

.modal-nombre-alternativo {
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

.input-nombre {
  display: flex;
  align-items: center;
  margin: 20px 0;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 8px;
}

.input-nombre input {
  border: none;
  outline: none;
  font-size: 1.2rem;
  width: 100%;
}

.medida-texto {
  cursor: pointer;
  transition: color 0.3s;
}

.medida-texto:hover {
  color: #007bff;
  text-decoration: underline;
}

.kg-radio {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 1px;
}

.kg-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.kg-label {
  font-size: 0.9rem;
  color: #555;
  cursor: pointer;
}

/* Agregar o modificar estilos del modal */
.modal-precio {
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

.modal-contenido {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 300px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1001;
}

.input-precio {
  display: flex;
  align-items: center;
  margin: 20px 0;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 8px;
}

.simbolo-precio {
  font-size: 1.2rem;
  color: #495057;
  margin-right: 8px;
}

.input-precio input {
  border: none;
  outline: none;
  font-size: 1.2rem;
  width: 100%;
  -moz-appearance: textfield;
}

.input-precio input::-webkit-outer-spin-button,
.input-precio input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.modal-botones {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.modal-botones button {
  flex: 1;
  padding: 8px;
}

.talla-header {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}

/* Estilos para el botón de Hilos */
.btn-hilos {
  padding: 2px 8px;
  font-size: 0.9rem;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 8px;
  transition: all 0.2s;
  height: 24px;
  min-width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-hilos.tiene-hilos {
  background-color: #28a745;
  color: white;
  border-color: #28a745;
}

/* Estilos para el modal de Hilos */
.modal-hilos {
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

.modal-contenido {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 300px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1001;
}

.input-hilos {
  display: flex;
  align-items: center;
  margin: 20px 0;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 8px;
}

.input-hilos input {
  border: none;
  outline: none;
  font-size: 1.2rem;
  width: 100%;
  -moz-appearance: textfield;
}

.input-hilos input::-webkit-outer-spin-button,
.input-hilos input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.modal-botones {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.modal-botones button {
  flex: 1;
  padding: 8px;
}

/* Agregar estos estilos al final de la sección <style> */
.botones-encabezado {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-right: 8px;
}

.botones-fila-superior,
.botones-fila-inferior {
  display: flex;
  gap: 4px;
  align-items: center;
}

.btn-precio,
.btn-hilos,
.btn-nota {
  padding: 2px 8px;
  font-size: 0.9rem;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  height: 24px;
  min-width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.kg-radio {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  height: 24px;
}

.encabezado-medida {
  display: flex;
  align-items: flex-start; /* Cambiado a flex-start para mejor alineación con las dos filas */
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 15px;
  gap: 8px;
}

.checkbox-juntar-medidas {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.checkbox-juntar-medidas input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.checkbox-juntar-medidas label {
  font-size: 0.9rem;
  color: #555;
  cursor: pointer;
}

.generar-resumen-container {
  display: flex;
  align-items: center;
  gap: 15px;
}

.checkbox-juntar-medidas {
  display: flex;
  align-items: center;
  gap: 5px;
}

.checkbox-juntar-medidas input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-juntar-medidas label {
  font-size: 1rem;
  color: #333;
  cursor: pointer;
  user-select: none;
}

.btn-nota {
  padding: 2px 8px;
  font-size: 0.9rem;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  height: 24px;
  min-width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-nota.tiene-nota {
  background-color: #17a2b8;
  color: white;
  border-color: #17a2b8;
}

.modal-nota {
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

.input-nota {
  margin: 20px 0;
}

.input-nota textarea {
  width: 100%;
  min-height: 100px;
  padding: 8px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 1rem;
  resize: vertical;
}

.input-nota textarea:focus {
  outline: none;
  border-color: #17a2b8;
  box-shadow: 0 0 0 0.2rem rgba(23, 162, 184, 0.25);
}

.resumen-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 10px;
}

.resumen-titulo {
  margin: 0;
}

.modal-nombre-alternativo {
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

.input-nombre {
  display: flex;
  align-items: center;
  margin: 20px 0;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 8px;
}

.input-nombre input {
  border: none;
  outline: none;
  font-size: 1.2rem;
  width: 100%;
}

.medida-texto {
  cursor: pointer;
  transition: color 0.3s;
}

.medida-texto:hover {
  color: #007bff;
  text-decoration: underline;
}

.kg-radio {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  height: 24px;
}

.kg-checkbox {
  width: 14px;
  height: 14px;
  cursor: pointer;
  margin: 0;
}

.kg-radio label {
  font-size: 0.9rem;
  cursor: pointer;
  user-select: none;
  margin: 0;
}

@media (max-width: 768px) {
  .producto-header {
    flex-direction: column;
    gap: 0.5rem;
  }

  .medida-autocomplete {
    width: 100%;
  }

  .tipo-select {
    width: 100%;
    margin: 0.5rem 0;
  }

  /* Mantener taras y kilos en la misma fila */
  .sumas-verticales {
    flex-direction: row; /* Mantener dirección horizontal */
    gap: 10px;
    width: 100%;
  }

  .columna {
    flex: 1; /* Distribuir el espacio equitativamente */
    min-width: 0; /* Permitir que las columnas se reduzcan */
  }

  /* Ajustar inputs dentro de las columnas */
  .tara-input, 
  .kilo-input {
    width: 100%;
    min-width: 0;
    font-size: 14px; /* Reducir tamaño de fuente para mejor ajuste */
  }

  /* Ajustar los grupos de input */
  .input-group {
    display: flex;
    gap: 5px;
  }

  .input-group button {
    padding: 8px;
    min-width: 30px;
  }

  /* Ajustar botones de agregar */
  .botones-tara {
    display: flex;
    gap: 5px;
  }

  .agregar-tara,
  .agregar-tara-extra,
  .agregar-kilo {
    padding: 8px;
    font-size: 12px;
    height: auto;
    white-space: nowrap;
  }

  /* Resto de los ajustes responsivos... */
}

.producto.reporte-completo {
  border: 3px solid #28a745 !important; /* Verde para reporte completo */
  box-shadow: 0 0 8px rgba(40, 167, 69, 0.2);
}

.producto.reporte-incompleto {
  border: 3px solid #dc3545 !important; /* Rojo para reporte incompleto */
  box-shadow: 0 0 8px rgba(220, 53, 69, 0.2);
}

/* Mantener el estilo especial para productos que son venta */
.producto[data-es-venta="true"]:not(.reporte-completo):not(.reporte-incompleto) {
  border: 3px solid #28a745;
}

/* Mantener el estilo para productos que son maquila */
.producto[data-es-venta="false"]:not(.reporte-completo):not(.reporte-incompleto) {
  border: 3px solid #007bff;
}

.cliente-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.cliente-totales {
  display: flex;
  gap: 15px;
  color: white;
  font-size: 0.9rem;
}

.cliente-totales span {
  background-color: rgba(0, 0, 0, 0.2);
  padding: 3px 8px;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .cliente-info {
    width: 100%;
  }
  
  .cliente-totales {
    flex-direction: column;
    gap: 5px;
  }
}

.medida-input-container {
  position: relative;
  flex: 2;
}

.sugerencias-container {
  position: absolute;
  top: 100%;
  left: 0;
  width: calc(50% - 4px); /* Ajustar al ancho del input de medida */
  z-index: 1000;
}

.sugerencia-item {
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.sugerencia-item:hover {
  background-color: #f5f5f5;
}

/* ... existing styles ... */

/* Agregar estos estilos al final de la sección de estilos */

/* Ocultar flechas para Chrome, Safari, Edge, Opera */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Ocultar flechas para Firefox */
input[type=number] {
  -moz-appearance: textfield;
}

/* Agregar estos estilos */
input[type="number"] {
  -webkit-appearance: none;
  -moz-appearance: textfield;
  appearance: none;
  margin: 0;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Forzar el estilo iOS */
input[type="number"] {
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 16px;
  background-color: #ffffff;
  border: 1px solid #d1d1d6;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
}

input[type="number"]:focus {
  border-color: #007aff;
  box-shadow: 0 0 0 3px rgba(0,122,255,0.25);
  outline: none;
}

/* Estilos específicos para inputs numéricos en iOS */
.ios-numeric {
  -webkit-text-security: none !important;
  -webkit-appearance: none !important;
  appearance: none !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 16px !important;
  line-height: 1.2;
  padding: 8px !important;
  border: 1px solid #d1d1d6;
  border-radius: 10px;
  background-color: #ffffff;
  text-align: right;
  width: 100%;
  margin: 0;
  box-sizing: border-box;
}

.ios-numeric:focus {
  outline: none;
  border-color: #007aff;
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.25);
}

/* Asegurarse de que el texto se alinee correctamente */
.ios-numeric::placeholder {
  text-align: right;
  color: #999;
}

/* Prevenir zoom en iOS */
@media screen and (-webkit-min-device-pixel-ratio: 0) {
  .ios-numeric {
    font-size: 16px !important;
  }
}

/* Asegurarse de que el input tenga suficiente espacio táctil */
.input-group {
  min-height: 44px;
}

/* Estilos específicos para Chrome en iOS */
.ios-numeric {
  -webkit-appearance: none;
  appearance: none;
  font-size: 16px;
  padding: 8px;
  border: 1px solid #d1d1d6;
  border-radius: 10px;
  background-color: #ffffff;
  text-align: right;
  width: 100%;
  margin: 0;
  box-sizing: border-box;
}

/* Prevenir el zoom en Chrome iOS */
@supports (-webkit-touch-callout: none) {
  .ios-numeric {
    -webkit-user-select: text;
    user-select: text;
    -webkit-tap-highlight-color: transparent;
  }
}

/* Mejorar la experiencia táctil */
.input-group {
  min-height: 44px;
  touch-action: manipulation;
}

/* Estilo específico para Chrome en iOS */
@media screen and (-webkit-min-device-pixel-ratio: 0) {
  .ios-numeric {
    -webkit-user-select: text;
    user-select: text;
    -webkit-tap-highlight-color: transparent;
  }
}

/* Modificar/Simplificar los estilos CSS */
.form-control {
  border: 1px solid #d1d1d6;
  border-radius: 10px;
  padding: 8px;
  font-size: 16px;
  width: 100%;
  text-align: right;
  background-color: #ffffff;
}

/* Eliminar los estilos que pueden causar conflictos */
input[type="tel"] {
  /* Remover -webkit-appearance y otros estilos que pueden interferir */
  text-align: right;
  font-size: 16px;
}

/* Estilos específicos para inputs numéricos */
.tara-input,
.kilo-input,
.reporte-input,
.precio-input {
  text-align: right;
  font-size: 16px;
  padding: 8px;
  border: 1px solid #d1d1d6;
  border-radius: 10px;
  background-color: #ffffff;
}

/* Estilo para el estado focus */
.form-control:focus {
  outline: none;
  border-color: #007aff;
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.25);
}

/* Remover la clase ios-numeric si existe */
.ios-numeric {
  /* Mantener solo los estilos esenciales */
  text-align: right;
  font-size: 16px;
}

/* Agregar estos nuevos estilos para las sugerencias */
.sugerencias-medidas {
  position: absolute;
  z-index: 1000;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  width: calc(100% - 20px);
  max-height: 200px;
  overflow-y: auto;
  margin-top: 5px;
  border: 1px solid #ddd;
}

.sugerencia-item {
  padding: 12px 15px;
  color: #2c3e50;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid #eee;
  font-weight: 500;
  background: white;
}

.sugerencia-item:last-child {
  border-bottom: none;
}

.sugerencia-item:hover {
  background: #f8f9fa;
  transform: translateX(5px);
  color: #007bff;
}

/* Asegurar que el contenedor de la medida tenga posición relativa */
.medida-input-container {
  position: relative;
  display: flex;
  gap: 8px;
  width: 100%;
}

/* Modificar los estilos de los botones finales */
.botones-finales {
  display: flex;
  flex-direction: row; /* Asegura que los botones estén en horizontal */
  gap: 15px;
  margin-top: 20px;
  flex-wrap: wrap; /* Permite que los botones se envuelvan en pantallas pequeñas */
  justify-content: center; /* Centra los botones horizontalmente */
  align-items: center;
  width: 100%; /* Asegura que el contenedor tome todo el ancho disponible */
}

.botones-finales button,
.botones-finales a {
  flex: 0 1 auto; /* Evita que los botones se estiren */
  min-width: 200px; /* Ancho mínimo para los botones */
  padding: 12px 24px;
  font-size: 1rem;
  text-align: center;
  white-space: nowrap;
}

/* Ajustes para pantallas pequeñas */
@media (max-width: 768px) {
  .botones-finales {
    flex-direction: column; /* En móvil, los botones se apilan */
    align-items: center; /* Centra los botones verticalmente en móvil */
    width: 100%;
  }

  .botones-finales button,
  .botones-finales a {
    width: 100%;
    min-width: unset;
  }
}

/* Ajustar el contenedor de generar resumen */
.generar-resumen-container {
  display: flex;
  align-items: center;
  gap: 15px;
  flex: 0 1 auto;
}

/* Mantener los estilos específicos de cada botón */
.crear-embarque {
  background-color: #28a745;
  color: #fff;
}

.generar-pdf {
  background-color: #17a2b8;
  color: #fff;
}

.ver-rendimientos {
  background-color: #ffc107;
  color: #212529;
}

.ml-2 {
  margin-left: 0.5rem;
}

/* Reemplazar los estilos de usuarios-activos por estos nuevos */
.total-taras-flotante {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: #2c3e50;
  padding: 10px 15px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  z-index: 1000;
}

.total-taras-contenido {
  display: flex;
  align-items: center;
  justify-content: center;
}

.total-taras-valor {
  color: white;
  font-size: 1.2rem;
  font-weight: bold;
}

.usuarios-activos {
  position: fixed;
  top: 20px;
  right: 20px;
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1000;
  min-width: 200px;
  border: 1px solid #e1e4e8;
}

.usuarios-activos h4 {
  margin: 0 0 15px 0;
  color: #24292e;
  font-size: 16px;
  border-bottom: 1px solid #e1e4e8;
  padding-bottom: 10px;
}

.usuarios-lista {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.usuario-activo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 6px;
  background: #f6f8fa;
  transition: all 0.2s ease;
}

.usuario-activo:hover {
  background: #f1f4f7;
}

.usuario-nombre {
  font-weight: 500;
  color: #24292e;
}

.usuario-status {
  font-size: 14px;
  display: flex;
  align-items: center;
}

.usuario-status.online {
  color: #28a745;
}

.usuario-status.offline {
  color: #dc3545;
}

.usuario-status::before {
  content: "●";
  margin-right: 5px;
}

.botones-notas-clientes {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 5px;
  margin-bottom: 20px;
  justify-content: center;
}

.btn-nota-cliente {
  padding: 10px 15px;
  border: none;
  border-radius: 5px;
  color: white;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 100px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.btn-nota-cliente:hover {
  opacity: 0.9;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.btn-nota-cliente:active {
  transform: translateY(1px);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.btn-nota-cliente.activo {
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.5);
}

@media (max-width: 768px) {
  .botones-notas-clientes {
    position: sticky;
    top: 0;
    z-index: 100;
    background-color: #f8f9fa;
    padding: 10px;
    border-bottom: 1px solid #ddd;
    margin: 0 -15px 15px;
    width: calc(100% + 30px);
  }
  
  .btn-nota-cliente {
    flex: 1;
    min-width: 80px;
    font-size: 0.9rem;
    padding: 8px 10px;
  }
}

@media (max-width: 768px) {
  .productos-container {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 10px;
  }

  .producto {
    flex: 0 0 calc(50% - 5px);
    width: calc(50% - 5px);
  }
}

@media (max-width: 375px) {
  .productos-container {
    flex-direction: column;
    gap: 15px;
  }

  .producto {
    flex: 0 0 100%;
    width: 100%;
  }

  .botones-notas-clientes {
    flex-direction: column;
    width: 100%;
    gap: 8px;
    padding: 0 10px;
  }

  .btn-nota-cliente {
    width: 100%;
    font-size: 14px;
    padding: 10px 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cliente-header-controls {
    flex-direction: column;
    width: 100%;
    gap: 8px;
  }

  .cliente-header {
    padding: 10px;
  }

  .cliente-totales {
    flex-direction: column;
    gap: 5px;
  }

  .cliente-totales span {
    font-size: 12px;
  }
}

.sticky-header {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 4px 8px; /* Reducir padding */
  min-height: 40px; /* Reducir altura mínima */
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: inherit;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

/* Optimizar el layout del header */
.cliente-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
}

/* Agrupar título y totales */
.cliente-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.cliente-info h3 {
  margin: 0;
  font-size: 1.4rem; /* Reducir tamaño de fuente */
  white-space: nowrap;
}

/* Optimizar los totales */
.cliente-totales {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
}

.cliente-totales span {
  background-color: rgba(0, 0, 0, 0.2);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.85rem;
  white-space: nowrap;
}

/* Optimizar los controles del header */
.cliente-header-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Ajustar los botones para que ocupen menos espacio */
.btn-nota-cliente {
  padding: 4px 8px;
  font-size: 0.85rem;
  height: 28px;
  display: flex;
  align-items: center;
}

@media (max-width: 768px) {
  .sticky-header {
    padding: 4px;
  }

  .cliente-header {
    flex-wrap: nowrap; /* Cambiar a nowrap para mantener todo en una línea */
    gap: 4px; /* Reducir el espacio entre elementos */
  }

  .cliente-info {
    flex-direction: row;
    width: auto;
    gap: 6px; /* Reducir el espacio entre nombre y totales */
  }

  .cliente-info h3 {
    font-size: 1.2rem; /* Reducir un poco el tamaño de la fuente */
  }

  .cliente-totales {
    flex: 0 1 auto; /* Evitar que los totales crezcan demasiado */
    gap: 4px;
  }

  .cliente-totales span {
    padding: 1px 4px;
    font-size: 0.8rem;
  }

  /* Ajustar los controles del header */
  .cliente-header-controls {
    flex: 0 0 auto;
    margin-top: 0; /* Eliminar el margen superior */
    gap: 4px;
  }

  /* Hacer los botones más pequeños */
  .cliente-header-controls button,
  .juntar-medidas-checkbox {
    padding: 2px 6px;
    font-size: 0.75rem;
    height: 24px;
    min-width: auto;
  }

  /* Ajustar el checkbox de juntar medidas */
  .juntar-medidas-checkbox label {
    font-size: 0.75rem;
  }

  .juntar-medidas-checkbox input[type="checkbox"] {
    width: 14px;
    height: 14px;
  }

  /* Ajustar los botones específicos */
  .generar-nota,
  .eliminar-cliente {
    padding: 2px 6px;
    font-size: 0.75rem;
    white-space: nowrap;
  }
}

/* Ajustes adicionales para pantallas muy pequeñas */
@media (max-width: 480px) {
  .cliente-header {
    flex-wrap: wrap; /* Permitir wrap solo en pantallas muy pequeñas */
  }

  .cliente-info {
    flex-direction: row;
    align-items: center;
    width: auto;
  }

  .cliente-header-controls {
    justify-content: flex-start;
    margin-top: 4px;
  }
}

/* Estilos base del sticky header */
.sticky-header {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 4px 8px;
  min-height: 36px;
  background: inherit;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

/* Layout principal del header */
.cliente-header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

/* Contenedor del nombre y totales */
.cliente-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0; /* Permite que el contenedor se encoja */
}

.cliente-info h3 {
  margin: 0;
  font-size: 1.4rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Contenedor de los totales */
.cliente-totales {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 1;
}

.cliente-totales span {
  background-color: rgba(0, 0, 0, 0.2);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.85rem;
  white-space: nowrap;
}

/* Controles del header */
.cliente-header-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto; /* Empuja los controles hacia la derecha */
}

@media (max-width: 768px) {
  .sticky-header {
    padding: 4px;
  }

  .cliente-header {
    gap: 6px;
  }

  /* Ajustar el nombre del cliente */
  .cliente-info h3 {
    font-size: 1.1rem;
    max-width: 120px; /* Limitar el ancho del nombre */
  }

  /* Comprimir los totales */
  .cliente-totales {
    gap: 2px;
  }

  .cliente-totales span {
    padding: 1px 4px;
    font-size: 0.7rem;
  }

  /* Ajustar los controles */
  .cliente-header-controls {
    gap: 2px;
  }

  /* Hacer los botones más compactos */
  .cliente-header-controls button,
  .juntar-medidas-checkbox {
    padding: 1px 4px;
    font-size: 0.7rem;
    height: 20px;
    min-width: auto;
  }

  /* Ajustar el checkbox */
  .juntar-medidas-checkbox {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .juntar-medidas-checkbox input[type="checkbox"] {
    width: 12px;
    height: 12px;
    margin: 0;
  }

  .juntar-medidas-checkbox label {
    font-size: 0.7rem;
  }

  /* Ajustar botones específicos */
  .generar-nota,
  .eliminar-cliente {
    padding: 1px 4px;
    font-size: 0.7rem;
  }
}

/* Mantener la legibilidad en pantallas muy pequeñas */
@media (max-width: 480px) {
  .cliente-header {
    flex-wrap: wrap;
  }

  .cliente-info h3 {
    max-width: none;
    font-size: 1rem;
  }

  .cliente-header-controls {
    width: 100%;
    justify-content: flex-start;
    margin-top: 4px;
  }
}

/* Estilos base del header del cliente */
.sticky-header {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: inherit;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  padding: 2px 4px; /* Reducido el padding */
}

/* Layout principal del header */
.cliente-header {
  display: flex;
  align-items: center; /* Cambiado a una sola línea */
  gap: 8px;
  width: 100%;
  min-height: 40px; /* Altura mínima para mantener legibilidad */
}

/* Contenedor del nombre */
.cliente-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 1 auto; /* Permite que se encoja pero no crezca */
}

.cliente-info h3 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: bold;
  color: white;
  white-space: nowrap;
}

/* Contenedor de los totales */
.cliente-totales {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 12px; /* Espacio antes de los controles */
}

.cliente-totales span {
  color: white;
  font-size: 0.9rem;
  white-space: nowrap;
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

/* Controles del header */
.cliente-header-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto; /* Empuja los controles a la derecha */
}

/* Checkbox de juntar medidas */
.juntar-medidas-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  height: 28px;
}

.juntar-medidas-checkbox input[type="checkbox"] {
  width: 14px;
  height: 14px;
  margin: 0;
}

.juntar-medidas-checkbox label {
  color: white;
  font-size: 0.85rem;
  white-space: nowrap;
}

/* Botones de acción */
.generar-nota,
.eliminar-cliente {
  padding: 2px 8px;
  height: 28px;
  border-radius: 4px;
  font-size: 0.85rem;
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.generar-nota {
  background-color: #17a2b8;
}

.eliminar-cliente {
  background-color: #6c757d;
}

/* Media queries existentes para responsive */
@media (max-width: 768px) {
  .cliente-info h3 {
    font-size: 1.2rem;
  }

  .cliente-totales span {
    font-size: 0.8rem;
    padding: 1px 4px;
  }

  .cliente-header-controls {
    gap: 4px;
  }

  .juntar-medidas-checkbox,
  .generar-nota,
  .eliminar-cliente {
    padding: 1px 6px;
    height: 24px;
    font-size: 0.75rem;
  }
}

@media (max-width: 480px) {
  .cliente-header {
    flex-wrap: wrap;
  }

  .cliente-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .cliente-totales {
    width: 100%;
    justify-content: flex-start;
    margin-right: 0;
  }

  .cliente-header-controls {
    width: 100%;
    justify-content: flex-start;
    margin-top: 4px;
  }
}

@media (max-width: 768px) {
  /* Ajustes del contenedor principal */
  .productos-container {
    padding: 8px;
    gap: 12px;
  }

  /* Optimización del producto individual */
  .producto {
    padding: 10px;
    margin-bottom: 8px;
  }

  /* Header del producto más compacto */
  .producto-header {
    gap: 8px;
    margin-bottom: 8px;
  }

  /* Ajuste de inputs y controles */
  .medida-input-container {
    gap: 4px;
  }

  .form-control {
    height: 32px;
    padding: 4px 8px;
  }

  /* Optimizar sección de taras y kilos */
  .sumas-verticales {
    gap: 8px;
    margin-top: 8px;
  }

  .columna {
    gap: 4px;
  }

  .input-group {
    margin-bottom: 4px;
  }

  .input-group input {
    height: 32px;
    padding: 4px 8px;
  }

  .input-group button {
    padding: 4px;
    min-width: 32px;
    height: 32px;
  }

  /* Botones de acción más compactos */
  .botones-tara {
    gap: 4px;
  }

  .agregar-tara,
  .agregar-kilo {
    padding: 6px 10px;
    height: 32px;
    font-size: 0.9rem;
  }

  /* Optimizar encabezado del cliente */
  .cliente-header {
    padding: 8px;
    gap: 6px;
  }

  .cliente-info {
    gap: 6px;
  }

  .cliente-totales {
    gap: 6px;
  }

  .cliente-totales span {
    padding: 2px 6px;
    font-size: 0.8rem;
  }

  /* Ajustar controles del header */
  .cliente-header-controls {
    gap: 6px;
  }

  .cliente-header-controls button {
    padding: 4px 8px;
    height: 32px;
    font-size: 0.85rem;
  }

  /* Optimizar modales */
  .modal-contenido {
    width: 90%;
    max-width: 320px;
    padding: 16px;
  }

  .input-precio,
  .input-nombre {
    margin: 12px 0;
  }

  /* Ajustar botones flotantes */
  .total-taras-flotante {
    bottom: 12px;
    right: 12px;
    padding: 8px 12px;
  }

  /* Optimizar lista de usuarios activos */
  .usuarios-activos {
    top: 12px;
    right: 12px;
    padding: 12px;
    min-width: 160px;
  }

  .usuario-activo {
    padding: 6px;
    gap: 6px;
  }

  /* Ajustar botones de notas */
  .botones-notas-clientes {
    gap: 6px;
    padding: 0 8px;
  }

  .btn-nota-cliente {
    padding: 6px 12px;
    font-size: 0.9rem;
  }

  /* Optimizar checkbox y controles */
  .checkbox-juntar-medidas {
    gap: 4px;
  }

  .checkbox-juntar-medidas input[type="checkbox"] {
    width: 16px;
    height: 16px;
  }

  /* Ajustar espaciado de los botones finales */
  .botones-finales {
    gap: 8px;
    margin-top: 16px;
    padding: 0 8px;
  }

  .botones-finales button,
  .botones-finales a {
    padding: 10px 16px;
    font-size: 0.9rem;
  }
}

@media (max-width: 768px) {
  /* Ajustes del header del cliente */
  .cliente-header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background-color: inherit;
    min-height: 50px;
  }

  /* Nombre del cliente y totales */
  .cliente-info {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 12px;
  }

  .cliente-info h3 {
    font-size: 1.4rem;
    margin: 0;
    white-space: nowrap;
  }

  /* Totales de limpio/crudo */
  .cliente-totales {
    display: flex;
    flex-direction: row;
    gap: 8px;
  }

  .cliente-totales span {
    background: rgba(0, 0, 0, 0.2);
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.9rem;
    white-space: nowrap;
  }

  /* Controles del header */
  .cliente-header-controls {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }

  /* Checkbox de juntar medidas */
  .juntar-medidas-checkbox {
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.2);
    padding: 4px 8px;
    border-radius: 4px;
    height: 32px;
  }

  .juntar-medidas-checkbox label {
    font-size: 0.9rem;
    color: white;
    white-space: nowrap;
  }

  /* Botones de acción */
  .generar-nota,
  .eliminar-cliente {
    height: 32px;
    padding: 0 12px;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    white-space: nowrap;
  }

  /* Ajuste para mantener todo en una línea */
  .cliente-header > * {
    flex-shrink: 0;
  }

  .cliente-info {
    flex-shrink: 1;
    min-width: 0;
  }

  /* Hacer scroll horizontal si es necesario */
  .cliente-header {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
  }

  .cliente-header::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }

  /* Ajustar espaciado entre elementos */
  .cliente-header > *:not(:last-child) {
    margin-right: 8px;
  }

  /* Mantener los botones visibles */
  .cliente-header-controls {
    position: sticky;
    right: 0;
    background: inherit;
    padding-left: 8px;
  }
}

/* Ajustes adicionales para pantallas muy pequeñas */
@media (max-width: 480px) {
  .cliente-header {
    padding: 6px 8px;
  }

  .cliente-info h3 {
    font-size: 1.2rem;
  }

  .cliente-totales span {
    font-size: 0.8rem;
    padding: 3px 6px;
  }

  .generar-nota,
  .eliminar-cliente {
    padding: 0 8px;
    font-size: 0.8rem;
  }
}

@media (max-width: 768px) {
  /* Contenedor de productos en dos columnas */
  .productos-container {
    display: grid;
    grid-template-columns: repeat(2, 1fr); /* Dos columnas */
    gap: 8px;
    padding: 8px;
  }

  /* Ajustes del producto individual */
  .producto {
    width: 100%;
    margin-bottom: 8px;
    padding: 8px;
    min-width: 0; /* Permite que el contenido se ajuste */
  }

  /* Ajustar el contenido dentro del producto */
  .producto-header {
    flex-direction: column;
    gap: 4px;
  }

  /* Contenedor de medida más compacto */
  .medida-input-container {
    width: 100%;
  }

  /* Hacer los inputs más pequeños pero usables */
  .form-control {
    font-size: 14px;
    height: 32px;
    padding: 4px 6px;
  }

  /* Optimizar sección de taras y kilos */
  .sumas-verticales {
    display: flex;
    gap: 6px;
  }

  .columna {
    flex: 1;
    min-width: 0;
  }

  /* Ajustar inputs de taras y kilos */
  .input-group {
    display: flex;
    gap: 4px;
    margin-bottom: 4px;
  }

  .input-group input {
    width: calc(100% - 30px); /* Dejar espacio para el botón */
    font-size: 14px;
  }

  .input-group button {
    width: 26px;
    height: 26px;
    padding: 0;
    font-size: 12px;
  }

  /* Ajustar botones de agregar */
  .botones-tara {
    display: flex;
    gap: 4px;
  }

  .agregar-tara,
  .agregar-tara-extra {
    padding: 4px 8px;
    font-size: 12px;
    height: 26px;
  }

  /* Ajustar reporte de taras y bolsas */
  .reporte-taras-bolsas {
    display: flex;
    gap: 6px;
  }

  .reporte-item {
    flex: 1;
    min-width: 0;
  }

  /* Responsive para pantallas muy pequeñas */
  @media (max-width: 480px) {
    .productos-container {
      grid-template-columns: repeat(2, 1fr); /* Mantener dos columnas */
      gap: 6px;
      padding: 6px;
    }

    .producto {
      padding: 6px;
    }

    .form-control {
      font-size: 13px;
      height: 30px;
    }

    .input-group input {
      font-size: 13px;
    }
  }

  /* Ajustes para mantener la usabilidad */
  .tipo-select,
  .medida-input {
    width: 100%;
    margin-bottom: 4px;
  }

  /* Mantener los botones de acción accesibles */
  .botones-accion {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  /* Ajustar el espacio entre productos */
  .producto:not(:last-child) {
    margin-bottom: 8px;
  }
}

@media (max-width: 768px) {
  /* Ajustes del header del cliente */
  .cliente-header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background-color: inherit;
    min-height: 50px;
  }

  /* Nombre del cliente y totales */
  .cliente-info {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 12px;
  }

  .cliente-info h3 {
    font-size: 1.4rem;
    margin: 0;
    white-space: nowrap;
  }

  /* Totales de limpio/crudo */
  .cliente-totales {
    display: flex;
    flex-direction: row;
    gap: 8px;
  }

  .cliente-totales span {
    background: rgba(0, 0, 0, 0.2);
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.9rem;
    white-space: nowrap;
  }

  /* Controles del header */
  .cliente-header-controls {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }

  /* Checkbox de juntar medidas */
  .juntar-medidas-checkbox {
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.2);
    padding: 4px 8px;
    border-radius: 4px;
    height: 32px;
  }

  .juntar-medidas-checkbox label {
    font-size: 0.9rem;
    color: white;
    white-space: nowrap;
  }

  /* Botones de acción */
  .generar-nota,
  .eliminar-cliente {
    height: 32px;
    padding: 0 12px;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    white-space: nowrap;
  }

  /* Ajuste para mantener todo en una línea */
  .cliente-header > * {
    flex-shrink: 0;
  }

  .cliente-info {
    flex-shrink: 1;
    min-width: 0;
  }

  /* Hacer scroll horizontal si es necesario */
  .cliente-header {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
  }

  .cliente-header::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }

  /* Ajustar espaciado entre elementos */
  .cliente-header > *:not(:last-child) {
    margin-right: 8px;
  }

  /* Mantener los botones visibles */
  .cliente-header-controls {
    position: sticky;
    right: 0;
    background: inherit;
    padding-left: 8px;
  }
}

/* Ajustes adicionales para pantallas muy pequeñas */
@media (max-width: 480px) {
  .cliente-header {
    padding: 6px 8px;
  }

  .cliente-info h3 {
    font-size: 1.2rem;
  }

  .cliente-totales span {
    font-size: 0.8rem;
    padding: 3px 6px;
  }

  .generar-nota,
  .eliminar-cliente {
    padding: 0 8px;
    font-size: 0.8rem;
  }
}

@media (max-width: 768px) {
  /* Contenedor de productos en dos columnas */
  .productos-container {
    display: grid;
    grid-template-columns: repeat(2, 1fr); /* Dos columnas */
    gap: 8px;
    padding: 8px;
  }

  /* Ajustes del producto individual */
  .producto {
    width: 100%;
    margin-bottom: 8px;
    padding: 8px;
    min-width: 0; /* Permite que el contenido se ajuste */
  }

  /* Ajustar el contenido dentro del producto */
  .producto-header {
    flex-direction: column;
    gap: 4px;
  }

  /* Contenedor de medida más compacto */
  .medida-input-container {
    width: 100%;
  }

  /* Hacer los inputs más pequeños pero usables */
  .form-control {
    font-size: 14px;
    height: 32px;
    padding: 4px 6px;
  }

  /* Optimizar sección de taras y kilos */
  .sumas-verticales {
    display: flex;
    gap: 6px;
  }

  .columna {
    flex: 1;
    min-width: 0;
  }

  /* Ajustar inputs de taras y kilos */
  .input-group {
    display: flex;
    gap: 4px;
    margin-bottom: 4px;
  }

  .input-group input {
    width: calc(100% - 30px); /* Dejar espacio para el botón */
    font-size: 14px;
  }

  .input-group button {
    width: 26px;
    height: 26px;
    padding: 0;
    font-size: 12px;
  }

  /* Ajustar botones de agregar */
  .botones-tara {
    display: flex;
    gap: 4px;
  }

  .agregar-tara,
  .agregar-tara-extra {
    padding: 4px 8px;
    font-size: 12px;
    height: 26px;
  }

  /* Ajustar reporte de taras y bolsas */
  .reporte-taras-bolsas {
    display: flex;
    gap: 6px;
  }

  .reporte-item {
    flex: 1;
    min-width: 0;
  }

  /* Responsive para pantallas muy pequeñas */
  @media (max-width: 480px) {
    .productos-container {
      grid-template-columns: repeat(2, 1fr); /* Mantener dos columnas */
      gap: 6px;
      padding: 6px;
    }

    .producto {
      padding: 6px;
    }

    .form-control {
      font-size: 13px;
      height: 30px;
    }

    .input-group input {
      font-size: 13px;
    }
  }

  /* Ajustes para mantener la usabilidad */
  .tipo-select,
  .medida-input {
    width: 100%;
    margin-bottom: 4px;
  }

  /* Mantener los botones de acción accesibles */
  .botones-accion {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  /* Ajustar el espacio entre productos */
  .producto:not(:last-child) {
    margin-bottom: 8px;
  }
}

.btn-bloqueo {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.btn-bloqueo:not(.bloqueado) {
  background-color: #2ecc71;
  color: white;
}

.btn-bloqueo.bloqueado {
  background-color: #e74c3c;
  color: white;
}

.btn-bloqueo i {
  font-size: 1.1em;
}

@media (max-width: 768px) {
  .botones {
    flex-direction: row; /* Cambiado de column a row para mantener los botones en la misma fila */
    gap: 8px;
    flex-wrap: wrap; /* Permite que los botones se envuelvan si no caben en una línea */
    justify-content: space-between; /* Distribuye el espacio entre los botones */
  }
  
  .btn-bloqueo, .btn-volver {
    flex: 1; /* Permite que los botones crezcan para ocupar el espacio disponible */
    min-width: 150px; /* Establece un ancho mínimo para los botones */
    justify-content: center;
  }
}

[disabled] {
  opacity: 0.6;
  cursor: not-allowed !important;
}

.bloqueado button:disabled,
.bloqueado input:disabled,
.bloqueado select:disabled {
  background-color: #f5f5f5;
  border-color: #ddd;
}

.btn-bloqueo:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.medida-texto.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.disabled {
  pointer-events: none;
  opacity: 0.6;
}

input:disabled,
select:disabled,
button:disabled {
  background-color: #f5f5f5;
  border-color: #ddd;
  cursor: not-allowed;
}

.btn-alt:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-nota-cliente {
  padding: 8px 16px;
  margin: 4px;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-weight: bold;
  transition: opacity 0.3s;
}

.btn-nota-cliente:hover {
  opacity: 0.8;
}

.medida-texto {
  font-weight: bold;
}

.medida-texto .ch20-text {
  color: #3498db;
}

@media (max-width: 768px) {
  .cliente-info h3 {
    font-size: 1.2rem;
  }

  .cliente-totales span {
    font-size: 0.8rem;
    padding: 1px 4px;
  }

  .cliente-header-controls {
    gap: 4px;
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .juntar-medidas-checkbox,
  .generar-nota,
  .eliminar-cliente {
    padding: 1px 6px;
    height: 24px;
    font-size: 0.75rem;
    width: auto;
    min-width: fit-content;
  }

  .cliente-totales {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .cliente-totales span {
    width: auto;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

@media (max-width: 480px) {
  .cliente-header-controls {
    width: 100%;
  }
  
  .cliente-totales {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 768px) {
  .cliente-info h3 {
    font-size: 1.2rem;
    display: none;
  }

  .cliente-totales span {
    font-size: 0.8rem;
    padding: 1px 4px;
  }

  .cliente-header-controls {
    gap: 4px;
    flex-wrap: wrap;
    justify-content: flex-start;
  }
}

/* Estilo para el cliente seleccionado */
.cliente-seleccionado {
  animation: highlight-cliente 2s ease;
}

@keyframes highlight-cliente {
  0% {
    background-color: rgba(255, 255, 0, 0.3);
  }
  100% {
    background-color: transparent;
  }
}

/* Estilo para el botón de PDF mini */
.btn-pdf-mini {
  background: none;
  border: none;
  color: #e74c3c;
  font-size: 0.8rem;
  padding: 0 5px;
  cursor: pointer;
  vertical-align: middle;
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.btn-pdf-mini:hover {
  opacity: 1;
}

@media (max-width: 768px) {
  .btn-pdf-mini {
    display: inline-block;
  }
  
  .cliente-info h3 {
    display: flex;
    align-items: center;
    gap: 5px;
  }
}

/* Estilos para la barra lateral de clientes */
.nuevo-embarque-container {
  display: flex;
  width: 100%;
  position: relative;
}

.sidebar-clientes {
  width: 100px;
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  padding: 15px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: width 0.3s ease;
}

.sidebar-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 10px;
  margin-bottom: 20px;
}

.sidebar-header h3 {
  color: white;
  font-size: 16px;
  margin: 0;
}

.toggle-sidebar-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 5px;
  font-size: 14px;
}

.sidebar-clientes-contenido {
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 100%;
  align-items: center;
}

.sidebar-clientes .btn-nota-cliente {
  width: 80px;
  padding: 12px 0;
  margin: 0;
  border-radius: 6px;
  font-size: 14px;
  text-align: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.sidebar-clientes .btn-nota-cliente span {
  display: block;
  transition: opacity 0.3s ease;
}

.sidebar-clientes .btn-nota-cliente:hover {
  transform: translateX(5px);
  opacity: 1;
}

.sidebar-clientes .btn-nota-cliente.activo {
  transform: translateX(5px);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

.sidebar-collapsed {
  width: 40px;
}

.sidebar-collapsed .sidebar-header h3,
.sidebar-collapsed .btn-nota-cliente span {
  opacity: 0;
}

.sidebar-collapsed .btn-nota-cliente {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  padding: 0;
}

.sidebar-toggle-mobile {
  display: none;
  position: absolute;
  top: 50%;
  right: -15px;
  transform: translateY(-50%);
}

.toggle-sidebar-mobile-btn {
  background-color: rgba(0, 0, 0, 0.7);
  border: none;
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
}

.nuevo-embarque {
  flex: 1;
  margin-left: 100px;
  width: calc(100% - 100px);
  transition: margin-left 0.3s ease, width 0.3s ease;
}

.sidebar-collapsed + .nuevo-embarque {
  margin-left: 40px;
  width: calc(100% - 40px);
}

/* Ajustes responsivos para la barra lateral */
@media (max-width: 768px) {
  .sidebar-clientes {
    width: 70px;
  }
  
  .sidebar-clientes .btn-nota-cliente {
    width: 60px;
    font-size: 12px;
    padding: 10px 0;
  }
  
  .nuevo-embarque {
    margin-left: 70px;
    width: calc(100% - 70px);
  }
  
  .sidebar-collapsed {
    width: 30px;
  }
  
  .sidebar-collapsed + .nuevo-embarque {
    margin-left: 30px;
    width: calc(100% - 30px);
  }
  
  .sidebar-toggle-mobile {
    display: block;
  }
}

@media (max-width: 480px) {
  .sidebar-clientes {
    width: 50px;
  }
  
  .sidebar-clientes .btn-nota-cliente {
    width: 40px;
    font-size: 10px;
    padding: 8px 0;
  }
  
  .nuevo-embarque {
    margin-left: 50px;
    width: calc(100% - 50px);
  }
  
  .sidebar-collapsed {
    width: 0;
    padding: 0;
    overflow: hidden;
  }
  
  .sidebar-collapsed + .nuevo-embarque {
    margin-left: 0;
    width: 100%;
  }
}

/* Estilos para el modal de nuevo cliente */
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

.modal-contenido {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 300px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1001;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.5rem;
}

.btn-cerrar-modal {
  background: none;
  border: none;
  color: #333;
  font-size: 1.5rem;
  cursor: pointer;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: bold;
}

.form-control {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-primary {
  background-color: #28a745;
  color: white;
}

/* Estilos para el botón de agregar cliente */
.btn-agregar-cliente {
  width: 80px;
  padding: 12px 0;
  margin: 0;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  text-align: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  font-weight: bold;
  background-color: #27ae60;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.btn-agregar-cliente i {
  font-size: 16px;
  margin-bottom: 5px;
}

.btn-agregar-cliente:hover {
  transform: translateX(5px);
  opacity: 0.9;
}

.sidebar-collapsed .btn-agregar-cliente {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  padding: 0;
}

.sidebar-collapsed .btn-agregar-cliente span {
  display: none;
}

.color-picker {
  height: 40px;
  padding: 0;
  width: 100%;
}

/* Estilos para el modal de nuevo cliente */
/* ... existing code ... */

.sidebar-collapsed .btn-agregar-cliente span {
  display: none;
}

.color-picker {
  height: 40px;
  padding: 0;
  width: 100%;
}

/* Estilos para el resumen en la barra lateral */
.sidebar-resumen {
  position: fixed;
  bottom: 20px;
  left: 0;
  width: 100px;
  background-color: #c7e2fe;
  padding: 10px;
  border-radius: 0 5px 5px 0;
  box-shadow: 2px 2px 5px rgba(0,0,0,0.1);
  font-size: 12px;
  z-index: 100;
}

.sidebar-resumen h4 {
  font-size: 13px;
  margin: 8px 0 5px 0;
  color: #333;
  font-weight: bold;
  border-bottom: 1px solid #ddd;
}

.sidebar-resumen .sidebar-item {
  display: flex;
  justify-content: space-between;
  margin: 3px 0;
}

.sidebar-resumen .total {
  margin-top: 5px;
  font-weight: bold;
  border-top: 1px solid #ddd;
  padding-top: 3px;
}

/* Estilos para el modal de nuevo cliente */
/* ... existing code ... */

.botones-accion {
  display: flex;
  gap: 10px;
  margin: 15px 0;
  flex-wrap: wrap;
  justify-content: center;
}

.botones-accion .btn {
  padding: 8px 15px;
  font-size: 14px;
}

.botones {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  align-items: center;
}

@media (max-width: 768px) {
  .botones {
    flex-direction: row; /* Cambiado de column a row para mantener los botones en la misma fila */
    gap: 8px;
    flex-wrap: wrap; /* Permite que los botones se envuelvan si no caben en una línea */
    justify-content: space-between; /* Distribuye el espacio entre los botones */
  }
}

.botones {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  align-items: center;
}

.btn-volver, .btn-bloqueo {
  flex: 1;
  padding: 8px 16px;
  min-width: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 1rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

@media (max-width: 768px) {
  .botones {
    flex-direction: row;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: space-between;
  }
  
  .btn-volver, .btn-bloqueo {
    min-width: 150px;
  }
}

.sidebar-resumen .sidebar-item.taras-total {
  color: #ff0000;
  font-weight: bold;
}

.sidebar-resumen .sidebar-item.taras-total span {
  color: #ff0000;
}

.sidebar-resumen .sidebar-item.total {
  border-top: 1px solid #ddd;
  margin-top: 5px;
  padding-top: 5px;
  color: #ff0000;
  font-weight: bold;
}

.sidebar-resumen .sidebar-item.total strong {
  color: #ff0000;
}

/* Estilos para el botón de generar PDF */
.generar-pdf-cliente {
  display: flex;
  align-items: center;
  gap: 5px;
  background-color: #3760b0;
  border-color: #3760b0;
  margin-right: 10px;
}

.generar-pdf-cliente:hover {
  background-color: #2a4b8a;
  border-color: #2a4b8a;
}

@media (max-width: 768px) {
  .generar-pdf-cliente {
    padding: 4px 8px;
    font-size: 12px;
  }
  
  .cliente-header-controls {
    flex-wrap: wrap;
    gap: 5px;
  }
}

/* Estilos para el modal de nombre alternativo */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-contenido {
  background-color: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h3 {
  margin: 0;
  color: #3760b0;
}

.btn-cerrar-modal {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #666;
}

.modal-body {
  padding: 15px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 15px;
  border-top: 1px solid #e0e0e0;
}

/* Estilos específicos para el modal de nombre alternativo */
#nombreAlternativoPDF {
  font-size: 16px;
  padding: 8px;
}

.form-text {
  font-size: 14px;
  color: #666;
  margin-top: 5px;
}

@media (max-width: 768px) {
  .modal-contenido {
    width: 95%;
  }
}

/* Mejorar la visualización del nombre de la medida para indicar que es clickeable */
.medida-texto {
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
  padding-right: 20px;
}

.medida-texto:not(.disabled):hover {
  color: #3760b0;
}

.medida-texto:not(.disabled)::after {
  content: '\f040'; /* Ícono de lápiz de FontAwesome */
  font-family: 'Font Awesome 5 Free';
  font-weight: 900;
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.medida-texto:not(.disabled):hover::after {
  opacity: 1;
}

.medida-texto.tiene-nombre-alternativo {
  color: #3760b0;
  font-weight: bold;
}

@media (max-width: 768px) {
  .modal-contenido {
    width: 95%;
  }
}

.pdf-badge {
  display: inline-block;
  background-color: #3760b0;
  color: white;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 3px;
  margin-left: 5px;
  vertical-align: middle;
  font-weight: bold;
}

@media (max-width: 768px) {
  .modal-contenido {
    width: 95%;
  }
  
  .pdf-badge {
    font-size: 8px;
    padding: 1px 3px;
  }
}

.cliente-personalizado {
  border: 2px dashed #fff;
  position: relative;
}

.cliente-personalizado::after {
  content: "P";
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 10px;
  background-color: rgba(255, 255, 255, 0.7);
  color: #333;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Loader spinner styles */
.loader-inline {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
  margin-right: 8px;
  vertical-align: middle;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.generar-pdf-cliente {
  display: flex;
  align-items: center;
  gap: 5px;
  background-color: #3760b0;
  border-color: #3760b0;
}

.crear-cuenta-joselito {
  display: flex;
  align-items: center;
  gap: 5px;
  background-color: #28a745;
  border-color: #28a745;
  color: white;
}

.crear-cuenta-joselito:hover {
  background-color: #218838;
  border-color: #1e7e34;
}

.crear-cuenta-joselito:disabled {
  background-color: #6c757d;
  border-color: #6c757d;
  cursor: not-allowed;
}

.crear-cuenta-catarro {
  display: flex;
  align-items: center;
  gap: 5px;
  background-color: #e74c3c;
  border-color: #e74c3c;
  color: white;
}

.crear-cuenta-catarro:hover {
  background-color: #c0392b;
  border-color: #c0392b;
}

.crear-cuenta-catarro:disabled {
  background-color: #6c757d;
  border-color: #6c757d;
  cursor: not-allowed;
}

.btn-crear-cuenta {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.btn-crear-cuenta:hover {
  background-color: #c0392b;
  transform: translateY(-2px);
}

.btn-crear-cuenta:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
  transform: none;
}
</style>


 


