const detectDelimiter = (sample) => {
  const semicolons = (sample.match(/;/g) || []).length;
  const commas = (sample.match(/,/g) || []).length;
  return semicolons > commas ? ';' : ',';
};

const parseCSV = (buffer) => {
  return new Promise((resolve) => {
    const content = buffer.toString('utf-8').replace(/^\uFEFF/, ''); // Remove BOM
    const lines = content.trim().split(/\r?\n/).filter(l => l.trim());
    
    
    const delimiter = detectDelimiter(content);
    
    const records = [];
    
    for (const line of lines) {
      const parts = line.split(delimiter).map(p => p.trim().replace(/^"|"$/g, ''));
      
      const record = { first_name: '', last_name: '', phone: '', email: '', source: '' };
      
      for (const part of parts) {
        if (!part) continue;
        
        // Email
        if (part.includes('@') && part.includes('.')) {
          record.email = part.toLowerCase();
        }
        // Téléphone (chiffres, espaces, +, au moins 9 caractères)
        else if (/^[\d\s\+\.\-]{9,}$/.test(part)) {
          record.phone = part;
        }
        // Source (majuscules, court)
        else if (part === part.toUpperCase() && part.length <= 20 && /^[A-Z\s]+$/.test(part)) {
          record.source = part;
        }
        // Nom (contient des lettres, pas d'email ni téléphone)
        else if (/[a-zA-ZÀ-ÿ]/.test(part) && !record.last_name) {
          const nameParts = part.split(/\s+/);
          if (nameParts.length >= 2) {
            record.first_name = nameParts[0];
            record.last_name = nameParts.slice(1).join(' ');
          } else {
            record.last_name = part;
          }
        }
      }
      
      
      if (record.phone || record.email || record.last_name) {
        records.push(record);
      }
    }
    
    resolve({ records, delimiter });
  });
};

module.exports = { parseCSV, detectDelimiter };
