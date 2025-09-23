<template>
  <div>
    <div v-if="!mostrarImpresion" class="pedidos-limpio-container">
      <h2>Pedido de Camarón Limpio</h2>
      
      <div class="header-container">
        <div class="volver-container">
          <button @click="$router.push('/procesos/pedidos')" class="btn-volver">
            <i class="fas fa-arrow-left"></i> Volver
          </button>
        </div>
        <div class="fecha-container">
          <label for="fecha">Fecha:</label>
          <input 
            type="date" 
            id="fecha" 
            v-model="fecha" 
            required
            :max="fechaMaxima">
        </div>
        <div class="totales-generales">
          <div class="total-item">
            <span class="total-label">Total Taras:</span>
            <span class="total-value">{{ totalesGenerales.tarasTotal }} T</span>
          </div>
          <div class="total-item">
            <span class="total-label">Total Kilos:</span>
            <span class="total-value">{{ totalesGenerales.kilosTotal }} kg</span>
          </div>
        </div>
        <MedidasModal @medidas-actualizadas="actualizarMedidas" />
      </div>

      <!-- Sistema de Tabs para clientes -->
      <div class="tabs-container">
        <div v-for="cliente in clientes" :key="cliente.id" class="tab-wrapper">
          <button 
            @click="clienteActivo = cliente.id"
            :class="['tab-button', { 'active': clienteActivo === cliente.id }]"
            :data-cliente="cliente.id"
          >
            {{ cliente.nombre }}
          </button>
          <div class="tab-totales" v-if="cliente.id === 'otilio'">
            <div>Taras: {{ calculosOtilio.tarasTotal }} T</div>
            <div>Kilos: {{ calculosOtilio.kilosTotal }} kg</div>
          </div>
          <div class="tab-totales" v-if="cliente.id === 'catarro'">
            <div>Taras: {{ calculosCatarro.tarasTotal }} T</div>
            <div>Kilos: {{ calculosCatarro.kilosTotal }} kg</div>
          </div>
          <div class="tab-totales" v-if="cliente.id === 'joselito'">
            <div>Taras: {{ calculosJoselito.tarasTotal }} T</div>
            <div>Kilos: {{ calculosJoselito.kilosTotal }} kg</div>
          </div>
          <div class="tab-totales" v-if="cliente.id === 'lorena'">
            <div>Taras: {{ calculosLorena.tarasTotal }} T</div>
            <div>Kilos: {{ calculosLorena.kilosTotal }} kg</div>
          </div>
          <div class="tab-totales" v-if="cliente.id === 'ozuna'">
            <div>Taras: {{ calculosOzuna.tarasTotal }} T</div>
            <div>Kilos: {{ calculosOzuna.kilosTotal }} kg</div>
          </div>
        </div>

        <!-- Clientes Temporales -->
        <div v-for="(cliente, id) in clientesTemporales" :key="id" class="tab-wrapper">
          <div class="tab-cliente-container">
            <button 
              @click="clienteActivo = cliente.id"
              :class="['tab-button temporal', { 'active': clienteActivo === cliente.id }]"
            >
              {{ cliente.nombre }}
            </button>
            <button 
              @click="confirmarEliminarCliente(cliente.id, cliente.nombre)"
              class="btn-eliminar-cliente"
              title="Eliminar cliente"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="tab-totales">
            <div>Taras: {{ calcularTotalesTemporales(cliente.id).tarasTotal }} T</div>
            <div>Kilos: {{ calcularTotalesTemporales(cliente.id).kilosTotal }} kg</div>
          </div>
        </div>
        
        <!-- Botón para agregar nuevo cliente -->
        <div class="tab-wrapper">
          <button 
            @click="mostrarModalNuevoCliente = true"
            class="tab-button nuevo-cliente"
          >
            + Nuevo Cliente
          </button>
        </div>
      </div>

      <!-- Contenido de cada cliente -->
      <div class="clientes-content">
        <!-- Otilio -->
        <div v-show="clienteActivo === 'otilio'" class="cliente-seccion">
          <button 
            @click="agregarFilaOtilio" 
            class="btn-agregar"
            :class="{
              'bg-otilio': clienteActivo === 'otilio',
              'bg-catarro': clienteActivo === 'catarro',
              'bg-joselito': clienteActivo === 'joselito',
              'bg-lorena': clienteActivo === 'lorena',
              'bg-ozuna': clienteActivo === 'ozuna',
              'bg-temporal': isClienteTemporal(clienteActivo)
            }"
          >
            + Agregar Fila
          </button>
          
          <div class="pedido-grid">
            <div v-for="(item, index) in pedidoOtilio" :key="index" class="pedido-item">
              <div class="input-row">
                <div class="input-group-compact kilos">
                  <div class="label-container">
                    <label>Kilos:</label>
                    <div class="tara-checkbox">
                      <input type="checkbox" v-model="item.esTara" :id="'tara' + index">
                      <label :for="'tara' + index">T</label>
                    </div>
                  </div>
                  <input type="number" v-model="item.kilos" class="input-field">
                </div>

                <div class="input-group-compact medida">
                  <div class="label-container">
                    <label>Medida:</label>
                    <button 
                      class="btn-proveedor"
                      @click="abrirModalProveedor(item)"
                      :class="{ 'active': item.esProveedor }"
                      :title="item.proveedor || 'Agregar proveedor'"
                    >
                      P
                    </button>
                  </div>
                  <select v-model="item.medida" class="input-field">
                    <option value="">Seleccionar</option>
                    <option v-for="medida in medidasOrdenadas" :key="medida.id" :value="medida.nombre">
                      {{ medida.nombre }}
                    </option>
                  </select>
                </div>

                <div class="input-group-compact tipo">
                  <div class="label-container">
                    <label>Tipo:</label>
                    <select v-model="item.nota" class="input-field-notas">
                      <option value="">Notas</option>
                      <option value="Sellado">Sellado</option>
                      <option value="Kileado">Kileado</option>
                    </select>
                  </div>
                  <select v-model="item.tipo" class="input-field" :class="{ 'text-blue': item.tipo === 'C/H20' }">
                    <option value="">Seleccionar</option>
                    <option value="S/H20">S/H20</option>
                    <option value="C/H20" class="text-blue">C/H20</option>
                  </select>
                </div>

                <button @click="eliminarPedidoOtilio(index)" class="btn-eliminar" v-if="pedidoOtilio.length > 1">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Catarro -->
        <div v-show="clienteActivo === 'catarro'" class="cliente-seccion">
          <button 
            @click="agregarFilaCatarro" 
            class="btn-agregar"
            :class="{
              'bg-otilio': clienteActivo === 'otilio',
              'bg-catarro': clienteActivo === 'catarro',
              'bg-joselito': clienteActivo === 'joselito',
              'bg-lorena': clienteActivo === 'lorena',
              'bg-ozuna': clienteActivo === 'ozuna',
              'bg-temporal': isClienteTemporal(clienteActivo)
            }"
          >
            + Agregar Fila
          </button>
          
          <div class="pedido-grid">
            <div v-for="(item, index) in pedidoCatarro" :key="index" class="pedido-item">
              <div class="input-row">
                <div class="input-group-compact kilos">
                  <div class="label-container">
                    <label>Kilos:</label>
                    <div class="tara-checkbox">
                      <input type="checkbox" v-model="item.esTara" :id="'tara' + index">
                      <label :for="'tara' + index">T</label>
                    </div>
                  </div>
                  <input type="number" v-model="item.kilos" class="input-field">
                </div>

                <div class="input-group-compact medida">
                  <div class="label-container">
                    <label>Medida:</label>
                    <button 
                      class="btn-proveedor"
                      @click="abrirModalProveedor(item)"
                      :class="{ 'active': item.esProveedor }"
                      :title="item.proveedor || 'Agregar proveedor'"
                    >
                      P
                    </button>
                  </div>
                  <select v-model="item.medida" class="input-field">
                    <option value="">Seleccionar</option>
                    <option v-for="medida in medidasOrdenadas" :key="medida.id" :value="medida.nombre">
                      {{ medida.nombre }}
                    </option>
                  </select>
                </div>

                <div class="input-group-compact tipo">
                  <div class="label-container">
                    <label>Tipo:</label>
                    <select v-model="item.nota" class="input-field-notas">
                      <option value="">Notas</option>
                      <option value="Sellado">Sellado</option>
                      <option value="Kileado">Kileado</option>
                    </select>
                  </div>
                  <select v-model="item.tipo" class="input-field" :class="{ 'text-blue': item.tipo === 'C/H20' }">
                    <option value="">Seleccionar</option>
                    <option value="S/H20">S/H20</option>
                    <option value="C/H20" class="text-blue">C/H20</option>
                  </select>
                </div>

                <button @click="eliminarPedidoCatarro(index)" class="btn-eliminar" v-if="pedidoCatarro.length > 1">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Joselito -->
        <div v-show="clienteActivo === 'joselito'" class="cliente-seccion">
          <button 
            @click="agregarFilaJoselito" 
            class="btn-agregar"
            :class="{
              'bg-otilio': clienteActivo === 'otilio',
              'bg-catarro': clienteActivo === 'catarro',
              'bg-joselito': clienteActivo === 'joselito',
              'bg-lorena': clienteActivo === 'lorena',
              'bg-ozuna': clienteActivo === 'ozuna',
              'bg-temporal': isClienteTemporal(clienteActivo)
            }"
          >
            + Agregar Fila
          </button>
          
          <div class="pedido-grid">
            <div v-for="(item, index) in pedidoJoselito" :key="index" class="pedido-item">
              <div class="input-row">
                <div class="input-group-compact kilos">
                  <div class="label-container">
                    <label>Kilos:</label>
                    <div class="tara-checkbox">
                      <input type="checkbox" v-model="item.esTara" :id="'tara' + index">
                      <label :for="'tara' + index">T</label>
                    </div>
                  </div>
                  <input type="number" v-model="item.kilos" class="input-field">
                </div>

                <div class="input-group-compact medida">
                  <div class="label-container">
                    <label>Medida:</label>
                    <button 
                      class="btn-proveedor"
                      @click="abrirModalProveedor(item)"
                      :class="{ 'active': item.esProveedor }"
                      :title="item.proveedor || 'Agregar proveedor'"
                    >
                      P
                    </button>
                  </div>
                  <select v-model="item.medida" class="input-field">
                    <option value="">Seleccionar</option>
                    <option v-for="medida in medidasOrdenadas" :key="medida.id" :value="medida.nombre">
                      {{ medida.nombre }}
                    </option>
                  </select>
                </div>

                <div class="input-group-compact tipo">
                  <div class="label-container">
                    <label>Tipo:</label>
                    <select v-model="item.nota" class="input-field-notas">
                      <option value="">Notas</option>
                      <option value="Sellado">Sellado</option>
                      <option value="Kileado">Kileado</option>
                    </select>
                  </div>
                  <select v-model="item.tipo" class="input-field" :class="{ 'text-blue': item.tipo === 'C/H20' || item.tipo === '1.35 y .15' || item.tipo === '1.5 y .3' }">
                    <option value="">Seleccionar</option>
                    <option value="S/H20">S/H20</option>
                    <option value="C/H20" class="text-blue">C/H20</option>
                    <option value="1.35 y .15" class="text-blue">1.35 y .15</option>
                    <option value="1.5 y .3" class="text-blue">1.5 y .3</option>
                  </select>
                </div>

                <button @click="eliminarPedidoJoselito(index)" class="btn-eliminar" v-if="pedidoJoselito.length > 1">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Lorena -->
        <div v-show="clienteActivo === 'lorena'" class="cliente-seccion">
          <button 
            @click="agregarFilaLorena" 
            class="btn-agregar"
            :class="{
              'bg-otilio': clienteActivo === 'otilio',
              'bg-catarro': clienteActivo === 'catarro',
              'bg-joselito': clienteActivo === 'joselito',
              'bg-lorena': clienteActivo === 'lorena',
              'bg-ozuna': clienteActivo === 'ozuna',
              'bg-temporal': isClienteTemporal(clienteActivo)
            }"
          >
            + Agregar Fila
          </button>
          
          <div class="pedido-grid">
            <div v-for="(item, index) in pedidoLorena" :key="index" class="pedido-item">
              <div class="input-row">
                <div class="input-group-compact kilos">
                  <div class="label-container">
                    <label>Kilos:</label>
                    <div class="tara-checkbox">
                      <input type="checkbox" v-model="item.esTara" :id="'tara' + index">
                      <label :for="'tara' + index">T</label>
                    </div>
                  </div>
                  <input type="number" v-model="item.kilos" class="input-field">
                </div>

                <div class="input-group-compact medida">
                  <div class="label-container">
                    <label>Medida:</label>
                    <button 
                      class="btn-proveedor"
                      @click="abrirModalProveedor(item)"
                      :class="{ 'active': item.esProveedor }"
                      :title="item.proveedor || 'Agregar proveedor'"
                    >
                      P
                    </button>
                  </div>
                  <select v-model="item.medida" class="input-field">
                    <option value="">Seleccionar</option>
                    <option v-for="medida in medidasOrdenadas" :key="medida.id" :value="medida.nombre">
                      {{ medida.nombre }}
                    </option>
                  </select>
                </div>

                <div class="input-group-compact tipo">
                  <div class="label-container">
                    <label>Tipo:</label>
                    <select v-model="item.nota" class="input-field-notas">
                      <option value="">Notas</option>
                      <option value="Sellado">Sellado</option>
                      <option value="Kileado">Kileado</option>
                    </select>
                  </div>
                  <select 
                    v-model="item.tipo" 
                    class="input-field" 
                    :class="{ 'text-blue': item.tipo === 'C/H20' || item.tipo === '1.35 y .15' || item.tipo === '1.5 y .3' }"
                  >
                    <option value="">Seleccionar</option>
                    <option value="S/H20">S/H20</option>
                    <option value="C/H20" class="text-blue">C/H20</option>
                    <option value="1.35 y .15" class="text-blue">1.35 y .15</option>
                    <option value="1.5 y .3" class="text-blue">1.5 y .3</option>
                  </select>
                </div>

                <button @click="eliminarPedidoLorena(index)" class="btn-eliminar" v-if="pedidoLorena.length > 1">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Ozuna -->
        <div v-show="clienteActivo === 'ozuna'" class="cliente-seccion">
          <button 
            @click="agregarFilaOzuna" 
            class="btn-agregar"
            :class="{
              'bg-otilio': clienteActivo === 'otilio',
              'bg-catarro': clienteActivo === 'catarro',
              'bg-joselito': clienteActivo === 'joselito',
              'bg-lorena': clienteActivo === 'lorena',
              'bg-ozuna': clienteActivo === 'ozuna',
              'bg-temporal': isClienteTemporal(clienteActivo)
            }"
          >
            + Agregar Fila
          </button>
          
          <div class="pedido-grid">
            <div v-for="(item, index) in pedidoOzuna" :key="index" class="pedido-item">
              <div class="input-row">
                <div class="input-group-compact kilos">
                  <div class="label-container">
                    <label>Kilos:</label>
                    <div class="tara-checkbox">
                      <input type="checkbox" v-model="item.esTara" :id="'tara' + index">
                      <label :for="'tara' + index">T</label>
                    </div>
                  </div>
                  <input type="number" v-model="item.kilos" class="input-field">
                </div>

                <div class="input-group-compact medida">
                  <div class="label-container">
                    <label>Medida:</label>
                    <button 
                      class="btn-proveedor"
                      @click="abrirModalProveedor(item)"
                      :class="{ 'active': item.esProveedor }"
                      :title="item.proveedor || 'Agregar proveedor'"
                    >
                      P
                    </button>
                  </div>
                  <select v-model="item.medida" class="input-field">
                    <option value="">Seleccionar</option>
                    <option v-for="medida in medidasOrdenadas" :key="medida.id" :value="medida.nombre">
                      {{ medida.nombre }}
                    </option>
                  </select>
                </div>

                <div class="input-group-compact tipo">
                  <div class="label-container">
                    <label>Tipo:</label>
                    <select v-model="item.nota" class="input-field-notas">
                      <option value="">Notas</option>
                      <option value="Sellado">Sellado</option>
                      <option value="Kileado">Kileado</option>
                    </select>
                  </div>
                  <select v-model="item.tipo" class="input-field" :class="{ 'text-blue': item.tipo === 'C/H20' }">
                    <option value="">Seleccionar</option>
                    <option value="S/H20">S/H20</option>
                    <option value="C/H20" class="text-blue">C/H20</option>
                    <option value=".7 y .3">.7 y .3</option>
                  </select>
                </div>

                <div v-if="clienteActivo === 'ozuna'" class="input-group-compact maquila">
                  <div class="label-container">
                    <label>Maquila:</label>
                    <div class="maquila-checkbox">
                      <input 
                        type="checkbox" 
                        v-model="item.esMaquila" 
                        :id="'maquila' + index"
                      >
                    </div>
                  </div>
                </div>

                <button @click="eliminarPedidoOzuna(index)" class="btn-eliminar" v-if="pedidoOzuna.length > 1">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Clientes Temporales -->
        <div v-for="(cliente, id) in clientesTemporales" 
             :key="id"
             v-show="clienteActivo === cliente.id" 
             class="cliente-seccion">
          <button 
            @click="agregarFilaTemporal(cliente.id)" 
            class="btn-agregar"
            :class="{
              'bg-otilio': clienteActivo === 'otilio',
              'bg-catarro': clienteActivo === 'catarro',
              'bg-joselito': clienteActivo === 'joselito',
              'bg-ozuna': clienteActivo === 'ozuna',
              'bg-temporal': isClienteTemporal(clienteActivo)
            }"
          >
            + Agregar Fila
          </button>
          
          <div class="pedido-grid">
            <div v-for="(item, index) in cliente.pedidos" :key="index" class="pedido-item">
              <div class="input-row">
                <div class="input-group-compact kilos">
                  <div class="label-container">
                    <label>Kilos:</label>
                    <div class="tara-checkbox">
                      <input type="checkbox" v-model="item.esTara" :id="'tara' + cliente.id + index">
                      <label :for="'tara' + cliente.id + index">T</label>
                    </div>
                  </div>
                  <input type="number" v-model="item.kilos" class="input-field">
                </div>

                <div class="input-group-compact medida">
                  <div class="label-container">
                    <label>Medida:</label>
                    <button 
                      class="btn-proveedor"
                      @click="abrirModalProveedor(item)"
                      :class="{ 'active': item.esProveedor }"
                      :title="item.proveedor || 'Agregar proveedor'"
                    >
                      P
                    </button>
                  </div>
                  <select v-model="item.medida" class="input-field">
                    <option value="">Seleccionar</option>
                    <option v-for="medida in medidasOrdenadas" :key="medida.id" :value="medida.nombre">
                      {{ medida.nombre }}
                    </option>
                  </select>
                </div>

                <div class="input-group-compact tipo">
                  <div class="label-container">
                    <label>Tipo:</label>
                    <select v-model="item.nota" class="input-field-notas">
                      <option value="">Notas</option>
                      <option value="Sellado">Sellado</option>
                      <option value="Kileado">Kileado</option>
                    </select>
                  </div>
                  <select v-model="item.tipo" class="input-field" :class="{ 'text-blue': item.tipo === 'C/H20' || item.tipo === '1.35 y .15' || item.tipo === '1.5 y .3' }">
                    <option value="">Seleccionar</option>
                    <option value="S/H20">S/H20</option>
                    <option value="C/H20" class="text-blue">C/H20</option>
                    <option value="1.35 y .15" class="text-blue">1.35 y .15</option>
                    <option value="1.5 y .3" class="text-blue">1.5 y .3</option>
                    <option value=".9 y .1">.9 y .1</option>
                    <option value=".9">.9</option>
                  </select>
                </div>

                <div class="input-group-compact operacion">
                  <div class="label-container">
                    <label>Operación:</label>
                  </div>
                  <select v-model="item.tipoOperacion" class="input-field">
                    <option value="">Seleccionar</option>
                    <option value="Venta">Venta</option>
                    <option value="Maquila">Maquila</option>
                  </select>
                </div>

                <button @click="eliminarPedidoTemporal(cliente.id, index)" class="btn-eliminar" v-if="cliente.pedidos.length > 1">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="buttons-container">
        <button @click="guardarPedido" class="btn-guardar">Guardar Pedido</button>
        <button @click="mostrarVistaImpresion" class="btn-imprimir">
          <i class="fas fa-print"></i> Vista Previa
        </button>
        <button @click="$router.push('/procesos/pedidos')" class="btn-cancelar">Cancelar</button>
      </div>
    </div>

    <PedidoLimpioImpresion
      v-else
      :fecha="fecha"
      :id="pedidoId"
      :pedidoOtilio="pedidoOtilio"
      :pedidoCatarro="pedidoCatarro"
      :pedidoJoselito="pedidoJoselito"
      :pedidoLorena="pedidoLorena"
      :pedidoOzuna="pedidoOzuna"
      :clientesTemporales="clientesTemporales"
      :rendimientosGuardados="rendimientosGuardados"
      :divisoresGuardados="divisoresGuardados"
      :completadosGuardados="completadosGuardados"
      :kilosRefrigeradosGuardados="kilosRefrigeradosGuardados"
      @actualizar-rendimientos="actualizarRendimientos"
      @actualizar-divisores="actualizarDivisores"
      @actualizar-completados="actualizarCompletados"
      @actualizar-kilos-refrigerados="actualizarKilosRefrigerados"
      @volver="mostrarImpresion = false"
    />

    <ProveedorModal
      :mostrar="mostrarModalProveedor"
      :proveedor="itemSeleccionado ? itemSeleccionado.proveedor : ''"
      @cerrar="mostrarModalProveedor = false"
      @guardar="guardarProveedor"
    />

    <NuevoClienteModal
      :mostrar="mostrarModalNuevoCliente"
      @cerrar="mostrarModalNuevoCliente = false"
      @guardar="agregarClienteTemporal"
    />
  </div>
