/**
 * Normalise un numéro de téléphone français vers le format E.164 (+33XXXXXXXXX)
 * Gère : 06, 07, 01-05, +33, 0033, 33, espaces, tirets, points
 */
const normalizePhone = (phone) => {
  if (!phone) return null;

  // Supprimer tous les caractères non numériques sauf le +
  let cleaned = String(phone).replace(/[\s\-\.\(\)]/g, '');

  // Gérer le préfixe international
  if (cleaned.startsWith('+33')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('0033')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('33') && cleaned.length === 11) {
    cleaned = '0' + cleaned.slice(2);
  }

  // Vérifier que c'est un numéro français valide (10 chiffres commençant par 0)
  if (!/^0[1-9]\d{8}$/.test(cleaned)) {
    return null;
  }

  // Retourner au format +33
  return '+33' + cleaned.slice(1);
};

/**
 * Vérifie si deux numéros de téléphone sont identiques (normalisés)
 */
const phonesMatch = (phone1, phone2) => {
  const n1 = normalizePhone(phone1);
  const n2 = normalizePhone(phone2);
  if (!n1 || !n2) return false;
  return n1 === n2;
};

module.exports = { normalizePhone, phonesMatch };
