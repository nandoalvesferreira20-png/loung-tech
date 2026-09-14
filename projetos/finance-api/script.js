const endpoints={
 users:{method:'GET',path:'/v1/users',description:'Lista os usuários fictícios deste exemplo.'},
 transactions:{method:'GET',path:'/v1/transactions',description:'Consulta transações fictícias, sem acesso a contas bancárias.'},
 expenses:{method:'POST',path:'/v1/expenses',description:'Simula a criação de uma despesa. Nenhum registro é persistido.'}
};
const data={
 users:[{id:1,name:'Pessoa Exemplo A',email:'pessoa.a@example.com'},{id:2,name:'Pessoa Exemplo B',email:'pessoa.b@example.com'},{id:3,name:'Pessoa Exemplo C',email:'pessoa.c@example.com'}],
 transactions:[{id:'demo-01',description:'Receita ilustrativa',amount:1250,type:'income'},{id:'demo-02',description:'Material de escritório',amount:85.5,type:'expense'},{id:'demo-03',description:'Serviço ilustrativo',amount:320,type:'expense'}]
};
let selected='users';let lastResponse='';
const response=document.getElementById('response-output');
const status=document.getElementById('request-status');
const body=document.getElementById('request-body');
function updateExample(){
 const endpoint=endpoints[selected];
 const base='https://api.example.com'+endpoint.path;
 document.getElementById('request-code').textContent=endpoint.method==='GET'?`// Exemplo ilustrativo, não executado\ncurl "${base}?limit=${document.getElementById('limit').value}"`:`// Exemplo ilustrativo, não executado\ncurl -X POST "${base}"\n  -H "Content-Type: application/json"\n  -d '${body.value}'`;
}
function clearResponse(){lastResponse='';response.textContent='// Execute uma simulação para ver a resposta.';document.getElementById('response-code').textContent='AGUARDANDO';status.textContent='';document.getElementById('copy-response').disabled=true;}
function choose(key){
 selected=key;const endpoint=endpoints[key];
 document.getElementById('method').textContent=endpoint.method;
 document.getElementById('endpoint-path').textContent=endpoint.path;
 document.getElementById('endpoint-description').textContent=endpoint.description;
 document.getElementById('body-label').hidden=key!=='expenses';
 document.getElementById('limit').disabled=key==='expenses';
 document.querySelectorAll('[data-endpoint]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.endpoint===key)));
 updateExample();clearResponse();
}
document.querySelectorAll('[data-endpoint]').forEach(button=>button.addEventListener('click',()=>{
 choose(button.dataset.endpoint);
 if(button.closest('.docs-sidebar')){document.getElementById('explorador').scrollIntoView();document.getElementById('run-request').focus({preventScroll:true});}
}));
body.addEventListener('input',()=>{updateExample();clearResponse();});
document.getElementById('limit').addEventListener('change',()=>{updateExample();clearResponse();});
document.getElementById('scenario').addEventListener('change',clearResponse);
document.getElementById('run-request').addEventListener('click',()=>{
 const scenario=document.getElementById('scenario').value;
 let code=200;let result;
 if(scenario==='unauthorized'){code=401;result={error:'unauthorized',message:'Acesso não autorizado neste cenário simulado.'};}
 else if(scenario==='server'){code=500;result={error:'server_error',message:'Falha de servidor simulada. Tente o cenário Sucesso.'};}
 else if(selected==='expenses'){
  try{
   const input=JSON.parse(body.value);
   if(!input||typeof input.description!=='string'||!input.description.trim()||input.description.length>120||typeof input.amount!=='number'||!Number.isFinite(input.amount)||input.amount<=0||input.amount>1000000)throw new Error('Informe description (texto de 1 a 120 caracteres) e amount (número maior que zero, até 1000000).');
   code=201;result={id:'demo-expense',description:input.description.trim(),amount:input.amount,simulated:true};
  }catch(error){code=400;result={error:'invalid_request',message:error instanceof SyntaxError?'JSON inválido. Verifique aspas, vírgulas e chaves.':error.message};}
 }else result={data:data[selected].slice(0,Number(document.getElementById('limit').value)),simulated:true};
 lastResponse=JSON.stringify(result,null,2);response.textContent=lastResponse;
 document.getElementById('response-code').textContent=code+' '+({200:'OK',201:'CREATED',400:'BAD REQUEST',401:'UNAUTHORIZED',500:'SERVER ERROR'}[code]);
 status.textContent=`Simulação concluída: resposta ${code}. Nenhuma requisição foi enviada.`;
 document.getElementById('copy-response').disabled=false;
});
async function copy(text,button){
 try{await navigator.clipboard.writeText(text);const old=button.textContent;button.textContent='Copiado ✓';setTimeout(()=>button.textContent=old,1800);status.textContent='Exemplo copiado para a área de transferência.';}
 catch{status.textContent='Não foi possível copiar automaticamente. Selecione e copie o texto do exemplo.';}
}
document.getElementById('copy-request').addEventListener('click',event=>copy(document.getElementById('request-code').textContent,event.currentTarget));
document.getElementById('copy-response').addEventListener('click',event=>copy(lastResponse,event.currentTarget));
choose('users');
