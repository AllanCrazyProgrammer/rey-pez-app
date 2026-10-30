import { claveCampo, normalizarCampo } from '@/utils/embarquePresencia';

function actualizar(el, { value }) {
  const campo = normalizarCampo(value?.campo);
  if (!campo) { limpiar(el); return; }
  el.setAttribute('data-colab-campo', JSON.stringify(campo));
  const editores = (value.editores || []).filter(e => e.campo && claveCampo(e.campo) === claveCampo(campo));
  el.classList.toggle('campo-con-colaboradores', editores.length > 0);
  if (editores.length) {
    el.style.setProperty('--color-colaborador', editores[0].color);
    el.setAttribute('aria-description', 'También aquí: ' + editores.map(e => e.username).join(', '));
  } else {
    el.style.removeProperty('--color-colaborador');
    el.removeAttribute('aria-description');
  }
}
function limpiar(el) {
  el.removeAttribute('data-colab-campo');
  el.removeAttribute('aria-description');
  el.style.removeProperty('--color-colaborador');
  el.classList.remove('campo-con-colaboradores');
}
export default { bind: actualizar, update: actualizar, unbind: limpiar };
