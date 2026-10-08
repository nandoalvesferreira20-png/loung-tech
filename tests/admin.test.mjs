import test from 'node:test';
import assert from 'node:assert/strict';
import {whatsappUrl,emailUrl,searchTerm,dateLabel} from '../admin/helpers.mjs';
test('contatos: normalização sem duplicar DDI e bloqueio de URLs inválidas',()=>{
  assert.equal(whatsappUrl('(11) 98765-4321'),'https://wa.me/5511987654321');
  assert.equal(whatsappUrl('+55 11 98765-4321'),'https://wa.me/5511987654321');
  assert.equal(whatsappUrl('123'),null);
  assert.equal(emailUrl('teste@example.com'),'mailto:teste%40example.com');
  assert.equal(emailUrl('x@example.com\nBcc:other@example.com'),null);
});
test('busca não permite injetar operadores PostgREST e datas usam São Paulo',()=>{
  assert.equal(searchTerm('Empresa,(status.eq.fechado)%_'),'Empresa  status.eq.fechado');
  assert.equal(dateLabel('2026-10-08T02:30:00Z'),'07/10/2026, 23:30');
  assert.equal(dateLabel('invalid'),'Não informado');
});
