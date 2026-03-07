const http = require('http');
function post(path, body){
  return new Promise((resolve,reject)=>{
    const data = JSON.stringify(body);
    const options={hostname:'localhost',port:3001,path,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}};
    const req = http.request(options,res=>{let out='';res.on('data',c=>out+=c);res.on('end',()=>resolve({status:res.statusCode,body:out}));});
    req.on('error',reject);req.write(data);req.end();
  });
}
function get(path, token){
  return new Promise((resolve,reject)=>{
    const options={hostname:'localhost',port:3001,path,method:'GET',headers:{'Authorization':'Bearer '+token}};
    const req = http.request(options,res=>{let out='';res.on('data',c=>out+=c);res.on('end',()=>resolve({status:res.statusCode,body:out}));});
    req.on('error',reject);req.end();
  });
}
(async ()=>{
  try{
    const login = await post('/api/auth/login',{username:'admin',password:'admin'});
    console.log('LOGIN',login.status,login.body);
    const token = JSON.parse(login.body).token;
    const me = await get('/api/auth/me',token);
    console.log('ME',me.status,me.body);
  }catch(e){console.error('ERR',e)}
})();
