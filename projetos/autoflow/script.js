const flows={
 contact:[
  {icon:'↙',title:'Receber contato',detail:'Entrada ilustrativa pelo site.',log:'Contato Exemplo recebido pelo formulário fictício.'},
  {icon:'◇',title:'Organizar dados',detail:'Identificar o interesse.',log:'Interesse identificado: conhecer um serviço.'},
  {icon:'▤',title:'Criar registro',detail:'Reunir o histórico.',log:'Registro fictício organizado no painel demonstrativo.'},
  {icon:'✓',title:'Preparar retorno',detail:'Definir o próximo passo.',log:'Mensagem ilustrativa preparada. Nada foi enviado.'}
 ],
 order:[
  {icon:'▣',title:'Receber pedido',detail:'Pedido fictício #DEMO-01.',log:'Pedido ilustrativo #DEMO-01 recebido.'},
  {icon:'◇',title:'Conferir itens',detail:'Verificação de exemplo.',log:'Itens fictícios conferidos, sem consulta a estoque real.'},
  {icon:'▤',title:'Organizar etapa',detail:'Preparar acompanhamento.',log:'Pedido movido para preparação no painel fictício.'},
  {icon:'✓',title:'Preparar aviso',detail:'Próxima ação definida.',log:'Aviso ilustrativo preparado. Nenhuma mensagem enviada.'}
 ]
};
let completed=0;let timer=null;let history=[];
const selector=document.getElementById('flow-select');
const run=document.getElementById('run-flow');
const step=document.getElementById('step-flow');
const status=document.getElementById('flow-status');
function render(){
 const nodes=flows[selector.value];
 document.getElementById('flow-nodes').innerHTML=nodes.map((node,i)=>`<li class="flow-node ${i<completed?'complete':i===completed?'current':''}" ${i===completed?'aria-current="step"':''}><span class="node-icon" aria-hidden="true">${node.icon}</span><h3>${node.title}</h3><p>${node.detail}</p><span class="node-state">${i<completed?'✓ Concluída':i===completed?'Próxima etapa':'Aguardando'}</span></li>`).join('');
 document.getElementById('flow-progress').textContent=completed+' de 4 etapas';
 document.getElementById('flow-log').innerHTML=history.length?history.map((text,i)=>`<li>0${i+1} / ${text}</li>`).join(''):'<li>Aguardando execução.</li>';
 run.textContent=timer?'Ⅱ Pausar':completed===4?'↻ Executar novamente':'▶ Iniciar simulação';
 step.disabled=Boolean(timer)||completed===4;
}
function stop(){if(timer){clearInterval(timer);timer=null;}}
function advance(){
 if(completed>=4)return;
 history.push(flows[selector.value][completed].log);completed++;
 if(completed===4){stop();status.textContent='Simulação concluída. Nenhum serviço foi acionado e nenhuma mensagem foi enviada.';}
 else status.textContent=`Etapa ${completed} concluída. ${timer?'Executando a próxima etapa…':'Avance quando quiser.'}`;
 render();
}
function reset(){stop();completed=0;history=[];status.textContent='Pronto para começar. Nenhum serviço externo será acionado.';render();}
run.addEventListener('click',()=>{
 if(timer){stop();status.textContent='Simulação pausada. Você pode continuar ou avançar uma etapa.';render();return;}
 if(completed===4)reset();
 timer=setInterval(advance,1200);status.textContent='Simulação em andamento. Nenhum serviço externo será acionado.';render();
});
step.addEventListener('click',advance);
document.getElementById('reset-flow').addEventListener('click',reset);
selector.addEventListener('change',reset);
window.addEventListener('pagehide',stop);
render();
