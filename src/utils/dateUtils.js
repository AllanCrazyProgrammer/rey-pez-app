import moment from 'moment';
import 'moment/locale/es';

// Configurar Moment.js para usar el idioma español
moment.locale('es');

// Formato estándar para mostrar fechas en la aplicación
const DATE_FORMAT = 'DD [de] MMMM [de] YYYY';

export const formatDate = (date) => {
  return moment(date).format(DATE_FORMAT);
};

export const parseDate = (date) => {
  return moment(date).toDate();
};

export const getCurrentDate = () => {
  return moment().toDate();
};

export const isValidDate = (date) => {
  return moment(date).isValid();
};

export const convertToFirestoreTimestamp = (date) => {
  return moment(date).toDate();
};

export const convertFromFirestoreTimestamp = (timestamp) => {
  return moment(timestamp.toDate());
};