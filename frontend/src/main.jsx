import{StrictMode}from'react';
import{createRoot}from'react-dom/client';
import'./index.css';
import App from'./App.jsx';
import{initBackupService}from'./services/BackupService';
import{initStorage}from'./services/storage';
async function bootstrap(){
  await initBackupService();
  initStorage();
  createRoot(document.getElementById('root')).render(<StrictMode><App/></StrictMode>);
}
bootstrap().catch(err=>{
  console.error('[CRM] Erreur demarrage:',err);
  initStorage();
  createRoot(document.getElementById('root')).render(<StrictMode><App/></StrictMode>);
});
