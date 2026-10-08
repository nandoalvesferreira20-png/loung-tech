import { STATUSES, whatsappUrl, emailUrl, searchTerm, dateLabel } from './helpers.mjs';
const $ = id => document.getElementById(id);
const dashboard = Boolean($('authorized'));
let client, selected, page = 0, total = 0, request = 0, active = false, busy = false;
const pageSize = 20;
const fields = 'id,company_name,contact_name,service_type,description,email,phone,status,source,utm_source,utm_medium,utm_campaign,created_at';
function message(value) { $('message').textContent = value; }
function options(select) { for (const [value,label] of Object.entries(STATUSES)) select.add(new Option(label,value)); }
function expire() { active = false; request++; if(dashboard) { $('authorized').hidden = true; $('rows').replaceChildren(); $('metrics')?.replaceChildren(); $('details').close(); $('detail-fields').replaceChildren(); selected=null; } location.replace('/admin/?expired=1'); }
async function authorized() {
  const {data,error} = await client.auth.getUser();
  if(error || !data.user) return null;
  const result = await client.from('admin_users').select('user_id').eq('user_id',data.user.id).maybeSingle();
  if(result.error) throw new Error('authorization');
  return result.data ? data.user : false;
}
async function handleError(error) {
  if(error?.status === 401 || error?.code === 'PGRST301' || error?.code === 'PGRST303') { expire(); return; }
  try {
    const user = await authorized();
    if(!user) {
      active=false; request++; $('authorized').hidden=true; $('rows').replaceChildren(); $('metrics').replaceChildren(); $('details').close(); $('detail-fields').replaceChildren(); selected=null;
      if(user===null) expire(); else message('Acesso negado. Solicite autorização ao administrador do projeto.');
      return;
    }
  } catch { /* Connection failures keep the retry available. */ }
  message('Não foi possível carregar os dados. Verifique sua conexão e tente atualizar.');
}
async function load() {
  if(!active) return;
  const revision = ++request;
  $('list-state').textContent='Carregando solicitações…';
  $('rows').replaceChildren(); $('previous').disabled=true; $('next').disabled=true;
  const term=searchTerm($('search').value), status=$('filter-status').value;
  let query=client.from('leads').select(fields,{count:'exact'}).order('created_at',{ascending:false}).order('id',{ascending:false}).range(page*pageSize,(page+1)*pageSize-1);
  if(status) query=query.eq('status',status);
  if(term) query=query.or(`company_name.ilike.%${term}%,contact_name.ilike.%${term}%`);
  const counts=[null,['novo'],['em_contato','em_negociacao','proposta_enviada'],['fechado']].map(statuses=>{
    let q=client.from('leads').select('id',{count:'exact',head:true});
    return statuses ? q.in('status',statuses) : q;
  });
  try {
    const [list,...metrics]=await Promise.all([query,...counts]);
    if(revision!==request || !active) return;
    const error=[list,...metrics].find(result=>result.error)?.error;
    if(error) throw error;
    total=list.count || 0;
    $('metrics').replaceChildren();
    ['Total de leads','Novos contatos','Em andamento','Fechados'].forEach((label,i)=>{
      const card=document.createElement('div'); card.className='metric';
      const title=document.createElement('span');title.textContent=label;
      const count=document.createElement('strong');count.textContent=metrics[i].count;
      card.append(title,count);$('metrics').append(card);
    });
    for(const lead of list.data) {
      const tr=document.createElement('tr');
      for(const value of [lead.company_name,lead.contact_name,lead.service_type,dateLabel(lead.created_at),STATUSES[lead.status] || lead.status]) {
        const td=document.createElement('td');td.textContent=value || 'Não informado';tr.append(td);
      }
      const td=document.createElement('td'),button=document.createElement('button');
      button.className='secondary';button.textContent='Visualizar';button.setAttribute('aria-label',`Visualizar ${lead.company_name}`);button.addEventListener('click',()=>show(lead));td.append(button);tr.append(td);$('rows').append(tr);
    }
    $('list-state').textContent=list.data.length ? `${total} solicitação(ões) encontrada(s).` : (term || status ? 'Nenhum resultado encontrado.' : 'Nenhuma solicitação recebida ainda.');
    $('page').textContent=`Página ${page+1} de ${Math.max(1,Math.ceil(total/pageSize))}`;
    $('previous').disabled=page===0;$('next').disabled=(page+1)*pageSize>=total;
    message('');
  } catch(error) { if(revision===request) { $('list-state').textContent='Falha ao carregar. Use Atualizar para tentar novamente.'; await handleError(error); } }
}
function show(lead) {
  selected=lead; $('detail-fields').replaceChildren();$('detail-message').textContent='';
  const dl=document.createElement('dl');
  for(const [label,value] of [['Empresa',lead.company_name],['Responsável',lead.contact_name],['Serviço solicitado',lead.service_type],['Descrição',lead.description],['E-mail',lead.email],['Telefone / WhatsApp',lead.phone],['Data e hora (São Paulo)',dateLabel(lead.created_at)],['Origem',lead.source],['UTM source',lead.utm_source],['UTM medium',lead.utm_medium],['UTM campaign',lead.utm_campaign],['Status',STATUSES[lead.status] || lead.status]]) {
    const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value || 'Não informado';dl.append(dt,dd);
  }
  $('detail-fields').append(dl);$('lead-status').value=lead.status;
  for(const [id,url] of [['whatsapp',whatsappUrl(lead.phone)],['mailto',emailUrl(lead.email)]]) { $(id).hidden=!url;$(id).removeAttribute('href');if(url) $(id).href=url; }
  $('details').showModal();
}
async function start() {
  const config=window.LOUNG_ADMIN_CONFIG || {};
  try {
    if(!/^https:\/\//.test(config.supabaseUrl) || !config.publishableKey || /^(sb_secret_)/.test(config.publishableKey)) throw new Error('config');
    if(config.publishableKey.split('.').length===3) {
      const payload=JSON.parse(atob(config.publishableKey.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
      if(payload.role!=='anon') throw new Error('config');
    } else if(!config.publishableKey.startsWith('sb_publishable_')) throw new Error('config');
    const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.57.4');
    client=createClient(config.supabaseUrl,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'loung-admin-auth'}});
  } catch { message('Painel indisponível. Verifique a configuração pública e sua conexão com o administrador.');if($('login-button')) $('login-button').disabled=true;return; }
  client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT' && dashboard) expire();});
  if(dashboard) {
    $('logout').addEventListener('click',async()=>{ const result=await client.auth.signOut(); if(result.error) {message('Não foi possível sair. Tente novamente.');return;} expire(); });
    options($('filter-status'));options($('lead-status'));
    $('filters').addEventListener('submit',event=>{event.preventDefault();page=0;load();});
    $('refresh').addEventListener('click',()=>load());
    $('previous').addEventListener('click',()=>{if(page>0){page--;load();}});
    $('next').addEventListener('click',()=>{if((page+1)*pageSize<total){page++;load();}});
    $('close').addEventListener('click',()=>{if(!busy)$('details').close();});
    $('details').addEventListener('cancel',event=>{if(busy)event.preventDefault();});
    $('status-form').addEventListener('submit',async event=>{
      event.preventDefault();if(busy || !active || !selected) return;
      const status=$('lead-status').value;if(!Object.hasOwn(STATUSES,status)) return;
      busy=true;$('save').disabled=true;$('lead-status').disabled=true;$('detail-message').textContent='Salvando…';
      try {
        const result=await client.from('leads').update({status}).eq('id',selected.id).select('id,status').single();
        if(result.error) throw result.error;
        if(!active) return;
        selected.status=result.data.status;
        const wasOpen=$('details').open;if(wasOpen)$('details').close();show(selected);
        $('detail-message').textContent='Status atualizado.';await load();
      } catch(error) { $('detail-message').textContent='Não foi possível salvar. Sua seleção foi mantida; tente novamente.';await handleError(error); }
      finally {busy=false;$('save').disabled=false;$('lead-status').disabled=false;}
    });
  } else {
    $('login-form').addEventListener('submit',async event=>{
      event.preventDefault();$('login-button').disabled=true;message('Autenticando…');
      try {
        const result=await client.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});
        $('password').value='';
        if(result.error) {message('Não foi possível entrar. Confira e-mail e senha ou tente novamente.');return;}
        const user=await authorized();
        if(user) location.replace('/admin/dashboard/');else {await client.auth.signOut();message('Acesso negado. Solicite autorização ao administrador do projeto.');}
      } catch {message('Não foi possível verificar seu acesso. Verifique sua conexão e tente novamente.');}
      finally {$('login-button').disabled=false;}
    });
  }
  try {
    const user=await authorized();
    if(dashboard) {
      if(user===null) {expire();return;}
      if(user===false) {message('Acesso negado. Solicite autorização ao administrador do projeto.');return;}
      active=true;$('user').textContent=`Conectado: ${user.email}`;$('authorized').hidden=false;await load();
    } else if(user) location.replace('/admin/dashboard/');else message(new URLSearchParams(location.search).has('expired')?'Entre para acessar o painel.':'Use sua conta autorizada da equipe.');
  } catch {message('Não foi possível verificar seu acesso. Recarregue a página para tentar novamente.');}
}
start();