</template>

<script>
import { db } from '@/firebase'
import { collection, addDoc, Timestamp, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore'
import PedidoLimpioImpresion from './PedidoLimpioImpresion.vue'
import MedidasModal from '@/components/MedidasModal.vue'
import ProveedorModal from '@/components/ProveedorModal.vue'
import NuevoClienteModal from '@/components/NuevoClienteModal.vue'

export default {
  name: 'PedidosLimpio',
  components: {
    PedidoLimpioImpresion,
    MedidasModal,
    ProveedorModal,
    NuevoClienteModal
  },
  data() {
    return {
      fecha: new Date().toISOString().split('T')[0],
      pedidoOtilio: [{ kilos: null, medida: '', tipo: '', esTara: true, esProveedor: false, proveedor: '' }],
      pedidoCatarro: [{ kilos: null, medida: '', tipo: 'S/H20', esTara: false, esProveedor: false, proveedor: '' }],
      pedidoJoselito: [{ kilos: null, medida: '', tipo: '', esTara: false, esProveedor: false, proveedor: '' }],
      pedidoOzuna: [{ kilos: null, medida: '', tipo: 'S/H20', esTara: false, esProveedor: false, proveedor: '', esMaquila: true }],
      pedidoLorena: [{ kilos: null, medida: '', tipo: '', esTara: false, esProveedor: false, proveedor: '' }],
      clientesTemporales: {},
      mostrarModalNuevoCliente: false,
      mostrarImpresion: false,
      mostrarModalProveedor: false,
      itemSeleccionado: null,
      medidas: [],
      editando: false,
      pedidoId: null,
      clienteActivo: 'otilio',
      clientes: [
        { id: 'otilio', nombre: 'Otilio' },
        { id: 'catarro', nombre: 'Catarro' },
        { id: 'joselito', nombre: 'Joselito' },
        { id: 'lorena', nombre: 'Lorena' },
        { id: 'ozuna', nombre: 'Ozuna' }
      ],
      itemSeleccionadoNotas: null,
      rendimientosGuardados: {},
      divisoresGuardados: {},
      completadosGuardados: {},
      kilosRefrigeradosGuardados: {}
    }
  },
  async created() {
    await this.cargarMedidas();
    
    // Verificar si estamos editando un pedido existente
    const { edit, id, fecha } = this.$route.query;
    if (edit === 'true' && id) {
      this.editando = true;
      this.pedidoId = id;
      await this.cargarPedido(id);
    } else if (fecha) {
      this.fecha = fecha;
    }
  },
  computed: {
    fechaMaxima() {
      const maxDate = new Date()
      maxDate.setMonth(maxDate.getMonth() + 3)
      return maxDate.toISOString().split('T')[0]
    },
    medidasOrdenadas() {
      // Separar medidas especiales y de granja
      const medidasEspeciales = this.medidas.filter(m => m.tipo === 'especial')
      const medidasGranja = this.medidas.filter(m => m.tipo === 'granja')

      // Ordenar medidas especiales alfabéticamente
      medidasEspeciales.sort((a, b) => {
        // Convertir a números si es posible para ordenar numéricamente
        const numA = parseFloat(a.nombre)
        const numB = parseFloat(b.nombre)
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB
        }
        return a.nombre.localeCompare(b.nombre)
      })

      // Ordenar medidas de granja por número
      medidasGranja.sort((a, b) => {
        // Extraer los números de las medidas (ejemplo: "21/25" -> 21)
        const numA = parseFloat(a.nombre.split('/')[0])
        const numB = parseFloat(b.nombre.split('/')[0])
        
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB
        }
        return a.nombre.localeCompare(b.nombre)
      })

      // Combinar ambas listas con especiales primero
      return [...medidasEspeciales, ...medidasGranja]
    },
    // Cálculos para Otilio
    calculosOtilio() {
      let tarasDirectas = 0;
      let kilosSinH2O = 0;
      let kilosConH2O = 0;
      let kilosTaras = 0;

      this.pedidoOtilio.forEach(item => {
        if (item.kilos) {
          if (item.esTara) {
            tarasDirectas += Number(item.kilos);
            if (item.tipo === 'C/H20') {
              kilosConH2O += Number(item.kilos) * 30 * 0.65;
            } else {
              kilosTaras += Number(item.kilos) * 30;
            }
          } else if (item.tipo === 'S/H20') {
            kilosSinH2O += Number(item.kilos);
          } else if (item.tipo === 'C/H20') {
            kilosConH2O += Number(item.kilos);
          }
        }
      });

      const tarasPorKilos = kilosSinH2O / 27;
      const tarasTotal = Math.round(tarasDirectas + tarasPorKilos);
      const totalKilosSinH2O = kilosSinH2O + kilosTaras;
      const kilosTotal = Math.round(totalKilosSinH2O + kilosConH2O);

      return {
        tarasDirectas: tarasDirectas.toFixed(2),
        tarasPorKilos: tarasPorKilos.toFixed(2),
        tarasTotal: tarasTotal.toString(),
        kilosSinH2O: Math.round(totalKilosSinH2O).toString(),
        kilosConH2O: kilosConH2O.toFixed(2),
        kilosTotal: kilosTotal.toString()
      };
    },
    // Cálculos para Catarro
    calculosCatarro() {
      let tarasDirectas = 0;
      let kilosSinH2O = 0;
      let kilosConH2O = 0;
      let kilosTaras = 0;

      this.pedidoCatarro.forEach(item => {
        if (item.kilos) {
          if (item.esTara) {
            tarasDirectas += Number(item.kilos);
            if (item.tipo === 'C/H20') {
              kilosConH2O += Number(item.kilos) * 30 * 0.65;
            } else {
              kilosTaras += Number(item.kilos) * 30;
            }
          } else if (item.tipo === 'S/H20') {
            kilosSinH2O += Number(item.kilos);
          } else if (item.tipo === 'C/H20') {
            kilosConH2O += Number(item.kilos);
          }
        }
      });

      const tarasPorKilos = kilosSinH2O / 27;
      const tarasTotal = Math.round(tarasDirectas + tarasPorKilos);
      const totalKilosSinH2O = kilosSinH2O + kilosTaras;
      const kilosTotal = Math.round(totalKilosSinH2O + kilosConH2O);

      return {
        tarasDirectas: tarasDirectas.toFixed(2),
        tarasPorKilos: tarasPorKilos.toFixed(2),
        tarasTotal: tarasTotal.toString(),
        kilosSinH2O: Math.round(totalKilosSinH2O).toString(),
        kilosConH2O: kilosConH2O.toFixed(2),
        kilosTotal: kilosTotal.toString()
      };
    },
    // Cálculos para Joselito
    calculosJoselito() {
      let tarasDirectas = 0;
      let kilosSinH2O = 0;
      let kilosConH2O = 0;
      let kilosTaras = 0;
      let kilos135 = 0;
      let kilosTaras135 = 0;
      let kilos15y3 = 0;
      let kilosTaras15y3 = 0;

      this.pedidoJoselito.forEach(item => {
        if (item.kilos) {
          if (item.esTara) {
            tarasDirectas += Number(item.kilos);
            if (item.tipo === 'C/H20') {
              kilosConH2O += Number(item.kilos) * 30 * 0.65;
            } else if (item.tipo === '1.35 y .15') {
              kilosTaras135 += Number(item.kilos) * 30;
            } else if (item.tipo === '1.5 y .3') {
              kilosTaras15y3 += Number(item.kilos) * 30;
            } else {
              kilosTaras += Number(item.kilos) * 30;
            }
          } else if (item.tipo === 'S/H20') {
            kilosSinH2O += Number(item.kilos);
          } else if (item.tipo === 'C/H20') {
            kilosConH2O += Number(item.kilos);
          } else if (item.tipo === '1.35 y .15') {
            kilos135 += Number(item.kilos) * 1.35;
          } else if (item.tipo === '1.5 y .3') {
            kilos15y3 += Number(item.kilos) * 1.5;
          }
        }
      });

      const tarasPorKilos = kilosSinH2O / 25;
      const tarasPor135 = kilos135 / (1.35 * 25);
      const tarasPor15y3 = kilos15y3 / (1.5 * 25);
      const tarasTotal = Math.round(tarasDirectas + tarasPorKilos + tarasPor135 + tarasPor15y3);
      const totalKilosSinH2O = kilosSinH2O + kilosTaras + kilosTaras135 + kilosTaras15y3;
      const kilosTotal = Math.round(totalKilosSinH2O + kilosConH2O + kilos135 + kilos15y3);

      return {
        tarasDirectas: tarasDirectas.toFixed(2),
        tarasPorKilos: tarasPorKilos.toFixed(2),
        tarasTotal: tarasTotal.toString(),
        kilosSinH2O: Math.round(totalKilosSinH2O).toString(),
        kilosConH2O: kilosConH2O.toFixed(2),
        kilosTotal: kilosTotal.toString()
      };
    },
    // Cálculos para Lorena
    calculosLorena() {
      let tarasDirectas = 0;
      let kilosSinH2O = 0;
      let kilosConH2O = 0;
      let kilosTaras = 0;
      let kilos135 = 0;
      let kilosTaras135 = 0;
      let kilos15y3 = 0;
      let kilosTaras15y3 = 0;

      this.pedidoLorena.forEach(item => {
        if (item.kilos) {
          if (item.esTara) {
            tarasDirectas += Number(item.kilos);
            if (item.tipo === 'C/H20') {
              kilosConH2O += Number(item.kilos) * 30 * 0.65;
            } else if (item.tipo === '1.35 y .15') {
              kilosTaras135 += Number(item.kilos) * 30;
            } else if (item.tipo === '1.5 y .3') {
              kilosTaras15y3 += Number(item.kilos) * 30;
            } else {
              kilosTaras += Number(item.kilos) * 30;
            }
          } else if (item.tipo === 'S/H20') {
            kilosSinH2O += Number(item.kilos);
          } else if (item.tipo === 'C/H20') {
            kilosConH2O += Number(item.kilos);
          } else if (item.tipo === '1.35 y .15') {
            kilos135 += Number(item.kilos) * 1.35;
          } else if (item.tipo === '1.5 y .3') {
            kilos15y3 += Number(item.kilos) * 1.5;
          }
        }
      });

      const tarasPorKilos = kilosSinH2O / 25;
      const tarasPor135 = kilos135 / (1.35 * 25);
      const tarasPor15y3 = kilos15y3 / (1.5 * 25);
      const tarasTotal = Math.round(tarasDirectas + tarasPorKilos + tarasPor135 + tarasPor15y3);
      const totalKilosSinH2O = kilosSinH2O + kilosTaras + kilosTaras135 + kilosTaras15y3;
      const kilosTotal = Math.round(totalKilosSinH2O + kilosConH2O + kilos135 + kilos15y3);

      return {
        tarasDirectas: tarasDirectas.toFixed(2),
        tarasPorKilos: tarasPorKilos.toFixed(2),
        tarasTotal: tarasTotal.toString(),
        kilosSinH2O: Math.round(totalKilosSinH2O).toString(),
        kilosConH2O: kilosConH2O.toFixed(2),
        kilosTotal: kilosTotal.toString()
      };
    },
    // Cálculos para Ozuna
    calculosOzuna() {
      let tarasDirectas = 0;
      let kilosSinH2O = 0;
      let kilosConH2O = 0;
      let kilosTaras = 0;
      let kilos7y3 = 0;

      this.pedidoOzuna.forEach(item => {
        if (item.kilos) {
          if (item.esTara) {
            tarasDirectas += Number(item.kilos);
            if (item.tipo === 'C/H20') {
              kilosConH2O += Number(item.kilos) * 30 * 0.65;
            } else {
              kilosTaras += Number(item.kilos) * 30;
            }
          } else if (item.tipo === 'S/H20') {
            kilosSinH2O += Number(item.kilos);
          } else if (item.tipo === 'C/H20') {
            kilosConH2O += Number(item.kilos);
          } else if (item.tipo === '.7 y .3') {
            kilos7y3 += Number(item.kilos) * 0.7;
          }
        }
      });

      const tarasPorKilos = kilosSinH2O / 27;
      const tarasTotal = Math.round(tarasDirectas + tarasPorKilos);
      const totalKilosSinH2O = kilosSinH2O + kilosTaras;
      const kilosTotal = Math.round(totalKilosSinH2O + kilosConH2O + kilos7y3);

      return {
        tarasDirectas: tarasDirectas.toFixed(2),
        tarasPorKilos: tarasPorKilos.toFixed(2),
        tarasTotal: tarasTotal.toString(),
        kilosSinH2O: Math.round(totalKilosSinH2O).toString(),
        kilosConH2O: kilosConH2O.toFixed(2),
        kilos7y3: kilos7y3.toFixed(2),
        kilosTotal: kilosTotal.toString()
      };
    },
    totalesGenerales() {
      let tarasTotal = Math.round(
        Number(this.calculosOtilio.tarasTotal) +
        Number(this.calculosCatarro.tarasTotal) +
        Number(this.calculosJoselito.tarasTotal) +
        Number(this.calculosLorena.tarasTotal) +
        Number(this.calculosOzuna.tarasTotal)
      );

      let kilosTotal = Math.round(
        Number(this.calculosOtilio.kilosTotal) +
        Number(this.calculosCatarro.kilosTotal) +
        Number(this.calculosJoselito.kilosTotal) +
        Number(this.calculosLorena.kilosTotal) +
        Number(this.calculosOzuna.kilosTotal)
      );

      // Agregar totales de clientes temporales
      Object.keys(this.clientesTemporales).forEach(clienteId => {
        const totalesTemporal = this.calcularTotalesTemporales(clienteId);
        tarasTotal += Number(totalesTemporal.tarasTotal);
        kilosTotal += Number(totalesTemporal.kilosTotal);
      });

      return {
        tarasTotal: tarasTotal.toString(),
        kilosTotal: kilosTotal.toString()
      };
    }
  },
  methods: {
    async cargarMedidas() {
      try {
        const querySnapshot = await getDocs(collection(db, 'medidas'));
        this.medidas = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error('Error al cargar las medidas:', error);
      }
    },
    async cargarPedido(id) {
      try {
        const docRef = doc(db, 'pedidos', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          this.fecha = data.fecha;
          this.pedidoOtilio = data.otilio || [];
          this.pedidoCatarro = data.catarro || [];
          this.pedidoJoselito = data.joselito || [];
          this.pedidoOzuna = data.ozuna || [];
          this.pedidoLorena = data.lorena || [];
          this.clientesTemporales = data.clientesTemporales || {};
          this.rendimientosGuardados = data.rendimientos || {};
          this.divisoresGuardados = data.divisores || {};
          this.completadosGuardados = data.completados || {};
          this.kilosRefrigeradosGuardados = data.kilosRefrigerados || {};
        }
      } catch (error) {
        console.error('Error al cargar el pedido:', error);
        alert('Error al cargar el pedido');
      }
    },
    agregarFilaOtilio() {
      this.pedidoOtilio.unshift({ kilos: null, medida: '', tipo: '', esTara: true, esProveedor: false, proveedor: '' })
    },
    agregarFilaCatarro() {
      this.pedidoCatarro.unshift({ kilos: null, medida: '', tipo: 'S/H20', esTara: false, esProveedor: false, proveedor: '' })
    },
    agregarFilaJoselito() {
      this.pedidoJoselito.unshift({ kilos: null, medida: '', tipo: '', esTara: false, esProveedor: false, proveedor: '' })
    },
    agregarFilaOzuna() {
      this.pedidoOzuna.unshift({ kilos: null, medida: '', tipo: 'S/H20', esTara: false, esProveedor: false, proveedor: '', esMaquila: true })
    },
    agregarFilaLorena() {
      this.pedidoLorena.unshift({ kilos: null, medida: '', tipo: '', esTara: false, esProveedor: false, proveedor: '' })
    },
    async guardarPedido() {
      try {
        const pedidoData = {
          fecha: this.fecha,
          tipo: 'limpio',
          otilio: this.pedidoOtilio,
          catarro: this.pedidoCatarro,
          joselito: this.pedidoJoselito,
          ozuna: this.pedidoOzuna,
          lorena: this.pedidoLorena,
          clientesTemporales: this.clientesTemporales,
          rendimientos: this.rendimientosGuardados,
          divisores: this.divisoresGuardados,
          completados: this.completadosGuardados,
          kilosRefrigerados: this.kilosRefrigeradosGuardados,
          createdAt: Timestamp.now()
        };

        if (this.editando && this.pedidoId) {
          // Actualizar pedido existente
          await updateDoc(doc(db, 'pedidos', this.pedidoId), pedidoData);
        } else {
          // Crear nuevo pedido
          await addDoc(collection(db, 'pedidos'), pedidoData);
        }

        this.$router.push('/procesos/pedidos');
      } catch (error) {
        console.error('Error al guardar el pedido:', error);
        alert('Error al guardar el pedido');
      }
    },
    async mostrarVistaImpresion() {
      try {
        const pedidoData = {
          fecha: this.fecha,
          otilio: this.pedidoOtilio,
          catarro: this.pedidoCatarro,
          joselito: this.pedidoJoselito,
          ozuna: this.pedidoOzuna,
          lorena: this.pedidoLorena,
          clientesTemporales: this.clientesTemporales,
          rendimientos: this.rendimientosGuardados,
          divisores: this.divisoresGuardados,
          kilosRefrigerados: this.kilosRefrigeradosGuardados,
          tipo: 'limpio',
          createdAt: this.editando ? Timestamp.fromDate(new Date(this.fecha)) : Timestamp.now()
        }
        
        if (this.editando && this.pedidoId) {
          await updateDoc(doc(db, 'pedidos', this.pedidoId), pedidoData);
        } else {
          const docRef = await addDoc(collection(db, 'pedidos'), pedidoData);
          this.pedidoId = docRef.id;
          this.editando = true;
        }
        this.mostrarImpresion = true;
      } catch (error) {
        console.error('Error al guardar el pedido:', error);
      }
    },
    actualizarMedidas(nuevasMedidas) {
      this.medidas = nuevasMedidas
    },
    eliminarPedidoOtilio(index) {
      this.pedidoOtilio.splice(index, 1)
      if (this.pedidoOtilio.length === 0) {
        this.agregarFilaOtilio()
      }
    },
    eliminarPedidoCatarro(index) {
      this.pedidoCatarro.splice(index, 1)
      if (this.pedidoCatarro.length === 0) {
        this.agregarFilaCatarro()
      }
    },
    eliminarPedidoJoselito(index) {
      this.pedidoJoselito.splice(index, 1)
      if (this.pedidoJoselito.length === 0) {
        this.agregarFilaJoselito()
      }
    },
    eliminarPedidoOzuna(index) {
      this.pedidoOzuna.splice(index, 1)
      if (this.pedidoOzuna.length === 0) {
        this.agregarFilaOzuna()
      }
    },
    eliminarPedidoLorena(index) {
      this.pedidoLorena.splice(index, 1)
      if (this.pedidoLorena.length === 0) {
        this.agregarFilaLorena()
      }
    },
    abrirModalProveedor(item) {
      this.itemSeleccionado = item
      this.mostrarModalProveedor = true
    },
    guardarProveedor(proveedor) {
      if (this.itemSeleccionado) {
        this.itemSeleccionado.proveedor = proveedor.trim()
        this.itemSeleccionado.esProveedor = proveedor.trim() !== ''
      }
      this.mostrarModalProveedor = false
      this.itemSeleccionado = null
    },
    manejarCheckboxProveedor(item) {
      if (item.esProveedor) {
        this.abrirModalProveedor(item)
      } else {
        item.proveedor = ''
      }
    },
    abrirMenuNotas(item) {
      if (this.itemSeleccionadoNotas === item) {
        this.itemSeleccionadoNotas = null;
      } else {
        this.itemSeleccionadoNotas = item;
      }
    },
    seleccionarNota(item, nota) {
      item.nota = nota;
      this.itemSeleccionadoNotas = null;
    },
    ordenarPedidosPorMedida(pedidos) {
      // Creamos una copia del array para no mutar el original directamente
      const pedidosOrdenados = [...pedidos];
      
      // Separamos los pedidos con medida y tipo de los que no los tienen
      const pedidosCompletos = pedidosOrdenados.filter(p => p.medida && p.tipo);
      const pedidosIncompletos = pedidosOrdenados.filter(p => !p.medida || !p.tipo);
      
      // Ordenamos solo los pedidos completos
      pedidosCompletos.sort((a, b) => {
        if (a.medida === b.medida) {
          return a.tipo.localeCompare(b.tipo);
        }
        return a.medida.localeCompare(b.medida);
      });
      
      // Retornamos primero los incompletos y luego los ordenados
      return [...pedidosIncompletos, ...pedidosCompletos];
    },
    isClienteTemporal(clienteId) {
      return !['otilio', 'catarro', 'joselito', 'lorena', 'ozuna'].includes(clienteId);
    },
    calcularTotalesTemporales(clienteId) {
      if (!this.clientesTemporales[clienteId]?.pedidos) return { tarasTotal: '0', kilosTotal: '0' };

      let tarasDirectas = 0;
      let kilosSinH2O = 0;
      let kilosConH2O = 0;
      let kilosTaras = 0;
      let kilos135 = 0;
      let kilosTaras135 = 0;
      let kilos15y3 = 0;
      let kilosTaras15y3 = 0;

      this.clientesTemporales[clienteId].pedidos.forEach(item => {
        if (item.kilos) {
          if (item.esTara) {
            tarasDirectas += Number(item.kilos);
            if (item.tipo === 'C/H20') {
              kilosConH2O += Number(item.kilos) * 30 * 0.65;
            } else if (item.tipo === '1.35 y .15') {
              kilosTaras135 += Number(item.kilos) * 30;
            } else if (item.tipo === '1.5 y .3') {
              kilosTaras15y3 += Number(item.kilos) * 30;
            } else {
              kilosTaras += Number(item.kilos) * 30;
            }
          } else if (item.tipo === 'S/H20') {
            kilosSinH2O += Number(item.kilos);
          } else if (item.tipo === 'C/H20') {
            kilosConH2O += Number(item.kilos);
          } else if (item.tipo === '1.35 y .15') {
            kilos135 += Number(item.kilos) * 1.35;
          } else if (item.tipo === '1.5 y .3') {
            kilos15y3 += Number(item.kilos) * 1.5;
          }
        }
      });

      const tarasPorKilos = kilosSinH2O / 27;
      const tarasPor135 = kilos135 / (1.35 * 25);
      const tarasPor15y3 = kilos15y3 / (1.5 * 25);
      const tarasTotal = Math.round(tarasDirectas + tarasPorKilos + tarasPor135 + tarasPor15y3);
      const totalKilosSinH2O = kilosSinH2O + kilosTaras + kilosTaras135 + kilosTaras15y3;
      const kilosTotal = Math.round(totalKilosSinH2O + kilosConH2O + kilos135 + kilos15y3);

      return {
        tarasTotal: tarasTotal.toString(),
        kilosTotal: kilosTotal.toString()
      };
    },
    agregarClienteTemporal(nuevoCliente) {
      const clienteData = {
        id: nuevoCliente.id,
        nombre: nuevoCliente.nombre,
        pedidos: [{ kilos: null, medida: '', tipo: '', esTara: false, esProveedor: false, proveedor: '' }]
      };
      this.$set(this.clientesTemporales, nuevoCliente.id, clienteData);
      this.clienteActivo = nuevoCliente.id;
      this.mostrarModalNuevoCliente = false;
    },
    agregarFilaTemporal(clienteId) {
      if (!this.clientesTemporales[clienteId]) return;
      
      this.clientesTemporales[clienteId].pedidos.unshift({
        kilos: null,
        medida: '',
        tipo: '',
        esTara: false,
        esProveedor: false,
        proveedor: ''
      });
    },
    eliminarPedidoTemporal(clienteId, index) {
      if (!this.clientesTemporales[clienteId]) return;
      
      this.clientesTemporales[clienteId].pedidos.splice(index, 1);
      if (this.clientesTemporales[clienteId].pedidos.length === 0) {
        this.$delete(this.clientesTemporales, clienteId);
        if (this.clienteActivo === clienteId) {
          this.clienteActivo = 'otilio';
        }
      }
    },
    confirmarEliminarCliente(clienteId, nombreCliente) {
      if (confirm(`¿Estás seguro de que deseas eliminar el cliente "${nombreCliente}" y todos sus pedidos?`)) {
        this.eliminarClienteTemporal(clienteId);
      }
    },
    eliminarClienteTemporal(clienteId) {
      if (!this.clientesTemporales[clienteId]) return;
      
      // Eliminar el cliente temporal completamente
      this.$delete(this.clientesTemporales, clienteId);
      
      // Si el cliente eliminado era el activo, cambiar a Otilio
      if (this.clienteActivo === clienteId) {
        this.clienteActivo = 'otilio';
      }
    },
    actualizarRendimientos(nuevosRendimientos) {
      this.rendimientosGuardados = { ...nuevosRendimientos };
      // Guardar en Firebase inmediatamente
      if (this.editando && this.pedidoId) {
        // Si estamos editando, actualizar el documento existente
        updateDoc(doc(db, 'pedidos', this.pedidoId), {
          rendimientos: this.rendimientosGuardados
        }).catch(error => {
          console.error('Error al actualizar rendimientos:', error);
        });
      } else {
        // Si es un pedido nuevo, crear un nuevo documento
        const pedidoData = {
          fecha: this.fecha,
          tipo: 'limpio',
          otilio: this.pedidoOtilio,
          catarro: this.pedidoCatarro,
          joselito: this.pedidoJoselito,
          ozuna: this.pedidoOzuna,
          lorena: this.pedidoLorena,
          clientesTemporales: this.clientesTemporales,
          rendimientos: this.rendimientosGuardados,
          divisores: this.divisoresGuardados,
          completados: this.completadosGuardados,
          kilosRefrigerados: this.kilosRefrigeradosGuardados,
          createdAt: Timestamp.now()
        };
        
        addDoc(collection(db, 'pedidos'), pedidoData)
          .then(docRef => {
            // Actualizar el estado local para reflejar que ahora estamos editando
            this.editando = true;
            this.pedidoId = docRef.id;
          })
          .catch(error => {
            console.error('Error al crear nuevo pedido con rendimientos:', error);
          });
      }
    },
    actualizarDivisores(nuevosDivisores) {
      this.divisoresGuardados = { ...nuevosDivisores };
      // Guardar en Firebase inmediatamente
      if (this.editando && this.pedidoId) {
        // Si estamos editando, actualizar el documento existente
        updateDoc(doc(db, 'pedidos', this.pedidoId), {
          divisores: this.divisoresGuardados
        }).catch(error => {
          console.error('Error al actualizar divisores:', error);
        });
      } else {
        // Si es un pedido nuevo, crear un nuevo documento
        const pedidoData = {
          fecha: this.fecha,
          tipo: 'limpio',
          otilio: this.pedidoOtilio,
          catarro: this.pedidoCatarro,
          joselito: this.pedidoJoselito,
          ozuna: this.pedidoOzuna,
          lorena: this.pedidoLorena,
          clientesTemporales: this.clientesTemporales,
          rendimientos: this.rendimientosGuardados,
          divisores: this.divisoresGuardados,
          completados: this.completadosGuardados,
          kilosRefrigerados: this.kilosRefrigeradosGuardados,
          createdAt: Timestamp.now()
        };
        
        addDoc(collection(db, 'pedidos'), pedidoData)
          .then(docRef => {
            // Actualizar el estado local para reflejar que ahora estamos editando
            this.editando = true;
            this.pedidoId = docRef.id;
          })
          .catch(error => {
            console.error('Error al crear nuevo pedido con divisores:', error);
          });
      }
    },
    actualizarCompletados(completados) {
      this.completadosGuardados = completados;
      // Guardar en Firebase inmediatamente
      if (this.editando && this.pedidoId) {
        // Si estamos editando, actualizar el documento existente
        updateDoc(doc(db, 'pedidos', this.pedidoId), {
          completados: completados
        }).catch(error => {
          console.error('Error al actualizar estados completados:', error);
        });
      } else {
        // Si es un pedido nuevo, crear un nuevo documento
        const pedidoData = {
          fecha: this.fecha,
          tipo: 'limpio',
          otilio: this.pedidoOtilio,
          catarro: this.pedidoCatarro,
          joselito: this.pedidoJoselito,
          ozuna: this.pedidoOzuna,
          lorena: this.pedidoLorena,
          clientesTemporales: this.clientesTemporales,
          rendimientos: this.rendimientosGuardados,
          divisores: this.divisoresGuardados,
          completados: completados,
          kilosRefrigerados: this.kilosRefrigeradosGuardados,
          createdAt: Timestamp.now()
        };
        
        addDoc(collection(db, 'pedidos'), pedidoData)
          .then(docRef => {
            // Actualizar el estado local para reflejar que ahora estamos editando
            this.editando = true;
            this.pedidoId = docRef.id;
          })
          .catch(error => {
            console.error('Error al crear nuevo pedido:', error);
          });
      }
    },
    actualizarKilosRefrigerados(nuevosKilosRefrigerados) {
      this.kilosRefrigeradosGuardados = { ...nuevosKilosRefrigerados };
      // Guardar en Firebase inmediatamente
      if (this.editando && this.pedidoId) {
        // Si estamos editando, actualizar el documento existente
        updateDoc(doc(db, 'pedidos', this.pedidoId), {
          kilosRefrigerados: this.kilosRefrigeradosGuardados
        }).catch(error => {
          console.error('Error al actualizar kilos refrigerados:', error);
        });
      } else {
        // Si es un pedido nuevo, crear un nuevo documento
        const pedidoData = {
          fecha: this.fecha,
          tipo: 'limpio',
          otilio: this.pedidoOtilio,
          catarro: this.pedidoCatarro,
          joselito: this.pedidoJoselito,
          ozuna: this.pedidoOzuna,
          clientesTemporales: this.clientesTemporales,
          rendimientos: this.rendimientosGuardados,
          divisores: this.divisoresGuardados,
          completados: this.completadosGuardados,
          kilosRefrigerados: this.kilosRefrigeradosGuardados,
          createdAt: Timestamp.now()
        };
        
        addDoc(collection(db, 'pedidos'), pedidoData)
          .then(docRef => {
            // Actualizar el estado local para reflejar que ahora estamos editando
            this.editando = true;
            this.pedidoId = docRef.id;
          })
          .catch(error => {
            console.error('Error al crear nuevo pedido con kilos refrigerados:', error);
          });
      }
    }
  },
  watch: {
    'pedidoOtilio': {
      deep: true,
      handler(newVal) {
        // Verificamos si realmente necesitamos ordenar
        const needsSort = newVal.some(item => item.medida && item.tipo);
        if (needsSort) {
          const ordenados = this.ordenarPedidosPorMedida(newVal);
          // Solo actualizamos si el orden es diferente
          if (JSON.stringify(ordenados) !== JSON.stringify(newVal)) {
            this.$nextTick(() => {
              this.pedidoOtilio = ordenados;
            });
          }
        }
      }
    },
    'pedidoCatarro': {
      deep: true,
      handler(newVal) {
        const needsSort = newVal.some(item => item.medida && item.tipo);
        if (needsSort) {
          const ordenados = this.ordenarPedidosPorMedida(newVal);
          if (JSON.stringify(ordenados) !== JSON.stringify(newVal)) {
            this.$nextTick(() => {
              this.pedidoCatarro = ordenados;
            });
          }
        }
      }
    },
    'pedidoJoselito': {
      deep: true,
      handler(newVal) {
        const needsSort = newVal.some(item => item.medida && item.tipo);
        if (needsSort) {
          const ordenados = this.ordenarPedidosPorMedida(newVal);
          if (JSON.stringify(ordenados) !== JSON.stringify(newVal)) {
            this.$nextTick(() => {
              this.pedidoJoselito = ordenados;
            });
          }
        }
      }
    },
    'pedidoLorena': {
      deep: true,
      handler(newVal) {
        const needsSort = newVal.some(item => item.medida && item.tipo);
        if (needsSort) {
          const ordenados = this.ordenarPedidosPorMedida(newVal);
          if (JSON.stringify(ordenados) !== JSON.stringify(newVal)) {
            this.$nextTick(() => {
              this.pedidoLorena = ordenados;
            });
          }
        }
      }
    },
    'pedidoOzuna': {
      deep: true,
      handler(newVal) {
        const needsSort = newVal.some(item => item.medida && item.tipo);
        if (needsSort) {
          const ordenados = this.ordenarPedidosPorMedida(newVal);
          if (JSON.stringify(ordenados) !== JSON.stringify(newVal)) {
            this.$nextTick(() => {
              this.pedidoOzuna = ordenados;
            });
          }
        }
      }
    }
  }
}
</script>

