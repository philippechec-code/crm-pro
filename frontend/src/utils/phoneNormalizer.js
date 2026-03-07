export function digitsOnly(p){ return (p||'').replace(/\D/g,''); }

export function normalizePhone(phone){
  if (!phone) return '';
  let s = String(phone).trim();
  s = s.replace(/\s+/g,'').replace(/[^0-9+]/g,'');
  if (s.startsWith('+33')) s = '0' + s.slice(3);
  if (s.startsWith('0033')) s = '0' + s.slice(4);
  if (!s.startsWith('0') && s.length===9) s = '0'+s;
  s = s.replace(/[^0-9]/g,'');
  return s;
}
