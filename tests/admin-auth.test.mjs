import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as helpers from '../admin/helpers.mjs';
async function fixture({dashboard=false,user=null,allowed=false,invalid=false}={}) {
 const elements=new Map();
 function element() {return {textContent:'',value:'',hidden:true,disabled:false,children:[],handlers:{},addEventListener(type,fn){this.handlers[type]=fn;},replaceChildren(){this.children=[];},append(...items){this.children.push(...items);},add(option){this.children.push(option);},close(){this.open=false;},showModal(){this.open=true;},setAttribute(){},removeAttribute(){}};}
 for(const id of ['message',...(dashboard?['authorized','logout','filter-status','lead-status','filters','refresh','previous','next','close','details','status-form','save','detail-message','detail-fields','rows','metrics','list-state','search','page','user']:['login-form','login-button','email','password'])]) elements.set(id,element());
 let current=user,authCallback,leadReads=0,signedOut=0;
 const client={auth:{async getUser(){return {data:{user:current}};},onAuthStateChange(fn){authCallback=fn;},async signInWithPassword(){if(invalid)return {error:{}};current={id:'fictitious',email:'test@example.com'};return {data:{user:current}};},async signOut(){current=null;signedOut++;authCallback?.('SIGNED_OUT');return {}; }},from(table){
  if(table==='admin_users')return {select(){return this;},eq(){return this;},async maybeSingle(){return {data:allowed?{user_id:'fictitious'}:null};}};
  leadReads++;const result={data:[],count:0};const query={select(){return this;},order(){return this;},range(){return this;},in(){return this;},eq(){return this;},or(){return this;},then(resolve,reject){return Promise.resolve(result).then(resolve,reject);}};return query;
 }};
 const location={search:'',redirect:null,replace(url){this.redirect=url;}};
 const context=vm.createContext({...helpers,URLSearchParams,Option:function(text,value){this.text=text;this.value=value;},window:{LOUNG_ADMIN_CONFIG:{supabaseUrl:'https://example.supabase.co',publishableKey:'sb_publishable_fictitious'}},document:{getElementById:id=>elements.get(id),createElement:element},location,createClient:()=>client});
 let source=await readFile(new URL('../admin/app.js',import.meta.url),'utf8');
 source=source.replace(/^import[^\n]+\n/,'').replace("const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.57.4');",'').replace(/start\(\);\s*$/,'globalThis.started = start();');
 vm.runInContext(source,context);await context.started;
 return {elements,location,get leadReads(){return leadReads;},get signedOut(){return signedOut;},async submit(){await elements.get('login-form').handlers.submit({preventDefault(){}});},async logout(){await elements.get('logout').handlers.click();},expire(){authCallback('SIGNED_OUT');}};
}
test('visitante e conta sem autorização não consultam leads',async()=>{
 const visitor=await fixture({dashboard:true});assert.equal(visitor.location.redirect,'/admin/?expired=1');assert.equal(visitor.leadReads,0);
 const denied=await fixture({dashboard:true,user:{id:'fictitious'},allowed:false});assert.match(denied.elements.get('message').textContent,/Acesso negado/);assert.equal(denied.leadReads,0);
});
test('login correto, senha inválida e conta não autorizada',async()=>{
 const success=await fixture({allowed:true});await success.submit();assert.equal(success.location.redirect,'/admin/dashboard/');
 const invalid=await fixture({invalid:true});await invalid.submit();assert.match(invalid.elements.get('message').textContent,/Confira e-mail e senha/);assert.equal(invalid.location.redirect,null);
 const denied=await fixture();await denied.submit();assert.match(denied.elements.get('message').textContent,/Acesso negado/);assert.equal(denied.signedOut,1);
});
test('dashboard autorizado carrega contagens e logout/expiração escondem dados',async()=>{
 const state=await fixture({dashboard:true,user:{id:'fictitious',email:'test@example.com'},allowed:true});
 assert.equal(state.leadReads,5);assert.equal(state.elements.get('authorized').hidden,false);assert.equal(state.elements.get('metrics').children.length,4);
 await state.logout();assert.equal(state.signedOut,1);assert.equal(state.elements.get('authorized').hidden,true);assert.equal(state.location.redirect,'/admin/?expired=1');
 const expired=await fixture({dashboard:true,user:{id:'fictitious'},allowed:true});expired.expire();assert.equal(expired.elements.get('authorized').hidden,true);assert.equal(expired.elements.get('rows').children.length,0);
});
