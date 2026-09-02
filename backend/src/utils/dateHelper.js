const TIMEZONE = 'America/Sao_Paulo';

/**
 * Converte uma string de data (YYYY-MM-DD) para Date no timezone local
 */
const parseDateLocal = (dateString) => {
  if (!dateString) return null;
  
  // Validar formato
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    console.warn(`⚠️ Data em formato inválido: ${dateString}`);
    return null;
  }
  
  const [year, month, day] = dateString.split('-').map(Number);
  // 🔥 CRIA DATA NO TIMEZONE LOCAL (sem conversão UTC)
  return new Date(year, month - 1, day);
};

/**
 * Obtém o dia da semana em inglês (para comparar com o schedule)
 */
const getDayOfWeekEn = (dateString) => {
  const date = parseDateLocal(dateString);
  if (!date) return null;
  
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    timeZone: TIMEZONE 
  }).toLowerCase();
};

/**
 * Obtém o dia da semana em português (para exibição)
 */
const getDayOfWeekPt = (dateString) => {
  const date = parseDateLocal(dateString);
  if (!date) return null;
  
  return date.toLocaleDateString('pt-BR', { 
    weekday: 'long',
    timeZone: TIMEZONE 
  });
};

/**
 * Obtém a data atual no timezone local (YYYY-MM-DD)
 */
const getTodayLocal = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formata data para exibição (DD/MM/YYYY)
 */
const formatDateDisplay = (dateString) => {
  const date = parseDateLocal(dateString);
  if (!date) return '';
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

/**
 * Formata data para exibição com dia da semana
 */
const formatDateWithDay = (dateString) => {
  const date = parseDateLocal(dateString);
  if (!date) return '';
  
  const dayOfWeek = getDayOfWeekPt(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${dayOfWeek}, ${day}/${month}/${year}`;
};

/**
 * Verifica se uma data é no passado (comparando apenas dia)
 */
const isPastDate = (dateString) => {
  if (!dateString) return false;
  const today = getTodayLocal();
  return dateString < today;
};

/**
 * Verifica se uma data é hoje
 */
const isToday = (dateString) => {
  if (!dateString) return false;
  const today = getTodayLocal();
  return dateString === today;
};

/**
 * Valida se a data está no formato correto YYYY-MM-DD
 */
const isValidDate = (dateString) => {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }
  
  const date = parseDateLocal(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * Compara duas datas (apenas dia, mês, ano)
 */
const isSameDate = (date1, date2) => {
  return date1 === date2;
};

/**
 * Adiciona dias a uma data
 */
const addDays = (dateString, days) => {
  const date = parseDateLocal(dateString);
  if (!date) return null;
  
  date.setDate(date.getDate() + days);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Subtrai dias de uma data
 */
const subtractDays = (dateString, days) => {
  return addDays(dateString, -days);
};

/**
 * Retorna o timestamp atual no timezone local para logs
 */
const getTimestampLocal = () => {
  return new Date().toLocaleString('pt-BR', {
    timeZone: TIMEZONE,
  });
};

/**
 * Gera um intervalo de datas entre duas datas
 */
const getDateRange = (startDate, endDate) => {
  const dates = [];
  let current = startDate;
  
  while (current <= endDate) {
    dates.push(current);
    current = addDays(current, 1);
  }
  
  return dates;
};

module.exports = {
  TIMEZONE,
  parseDateLocal,
  getDayOfWeekEn,
  getDayOfWeekPt,
  getTodayLocal,
  formatDateDisplay,
  formatDateWithDay,
  isPastDate,
  isToday,
  isValidDate,
  isSameDate,
  addDays,
  subtractDays,
  getTimestampLocal,
  getDateRange,
};