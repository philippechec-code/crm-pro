import { useEffect, useState } from 'react';

export default function Toast(){
  const [toast, setToast] = useState(null);

  useEffect(()=>{
    function onMsg(e){ setToast(e.detail); setTimeout(()=>setToast(null),3500); }
    window.addEventListener('crm:toast', onMsg);
    return ()=> window.removeEventListener('crm:toast', onMsg);
  },[]);

  if(!toast) return null;

  const { type='info', message } = toast;
  const bg = type === 'success' ? '#1f8e3b' : (type === 'error' ? '#c0392b' : '#333');
  const icon = type === 'success' ? '✓' : (type === 'error' ? '⚠' : 'ℹ');

  return (
    <div style={{position:'fixed',right:20,top:20,zIndex:9999,background:bg,color:'#fff',padding:'10px 14px',borderRadius:8,boxShadow:'0 8px 30px rgba(0,0,0,0.35)',display:'flex',gap:8,alignItems:'center',minWidth:220}}>
      <div style={{fontWeight:700}}>{icon}</div>
      <div style={{fontSize:14,lineHeight:'18px'}}>{message}</div>
    </div>
  );
}
