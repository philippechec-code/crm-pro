const { parse } = require('csv-parse');
const { Readable } = require('stream');

/**
 * Détecte le délimiteur (virgule ou point-virgule) d'un CSV
 */
const detectDelimiter = (sample) => {
  const semicolons = (sample.match(/;/g) || []).length;
  const commas = (sample.match(/,/g) || []).length;
  return semicolons > commas ? ';' : ',';
};

/**
 * Normalise les noms de colonnes du CSV vers les champs internes
 */
const COLUMN_MAP = {
  // Prénom
  prenom: 'first_name', prénom: 'first_name', firstname: 'first_name',
  first_name: 'first_name', 'first name': 'first_name',
  // Nom
  nom: 'last_name', lastname: 'last_name', last_name: 'last_name',
  'last name': 'last_name', name: 'last_name',
  // Téléphone
  telephone: 'phone', téléphone: 'phone', tel: 'phone', phone: 'phone',
  mobile: 'phone', portable: 'phone', 'numéro': 'phone', numero: 'phone',
  // Email
  email: 'email', mail: 'email', 'e-mail': 'email', courriel: 'email',
  // Adresse
  adresse: 'address', address: 'address',
  // Ville
  ville: 'city', city: 'city',
  // Code postal
  'code postal': 'postal_code', codepostal: 'postal_code',
  cp: 'postal_code', postal_code: 'postal_code', zip: 'postal_code',
  // Source
  source: 'source', origine: 'source', origin: 'source',
  // Commentaire
  commentaire: 'comment', comment: 'comment', note: 'comment', notes: 'comment',
  // Statut
  statut: 'status', status: 'status',
};

const normalizeColumnName = (col) => {
  const lower = col.toLowerCase().trim().replace(/[^a-zàâçéèêëîïôûùüÿñ0-9 _-]/g, '');
  return COLUMN_MAP[lower] || null;
};

/**
 * Parse un buffer CSV et retourne un tableau d'objets normalisés
 */
const parseCSV = (buffer) => {
  return new Promise((resolve, reject) => {
    const content = buffer.toString('utf-8');
    const sample = content.substring(0, 1000);
    const delimiter = detectDelimiter(sample);

    const records = [];
    const stream = Readable.from(buffer);

    stream.pipe(
      parse({
        delimiter,
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        relax_quotes: true,
        relax_column_count: true,
      })
    )
      .on('data', (row) => {
        const normalized = {};
        for (const [key, value] of Object.entries(row)) {
          const mappedKey = normalizeColumnName(key);
          if (mappedKey && value && String(value).trim()) {
            normalized[mappedKey] = String(value).trim();
          }
        }
        // Garder la ligne si elle a au moins un champ utile
        if (Object.keys(normalized).length > 0) {
          records.push(normalized);
        }
      })
      .on('end', () => resolve({ records, delimiter }))
      .on('error', reject);
  });
};

module.exports = { parseCSV, detectDelimiter };
