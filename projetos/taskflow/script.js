const initialTasks = [
 {id:'t1',title:'Definir a estrutura do site',owner:'Ana',priority:'Alta',stage:'todo'},
 {id:'t2',title:'Selecionar imagens da coleção',owner:'Lucas',priority:'Média',stage:'todo'},
 {id:'t3',title:'Criar a página de serviços',owner:'Ana',priority:'Alta',stage:'doing'},
 {id:'t4',title:'Revisar os textos de apresentação',owner:'Equipe',priority:'Média',stage:'doing'},
 {id:'t5',title:'Organizar as referências visuais',owner:'Lucas',priority:'Baixa',stage:'done'},
 {id:'t6',title:'Planejar a navegação principal',owner:'Equipe',priority:'Média',stage:'done'}
];
const stages={todo:'A fazer',doing:'Em andamento',done:'Concluído'};
const key='loung-taskflow-v1';
let tasks=Demo.read(key,initialTasks,data=>Array.isArray(data)&&data.length<=200&&new Set(data.map(t=>t?.id)).size===data.length&&data.every(t=>t&&typeof t.id==='string'&&typeof t.title==='string'&&t.title.trim().length>0&&t.title.length<=90&&['Ana','Lucas','Equipe'].includes(t.owner)&&['Alta','Média','Baixa'].includes(t.priority)&&Object.hasOwn(stages,t.stage)));
let editing=null;
const taskDialog=document.getElementById('task-dialog');
const form=document.getElementById('task-form');
const titleInput=document.getElementById('task-title');
const board=document.getElementById('board');
function render(){
 const query=document.getElementById('search').value.toLocaleLowerCase('pt-BR').trim();
 const priority=document.getElementById('priority-filter').value;
 const owner=document.getElementById('owner-filter').value;
 const visible=tasks.filter(t=>t.title.toLocaleLowerCase('pt-BR').includes(query)&&(priority==='all'||t.priority===priority)&&(owner==='all'||t.owner===owner));
 document.getElementById('filter-status').textContent=`${visible.length} de ${tasks.length} tarefas exibidas`;
 const done=tasks.filter(t=>t.stage==='done').length;
 document.getElementById('metric-total').textContent=tasks.length;
 document.getElementById('metric-doing').textContent=tasks.filter(t=>t.stage==='doing').length;
 document.getElementById('metric-done').textContent=done;
 const progress=tasks.length?Math.round(done/tasks.length*100):0;
 document.getElementById('metric-progress').textContent=progress+'%';
 document.getElementById('progress').value=progress;
 board.innerHTML=Object.entries(stages).map(([stage,label])=>{
  const group=visible.filter(t=>t.stage===stage);
  return `<section class="column" aria-label="${label}"><div class="column-header"><h3>${label}</h3><span>${group.length}</span></div>${group.length?group.map(t=>`<article class="task-card"><span class="priority ${t.priority==='Alta'?'high':t.priority==='Baixa'?'low':''}">${t.priority}</span><h4>${Demo.escape(t.title)}</h4><div class="task-owner"><span>◉ ${t.owner}</span><button data-edit="${Demo.escape(t.id)}" aria-label="Editar ${Demo.escape(t.title)}">Editar ↗</button></div><label>Mover ${Demo.escape(t.title)} para<select data-move="${Demo.escape(t.id)}">${Object.entries(stages).map(([s,l])=>`<option value="${s}" ${s===stage?'selected':''}>${l}</option>`).join('')}</select></label></article>`).join(''):'<p class="empty">Nenhuma tarefa nesta etapa para os filtros atuais.</p>'}</section>`;
 }).join('');
}
function persist(){Demo.save(key,tasks);render();}
function openTask(task){
 editing=task?.id||null;
 document.getElementById('task-dialog-title').textContent=task?'Editar tarefa':'Nova tarefa';
 titleInput.value=task?.title||''; titleInput.setCustomValidity('');
 document.getElementById('task-owner').value=task?.owner||'Ana';
 document.getElementById('task-priority').value=task?.priority||'Média';
 document.getElementById('task-stage').value=task?.stage||'todo';
 document.getElementById('delete-task').hidden=!task;
 taskDialog.showModal();titleInput.focus();
}
document.getElementById('new-task').addEventListener('click',()=>openTask());
titleInput.addEventListener('input',()=>titleInput.setCustomValidity(''));
form.addEventListener('submit',event=>{
 event.preventDefault();
 const title=titleInput.value.trim();
 if(!title){titleInput.setCustomValidity('Digite um título para a tarefa.');titleInput.reportValidity();return;}
 if(!editing&&tasks.length>=200){Demo.notify('Limite de 200 tarefas de exemplo atingido.');return;}
 const task={id:editing||crypto.randomUUID(),title,owner:document.getElementById('task-owner').value,priority:document.getElementById('task-priority').value,stage:document.getElementById('task-stage').value};
 if(editing)tasks=tasks.map(t=>t.id===editing?task:t);else tasks.push(task);
 persist();taskDialog.close();document.getElementById('new-task').focus();Demo.notify('Tarefa salva nesta demonstração.');
});
document.getElementById('delete-task').addEventListener('click',()=>{tasks=tasks.filter(t=>t.id!==editing);persist();taskDialog.close();document.getElementById('new-task').focus();Demo.notify('Tarefa de exemplo excluída.');});
board.addEventListener('click',event=>{const button=event.target.closest('[data-edit]');if(button)openTask(tasks.find(t=>t.id===button.dataset.edit));});
board.addEventListener('change',event=>{
 const select=event.target.closest('[data-move]');if(!select)return;
 const id=select.dataset.move;const task=tasks.find(t=>t.id===id);task.stage=select.value;persist();
 [...board.querySelectorAll('[data-move]')].find(s=>s.dataset.move===id)?.focus();Demo.notify('Tarefa movida para '+stages[task.stage]+'.');
});
['search','priority-filter','owner-filter'].forEach(id=>document.getElementById(id).addEventListener(id==='search'?'input':'change',render));
function clearFilters(){document.getElementById('search').value='';document.getElementById('priority-filter').value='all';document.getElementById('owner-filter').value='all';render();}
document.getElementById('clear-filters').addEventListener('click',clearFilters);
const restoreDialog=document.getElementById('restore-dialog');
document.getElementById('restore').addEventListener('click',()=>restoreDialog.showModal());
document.getElementById('confirm-restore').addEventListener('click',()=>{tasks=structuredClone(initialTasks);clearFilters();persist();restoreDialog.close();Demo.notify('Os seis exemplos iniciais foram restaurados.');});
render();
