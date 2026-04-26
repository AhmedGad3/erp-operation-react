export const formatDate = (dateString, lang = 'en') => {
  const date = new Date(dateString);
  
  if (lang === 'ar') {
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatDateShort = (dateString, lang = 'en') => {
  const date = new Date(dateString);
  
  if (lang === 'ar') {
    return date.toLocaleDateString('ar-EG');
  }
  
  return date.toLocaleDateString('en-US');
};

export const formatNumber = (number, lang = 'en') => {
  if (lang === 'ar') {
    return new Intl.NumberFormat('ar-EG').format(number);
  }
  return new Intl.NumberFormat('en-US').format(number);
};

export const formatCurrency = (amount, lang = 'en') => {
  const formatted = formatNumber(amount, lang);
  return `${formatted} EGP`;
};





