import Sacadas from '@/views/Sacadas.vue';
import Editor from './EditorInventario.vue';
export default { extends: Sacadas, mixins: [Editor], name: 'EditorLimpios', _scopeId: 'data-v-rp-editor', data: () => ({ esLimpio: true }) };
