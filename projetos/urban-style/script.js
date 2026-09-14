const products = [
  {id:'tee', name:'Camiseta Essential', category:'Camisetas', price:149.90, image:'tee.jpg', sizes:['P','M','G','GG'], alt:'Camiseta branca básica, imagem ilustrativa'},
  {id:'hoodie', name:'Moletom Everyday', category:'Moletons', price:279.90, image:'hoodie.jpg', sizes:['P','M','G','GG'], alt:'Moletom com capuz, imagem ilustrativa'},
  {id:'pants', name:'Jeans Straight', category:'Calças', price:229.90, image:'pants.jpg', sizes:['36','38','40','42','44'], alt:'Calça jeans azul, imagem ilustrativa'},
  {id:'cap', name:'Boné Studio', category:'Acessórios', price:119.90, image:'cap.jpg', sizes:['Único'], alt:'Boné casual, imagem ilustrativa'}
];
const cartKey = 'loung-urban-cart-v1';
let cart = Demo.read(cartKey, [], data => Array.isArray(data) && data.length <= 30 && data.every(item => {
  const product = products.find(p => p.id === item?.id);
  return product && product.sizes.includes(item.size) && Number.isInteger(item.qty) && item.qty > 0 && item.qty <= 20;
}));
let category = 'all';
const cartDialog = document.getElementById('cart-dialog');
const shop = document.getElementById('products');
const checkoutStatus = document.getElementById('checkout-status');
function renderProducts() {
  let visible = products.filter(p => category === 'all' || p.category === category);
  const sort = document.getElementById('sort').value;
  if (sort !== 'default') visible.sort((a,b) => sort === 'price-up' ? a.price-b.price : b.price-a.price);
  document.getElementById('product-count').textContent = visible.length + ' produtos nesta seleção';
  shop.innerHTML = visible.map(p => `<article class="product-card"><div class="product-image"><img src="../assets/${p.image}" width="600" height="750" alt="${p.alt}" loading="lazy"><span>IMAGEM ILUSTRATIVA</span></div><span class="product-category">${p.category}</span><h3>${p.name}</h3><p>${Demo.money(p.price)}</p><label>Tamanho — ${p.name}<select id="size-${p.id}">${p.sizes.map(s=>`<option>${s}</option>`).join('')}</select></label><button class="button" data-add="${p.id}" aria-label="Adicionar ${p.name} à sacola">Adicionar à sacola +</button></article>`).join('');
}
function renderCart() {
  document.getElementById('cart-count').textContent = cart.reduce((n,p)=>n+p.qty,0);
  document.getElementById('cart-items').innerHTML = cart.length ? cart.map((item,index) => {
    const p = products.find(p=>p.id===item.id);
    return `<article class="cart-row"><img src="../assets/${p.image}" alt=""><div><h3>${p.name}</h3><p>Tamanho ${item.size} · ${Demo.money(p.price)}</p><div class="quantity-actions"><button data-quantity="${index}" data-delta="-1" aria-label="Diminuir quantidade de ${p.name}, tamanho ${item.size}" ${item.qty===1?'disabled':''}>−</button><span>${item.qty}</span><button data-quantity="${index}" data-delta="1" aria-label="Aumentar quantidade de ${p.name}, tamanho ${item.size}" ${item.qty===20?'disabled':''}>+</button><button class="remove" data-remove="${index}" aria-label="Remover ${p.name}, tamanho ${item.size}">Remover</button></div></div></article>`;
  }).join('') : '<p class="empty">Sua sacola está vazia. Explore os essenciais e adicione uma peça para experimentar.</p>';
  document.getElementById('cart-total').textContent = Demo.money(cart.reduce((total,item)=>total + products.find(p=>p.id===item.id).price*item.qty,0));
  document.getElementById('checkout').disabled = cart.length === 0;
}
function saveCart() { checkoutStatus.textContent = ''; Demo.save(cartKey, cart); renderCart(); }
document.querySelectorAll('[data-category]').forEach(button=>button.addEventListener('click',()=>{
  category=button.dataset.category;
  document.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  renderProducts();
}));
document.getElementById('sort').addEventListener('change',renderProducts);
shop.addEventListener('click',event=>{
  const button=event.target.closest('[data-add]'); if(!button)return;
  const p=products.find(p=>p.id===button.dataset.add);
  const size=document.getElementById('size-'+p.id).value;
  const existing=cart.find(item=>item.id===p.id&&item.size===size);
  if(existing?.qty===20){Demo.notify('Limite de 20 unidades por tamanho nesta demonstração.');return;}
  if(existing)existing.qty++;else cart.push({id:p.id,size,qty:1});
  saveCart(); Demo.notify(`${p.name}, tamanho ${size}, adicionado à sacola.`);
});
document.getElementById('cart-items').addEventListener('click',event=>{
  const button=event.target.closest('button'); if(!button)return;
  if(button.dataset.remove!==undefined)cart.splice(Number(button.dataset.remove),1);
  if(button.dataset.quantity!==undefined){const item=cart[Number(button.dataset.quantity)];item.qty=Math.min(20,Math.max(1,item.qty+Number(button.dataset.delta)));}
  saveCart();
  // Re-rendering replaces the clicked control; keep keyboard focus inside the dialog.
  document.getElementById('cart-title').setAttribute('tabindex','-1');document.getElementById('cart-title').focus();
});
document.getElementById('open-cart').addEventListener('click',()=>{renderCart();cartDialog.showModal();});
document.getElementById('checkout').addEventListener('click',()=>{
  checkoutStatus.textContent='Compra simulada concluída. Nenhum pedido, pagamento ou envio foi realizado.';
});
document.getElementById('reset-cart').addEventListener('click',()=>{cart=[];saveCart();Demo.notify('Sacola restaurada: vazia e pronta para um novo teste.');});
renderProducts();renderCart();
