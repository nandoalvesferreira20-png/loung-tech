const plans={Mensal:{price:99,period:'1 mês'},Trimestral:{price:249,period:'3 meses'},Anual:{price:799,period:'12 meses'}};
const dialog=document.getElementById('plan-dialog');
const status=document.getElementById('plan-status');
const confirmButton=document.getElementById('confirm-plan');
document.querySelectorAll('[data-plan]').forEach(button=>button.addEventListener('click',()=>{
 const name=button.dataset.plan;const plan=plans[name];
 const summary=document.getElementById('plan-summary');summary.replaceChildren();
 const title=document.createElement('strong');title.textContent=name;
 const price=document.createElement('p');price.textContent=Demo.money(plan.price)+' por '+plan.period+' (valor ilustrativo).';
 const note=document.createElement('p');note.textContent='Esta escolha não cria contrato, matrícula ou cobrança.';
 summary.append(title,price,note);status.textContent='';confirmButton.disabled=false;dialog.showModal();
}));
confirmButton.addEventListener('click',()=>{status.textContent='Escolha simulada concluída. Nenhuma matrícula foi realizada.';confirmButton.disabled=true;});
