const { getDayOfWeekEn } = require('./dateHelper');

const getScheduledTimes = (barber, date) => {
  const day = barber.schedule?.[getDayOfWeekEn(date)];
  return day?.enabled && Array.isArray(day.times) ? day.times : [];
};

const internalTimes = Array.from({ length: 21 }, (_, index) => {
  const hour = 9 + Math.floor(index / 2);
  const minute = index % 2 === 0 ? '00' : '30';
  return `${String(hour).padStart(2, '0')}:${minute}`;
});

module.exports = { getScheduledTimes, internalTimes };
