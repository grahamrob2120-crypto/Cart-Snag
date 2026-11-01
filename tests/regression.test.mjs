import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
test('all HTML ids are unique',()=>assert.equal(new Set(ids).size,ids.length));
test('every local navigation anchor resolves to an element',()=>{
  for(const [,target] of html.matchAll(/href="#([^"]+)"/g))
    assert.ok(ids.includes(target),'Missing anchor target: '+target);
});
test('every JavaScript DOM id resolves to a page element',()=>{
  for(const [,id] of app.matchAll(/\$\('([^']+)'\)/g))
    assert.ok(ids.includes(id),'Missing JavaScript element: '+id);
});
test('core account and receipt workflows remain available',()=>{
  for(const id of ['country','searchInput','searchButton','authForm','loginTab','registerTab','resetPassword','receiptForm','receiptList','watchForm','watchList','exportReceipts','signOut','memberArea'])
    assert.ok(ids.includes(id),'Missing workflow element: '+id);
});
test('membership is clearly not accepting payments before PayPal is ready',()=>{
  assert.match(html,/PayPal checkout — coming next/);
  assert.match(html,/No subscription is active/);
});
test('five food groups remain configured',()=>{
  for(const name of ['Meat & protein','Dairy','Vegetables','Fruits','Grains'])
    assert.ok(app.includes(name),'Missing food group: '+name);
});
test('browser code contains no server-side credentials',()=>{
  assert.doesNotMatch(app,/sb_secret_|service_role/);
  assert.doesNotMatch(html,/sb_secret_|service_role/);
});

test('switching countries never launches an external flyer website',()=>{
  const handler=app.match(/\$\('country'\)\.addEventListener\('change',\(\)=>\{([\s\S]*?)\}\);/);
  assert.ok(handler,'Country change handler must exist');
  assert.doesNotMatch(handler[1],/openFlyers\s*\(/);
});