<style scoped>
.pedidos-limpio-container {
  max-width: 1000px;
  width: 95%;
  margin: 0 auto;
  padding: 20px;
  min-height: calc(100vh - 160px);
}

.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 20px;
}

.volver-container {
  display: flex;
  align-items: center;
}

.btn-volver {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  font-size: 16px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-volver:hover {
  background-color: #5a6268;
}

.btn-volver i {
  font-size: 14px;
}

.fecha-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.totales-generales {
  display: flex;
  gap: 20px;
  background-color: #f8f9fa;
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.total-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.total-label {
  font-size: 14px;
  color: #6c757d;
}

.total-value {
  font-size: 18px;
  font-weight: bold;
  color: #2c3e50;
}

.tabs-container {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.tab-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.tab-totales {
  font-size: 14px;
  color: #666;
  text-align: center;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 4px 8px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.tab-button {
  padding: 12px 25px;
  font-size: 23px;
  border: none;
  border-radius: 6px;
  background-color: #f0f0f0;
  color: #666;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

/* Estilos base para los botones con sus colores correspondientes y efectos hover */
.tab-button[data-cliente="otilio"] {
  background-color: rgba(241, 196, 15, 0.3);
  color: #2c3e50;
  transition: all 0.3s ease;
}

.tab-button[data-cliente="otilio"]:hover {
  background-color: rgba(241, 196, 15, 0.6);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.tab-button[data-cliente="otilio"].active {
  background-color: #f1c40f;
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(241, 196, 15, 0.5);
}

.tab-button[data-cliente="catarro"] {
  background-color: rgba(231, 76, 60, 0.3);
  color: #2c3e50;
  transition: all 0.3s ease;
}

.tab-button[data-cliente="catarro"]:hover {
  background-color: rgba(231, 76, 60, 0.6);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.tab-button[data-cliente="catarro"].active {
  background-color: #e74c3c;
  color: white;
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(231, 76, 60, 0.5);
}

.tab-button[data-cliente="joselito"] {
  background-color: rgba(52, 152, 219, 0.3);
  color: #2c3e50;
  transition: all 0.3s ease;
}

.tab-button[data-cliente="joselito"]:hover {
  background-color: rgba(52, 152, 219, 0.6);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.tab-button[data-cliente="joselito"].active {
  background-color: #3498db;
  color: white;
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(52, 152, 219, 0.5);
}

.tab-button[data-cliente="lorena"] {
  background-color: rgba(230, 126, 34, 0.3);
  color: #2c3e50;
  transition: all 0.3s ease;
}

.tab-button[data-cliente="lorena"]:hover {
  background-color: rgba(230, 126, 34, 0.6);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.tab-button[data-cliente="lorena"].active {
  background-color: #e67e22;
  color: white;
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(230, 126, 34, 0.5);
}

.tab-button[data-cliente="ozuna"] {
  background-color: rgba(39, 174, 96, 0.3);
  color: #2c3e50;
  transition: all 0.3s ease;
}

.tab-button[data-cliente="ozuna"]:hover {
  background-color: rgba(39, 174, 96, 0.6);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.tab-button[data-cliente="ozuna"].active {
  background-color: #27ae60;
  color: white;
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(39, 174, 96, 0.5);
}

/* Estilos para clientes temporales */
.tab-button.temporal {
  background-color: rgba(149, 165, 166, 0.3);
  color: #2c3e50;
  transition: all 0.3s ease;
}

.tab-button.temporal:hover {
  background-color: rgba(149, 165, 166, 0.6);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.tab-button.temporal.active {
  background-color: #95a5a6;
  color: white;
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(149, 165, 166, 0.5);
}

/* Ajustes responsivos */
@media (max-width: 1200px) {
  .tab-button {
    transition: all 0.3s ease;
  }

  .tab-button:hover {
    transform: translateY(-4px);
  }

  .tab-button.active {
    transform: translateY(-4px);
  }
}

@media (max-width: 768px) {
  .tab-button {
    height: auto;
    min-height: 50px;
  }

  .tab-button:hover,
  .tab-button.active {
    transform: translateY(-3px);
    box-shadow: 0 6px 12px rgba(0,0,0,0.2);
  }
}

@media (max-width: 375px) {
  .tab-button {
    min-height: 40px;
    font-size: 14px;
  }

  .tab-button:hover,
  .tab-button.active {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }
}

.clientes-content {
  border: 1px solid #ddd;
  border-radius: 0 8px 8px 8px;
  padding: 20px;
  background: white;
  min-height: 400px;
}

.cliente-seccion {
  background-color: transparent;
  border: none;
  box-shadow: none;
  padding: 0;
}

.cliente-titulo {
  display: none;
}

.pedido-grid {
  margin-bottom: 15px;
}

.btn-agregar {
  margin-bottom: 15px;
  width: 100%;
  padding: 18px;
  font-size: 23px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-agregar:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}

.buttons-container {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  margin-top: 30px;
}

.btn-guardar,
.btn-imprimir,
.btn-cancelar {
  padding: 12px 24px;
  font-size: 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn-guardar {
  background-color: #3498db;
  color: white;
}

.btn-imprimir {
  background-color: #27ae60;
  color: white;
}

.btn-cancelar {
  background-color: #95a5a6;
  color: white;
}

.input-row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  position: relative;
  background-color: #f8f9fa;
  padding: 12px;
  border-radius: 8px;
  width: 100%;
}

.input-group-compact {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kilos {
  width: 150px;
  flex-shrink: 0;
}

.medida {
  flex: 2;
  min-width: 200px;
}

.tipo {
  width: 180px;
  flex-shrink: 0;
}

.operacion {
  width: 180px;
  flex-shrink: 0;
}

.input-field {
  height: 45px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 23px;
  width: 100%;
}

.input-field:focus {
  border-color: #3498db;
  outline: none;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.input-field-notas {
  height: 30px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  width: 120px;
  margin-left: 8px;
}

.input-field-notas:focus {
  border-color: #3498db;
  outline: none;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.label-container {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 23px;
  color: #666;
}

.tara-checkbox {
  display: flex;
  align-items: center;
  gap: 3px;
}

.tara-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  margin: 0;
}

.tara-checkbox label {
  font-size: 21px;
}

.btn-proveedor {
  width: 24px;
  height: 24px;
  font-size: 12px;
  padding: 0;
  margin-left: 4px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.btn-proveedor.active {
  border: 2px solid #27ae60;
  color: #27ae60;
  background-color: rgba(39, 174, 96, 0.1);
}

.btn-eliminar {
  position: static;
  transform: none;
  height: 40px;
  width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  transition: background-color 0.3s ease;
}

.btn-eliminar:hover {
  background-color: #c0392b;
}

@media (max-width: 1400px) {
  .pedido-item {
    grid-template-columns: 0.8fr 1.8fr 1fr;
  }
}

@media (max-width: 1200px) {
  .tabs-container {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 20px;
  }
  
  .input-row {
    display: flex;
    gap: 12px;
    padding: 15px;
    background: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    border-radius: 8px;
    margin-bottom: 10px;
  }

  /* Estilos base para todos los clientes */
  .input-group-compact {
    margin: 0;
  }

  /* Estilos específicos para Ozuna */
  [data-cliente="ozuna"] .input-row {
    flex-wrap: wrap;
  }

  [data-cliente="ozuna"] .kilos {
    width: calc(40% - 6px);
    flex: none;
  }

  [data-cliente="ozuna"] .medida {
    width: calc(60% - 6px);
    flex: none;
  }

  [data-cliente="ozuna"] .tipo,
  [data-cliente="ozuna"] .operacion {
    width: calc(50% - 6px);
    flex: none;
    margin-top: 12px;
  }

  /* Estilos para Otilio, Catarro y Joselito */
  [data-cliente="otilio"] .input-row,
  [data-cliente="catarro"] .input-row,
  [data-cliente="joselito"] .input-row {
    flex-wrap: nowrap;
    align-items: flex-start;
  }

  [data-cliente="otilio"] .kilos,
  [data-cliente="catarro"] .kilos,
  [data-cliente="joselito"] .kilos {
    width: 25%;
    min-width: 120px;
    max-width: 150px;
  }

  [data-cliente="otilio"] .medida,
  [data-cliente="catarro"] .medida,
  [data-cliente="joselito"] .medida {
    width: 45%;
    min-width: 180px;
  }

  [data-cliente="otilio"] .tipo,
  [data-cliente="catarro"] .tipo,
  [data-cliente="joselito"] .tipo {
    width: 30%;
    min-width: 150px;
  }

  .label-container {
    margin-bottom: 4px;
  }
}

@media (max-width: 768px) {
  .pedidos-limpio-container {
    padding: 10px;
  }

  .tabs-container {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 15px;
    width: 100%;
  }

  .tab-wrapper {
    width: 100%;
  }

  .input-row {
    display: flex;
    flex-wrap: wrap !important;
    gap: 8px;
    padding: 12px;
    background: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    border-radius: 8px;
    margin-bottom: 10px;
  }

  /* Estilos base para todos los clientes */
  .input-group-compact {
    margin: 0;
  }

  /* Estilos específicos para Ozuna */
  [data-cliente="ozuna"] .input-row {
    flex-wrap: wrap !important;
  }

  [data-cliente="ozuna"] .kilos {
    width: calc(40% - 6px);
    flex: none;
  }

  [data-cliente="ozuna"] .medida {
    width: calc(60% - 6px);
    flex: none;
  }

  [data-cliente="ozuna"] .tipo,
  [data-cliente="ozuna"] .operacion {
    width: calc(50% - 6px);
    flex: none;
    margin-top: 12px;
  }

  /* Estilos para Otilio, Catarro y Joselito */
  [data-cliente="otilio"] .input-row,
  [data-cliente="catarro"] .input-row,
  [data-cliente="joselito"] .input-row {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap !important;
    gap: 8px;
  }

  [data-cliente="otilio"] .kilos,
  [data-cliente="catarro"] .kilos,
  [data-cliente="joselito"] .kilos {
    width: calc(40% - 6px);
    flex: none;
  }

  [data-cliente="otilio"] .medida,
  [data-cliente="catarro"] .medida,
  [data-cliente="joselito"] .medida {
    width: calc(60% - 6px);
    flex: none;
  }

  [data-cliente="otilio"] .tipo,
  [data-cliente="catarro"] .tipo,
  [data-cliente="joselito"] .tipo {
    width: calc(100% - 40px);
    flex: none;
    margin-top: 8px;
  }

  .input-field {
    font-size: 14px;
    height: 38px;
    padding: 4px 6px;
    width: 100%;
  }

  .label-container {
    font-size: 13px;
    margin-bottom: 2px;
    white-space: nowrap;
  }

  .tara-checkbox {
    display: inline-flex;
    align-items: center;
  }

  .tara-checkbox label {
    font-size: 13px;
  }

  .btn-eliminar {
    width: 32px;
    height: 32px;
    margin-left: 4px;
    flex: 0 0 32px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 8px;
  }

  .input-group-compact {
    min-width: 0;
  }

  .input-field-notas {
    height: 25px;
    font-size: 12px;
    padding: 2px 4px;
    width: 80px;
  }
}

@media (max-width: 576px) {
  .input-row {
    padding: 8px;
  }

  [data-cliente="otilio"] .kilos,
  [data-cliente="catarro"] .kilos,
  [data-cliente="joselito"] .kilos {
    width: calc(40% - 4px);
  }

  [data-cliente="otilio"] .medida,
  [data-cliente="catarro"] .medida,
  [data-cliente="joselito"] .medida {
    width: calc(60% - 4px);
  }

  [data-cliente="otilio"] .tipo,
  [data-cliente="catarro"] .tipo,
  [data-cliente="joselito"] .tipo {
    width: calc(100% - 36px);
  }

  .input-field {
    font-size: 13px;
    padding: 4px;
  }

  .label-container {
    font-size: 12px;
  }

  .btn-eliminar {
    width: 28px;
    height: 28px;
    flex: 0 0 28px;
  }
}

@media (max-width: 375px) {  /*Pixel fold cerrado*/
  .pedidos-limpio-container {
    padding: 5px;
    width: 100%;
  }

  .header-container {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
    margin-bottom: 15px;
  }

  .fecha-container {
    width: 100%;
    justify-content: space-between;
  }

  .fecha-container input {
    width: 65%;
    font-size: 14px;
    height: 36px;
  }

  .totales-generales {
    width: 100%;
    padding: 8px;
    flex-direction: row;
    justify-content: space-around;
    gap: 5px;
  }

  .total-item {
    flex: 1;
  }

  .total-label {
    font-size: 12px;
  }

  .total-value {
    font-size: 14px;
  }

  /* Ajustes para el botón de medidas */
  :deep(.btn-medidas) {
    width: 100%;
    height: 36px;
    font-size: 14px;
    padding: 8px;
  }

  .tabs-container {
    gap: 3px;
    margin-bottom: 8px;
  }
  
  .tab-button {
    width: calc(50% - 3px);
    padding: 6px 4px;
    font-size: 14px;
    border-radius: 4px;
  }

  .input-row {
    flex-direction: column;
    padding: 8px;
    gap: 6px;
  }

  .input-group-compact {
    width: 100%;
  }

  .kilos, .medida, .tipo, .operacion {
    width: 100%;
    min-width: unset;
  }

  .input-field {
    height: 36px;
    font-size: 14px;
    padding: 4px 6px;
  }

  .label-container {
    font-size: 14px;
  }

  .tara-checkbox label {
    font-size: 14px;
  }

  .btn-eliminar {
    width: 24px;
    height: 24px;
    font-size: 12px;
  }

  .buttons-container {
    gap: 6px;
    flex-direction: column;
  }

  .btn-guardar,
  .btn-imprimir,
  .btn-cancelar {
    width: 100%;
    padding: 8px 12px;
    font-size: 14px;
  }

  .btn-proveedor {
    width: 20px;
    height: 20px;
    font-size: 12px;
    border-width: 1.5px;
  }

  .btn-proveedor.active {
    border-width: 1.5px;
  }

  .input-field-notas {
    width: 80px;
    font-size: 12px;
    height: 25px;
    padding: 2px 4px;
  }

  .operacion {
    width: 100%;
  }

  .operacion .input-field {
    height: 36px;
    font-size: 14px;
    padding: 4px 6px;
  }
}

.btn-notas {
  width: 24px;
  height: 24px;
  font-size: 12px;
  padding: 0;
  margin-left: 4px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  background-color: #95a5a6;
  color: white;
  border-radius: 4px;
  cursor: pointer;
}

.btn-notas.active {
  border: 2px solid #7f8c8d;
  background-color: #7f8c8d;
}

.menu-notas {
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  z-index: 1000;
  min-width: 120px;
}

.menu-item {
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.menu-item:hover {
  background-color: #f5f5f5;
}

@media (max-width: 768px) {
  .btn-notas {
    width: 28px;
    height: 28px;
    font-size: 14px;
  }
}

@media (max-width: 375px) {
  .btn-notas {
    width: 20px;
    height: 20px;
    font-size: 12px;
    border-width: 1.5px;
  }
}

.text-blue {
  color: #3498db !important;
}

select.text-blue {
  color: #3498db !important;
}

select option.text-blue {
  color: #3498db;
}

/* Estilos para el resumen de cálculos */
.resumen-calculos {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.resumen-calculos h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 1.2em;
}

.calculos-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

.calculo-item {
  background-color: white;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.calculo-item.total {
  background-color: #f1f8ff;
  border-color: #3498db;
}

.calculo-label {
  font-size: 0.9em;
  color: #666;
}

.calculo-valor {
  font-size: 1.2em;
  font-weight: 600;
  color: #2c3e50;
}

.calculo-item.total .calculo-valor {
  color: #3498db;
}

@media (max-width: 768px) {
  .calculos-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .resumen-calculos {
    padding: 15px;
    margin: 15px 0;
  }
  
  .calculo-item {
    padding: 10px;
  }
  
  .calculo-label {
    font-size: 0.85em;
  }
  
  .calculo-valor {
    font-size: 1.1em;
  }
}

@media (max-width: 480px) {
  .calculos-grid {
    grid-template-columns: 1fr;
  }
  
  .resumen-calculos {
    padding: 12px;
    margin: 12px 0;
  }
  
  .calculo-item {
    padding: 8px;
  }
}

.bg-otilio {
  background-color: #f1c40f !important;
}
.bg-catarro {
  background-color: #e74c3c !important;
}
.bg-joselito {
  background-color: #3498db !important;
}
.bg-lorena {
  background-color: #e67e22 !important;
}
.bg-ozuna {
  background-color: #27ae60 !important;
}
.bg-temporal {
  background-color: #95a5a6 !important;
}

/* Estilos CSS al final del archivo */
.maquila-checkbox {
  display: flex;
  align-items: center;
  gap: 3px;
}

.maquila-checkbox input[type="checkbox"] {
  width: 20px;
  height: 20px;
  margin: 0;
  cursor: pointer;
}

@media (max-width: 768px) {
  [data-cliente="ozuna"] .maquila {
    width: calc(50% - 6px);
    flex: none;
    margin-top: 12px;
  }

  .maquila-checkbox input[type="checkbox"] {
    width: 18px;
    height: 18px;
  }
}

@media (max-width: 375px) {
  .maquila-checkbox input[type="checkbox"] {
    width: 16px;
    height: 16px;
  }
}

/* Estilos para el contenedor de cliente temporal */
.tab-cliente-container {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-eliminar-cliente {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  z-index: 10;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.btn-eliminar-cliente:hover {
  background-color: #c0392b;
  transform: scale(1.1);
}

.btn-eliminar-cliente i {
  font-size: 10px;
}

/* Ajustes responsivos para el botón eliminar cliente */
@media (max-width: 768px) {
  .btn-eliminar-cliente {
    width: 18px;
    height: 18px;
    top: -6px;
    right: -6px;
    font-size: 10px;
  }
  
  .btn-eliminar-cliente i {
    font-size: 8px;
  }
}

@media (max-width: 375px) {
  .btn-eliminar-cliente {
    width: 16px;
    height: 16px;
    top: -4px;
    right: -4px;
    font-size: 8px;
  }
  
  .btn-eliminar-cliente i {
    font-size: 7px;
  }
}
</style> 
