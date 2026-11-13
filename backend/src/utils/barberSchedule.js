const { getDayOfWeekEn } = require('./dateHelper');

const getScheduledTimes = (barber, date) => {
  const day = barber.schedule?.[getDayOfWeekEn(date)];
  return day?.enabled && Array.isArray(day.times) ? day.times : [];
};

module.exports = { getScheduledTimes };
