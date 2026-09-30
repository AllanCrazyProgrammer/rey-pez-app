import RegistroCrudos from '@/views/RegistroCrudos.vue';
import Editor from './EditorInventario.vue';
export default { extends: RegistroCrudos, mixins: [Editor], name: 'EditorCrudos', _scopeId: 'data-v-rp-editor', data: () => ({ esLimpio: false }) };
