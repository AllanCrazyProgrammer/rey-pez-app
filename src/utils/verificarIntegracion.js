/**
 * Script para verificar la integración entre componentes
 * 
 * Este script proporciona funciones para verificar que los componentes
 * se comunican correctamente entre sí y que los datos fluyen como se espera.
 */

/**
 * Verifica que los props requeridos estén presentes en un componente
 * @param {Object} component - Componente a verificar
 * @param {Array} requiredProps - Lista de props requeridos
 * @returns {Object} - Resultado de la verificación
 */
export function verificarProps(component, requiredProps) {
  const missingProps = [];
  const result = { success: true, missingProps: [] };
  
  if (!component || !component.props) {
    result.success = false;
    result.error = 'El componente no tiene props definidos';
    return result;
  }
  
  for (const prop of requiredProps) {
    if (!component.props[prop]) {
      missingProps.push(prop);
    }
  }
  
  if (missingProps.length > 0) {
    result.success = false;
    result.missingProps = missingProps;
  }
  
  return result;
}

/**
 * Verifica que los eventos emitidos por un componente sean capturados por su padre
 * @param {Object} childComponent - Componente hijo
 * @param {Object} parentComponent - Componente padre
 * @param {Array} events - Lista de eventos a verificar
 * @returns {Object} - Resultado de la verificación
 */
export function verificarEventos(childComponent, parentComponent, events) {
  const missingEvents = [];
  const result = { success: true, missingEvents: [] };
  
  if (!childComponent || !parentComponent) {
    result.success = false;
    result.error = 'Componentes no válidos';
    return result;
  }
  
  // Obtener el template del componente padre
  const parentTemplate = parentComponent.template || '';
  
  for (const event of events) {
    // Verificar si el evento está siendo capturado en el template del padre
    const eventPattern = new RegExp(`@${event}|v-on:${event}`);
    if (!eventPattern.test(parentTemplate)) {
      missingEvents.push(event);
    }
  }
  
  if (missingEvents.length > 0) {
    result.success = false;
    result.missingEvents = missingEvents;
  }
  
  return result;
}

/**
 * Verifica que los composables estén siendo utilizados correctamente
 * @param {Object} component - Componente a verificar
 * @param {Array} composables - Lista de composables a verificar
 * @returns {Object} - Resultado de la verificación
 */
export function verificarComposables(component, composables) {
  const missingComposables = [];
  const result = { success: true, missingComposables: [] };
  
  if (!component || !component.setup) {
    result.success = false;
    result.error = 'El componente no tiene función setup';
    return result;
  }
  
  // Obtener el código de la función setup
  const setupCode = component.setup.toString();
  
  for (const composable of composables) {
    // Verificar si el composable está siendo utilizado en la función setup
    if (!setupCode.includes(composable)) {
      missingComposables.push(composable);
    }
  }
  
  if (missingComposables.length > 0) {
    result.success = false;
    result.missingComposables = missingComposables;
  }
  
  return result;
}

/**
 * Ejecuta todas las verificaciones en un conjunto de componentes
 * @param {Object} components - Objeto con los componentes a verificar
 * @param {Object} checks - Objeto con las verificaciones a realizar
 * @returns {Object} - Resultado de todas las verificaciones
 */
export function ejecutarVerificaciones(components, checks) {
  const results = {
    props: {},
    events: {},
    composables: {},
    overall: true
  };
  
  // Verificar props
  if (checks.props) {
    for (const [componentName, requiredProps] of Object.entries(checks.props)) {
      results.props[componentName] = verificarProps(components[componentName], requiredProps);
      if (!results.props[componentName].success) {
        results.overall = false;
      }
    }
  }
  
  // Verificar eventos
  if (checks.events) {
    for (const [childName, eventChecks] of Object.entries(checks.events)) {
      results.events[childName] = {};
      for (const [parentName, events] of Object.entries(eventChecks)) {
        results.events[childName][parentName] = verificarEventos(
          components[childName], 
          components[parentName], 
          events
        );
        if (!results.events[childName][parentName].success) {
          results.overall = false;
        }
      }
    }
  }
  
  // Verificar composables
  if (checks.composables) {
    for (const [componentName, composables] of Object.entries(checks.composables)) {
      results.composables[componentName] = verificarComposables(
        components[componentName], 
        composables
      );
      if (!results.composables[componentName].success) {
        results.overall = false;
      }
    }
  }
  
  return results;
}

// Ejemplo de uso:
/*
import { ClienteSidebar, EmbarqueHeader, EmbarqueForm, EmbarqueResumen, ClienteModals, NuevoEmbarque } from '@/components';

const components = {
  ClienteSidebar,
  EmbarqueHeader,
  EmbarqueForm,
  EmbarqueResumen,
  ClienteModals,
  NuevoEmbarque
};

const checks = {
  props: {
    ClienteSidebar: ['clientesPredefinidos', 'clienteActivo', 'sidebarCollapsed'],
    EmbarqueHeader: ['modoEdicion', 'guardando', 'generandoPdf']
  },
  events: {
    ClienteSidebar: {
      NuevoEmbarque: ['toggle-sidebar', 'seleccionar-cliente', 'mostrar-modal-nuevo-cliente']
    },
    EmbarqueHeader: {
      NuevoEmbarque: ['guardar', 'generar-resumen']
    }
  },
  composables: {
    ClienteSidebar: ['useClienteUtils'],
    EmbarqueResumen: ['useClienteUtils']
  }
};

const results = ejecutarVerificaciones(components, checks);
console.log(results);
*/ 