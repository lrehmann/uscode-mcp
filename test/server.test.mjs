import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../dist/server.js';
import { createApiClient } from '../dist/client.js';

test('SDK client discovers tools, retrieves linked citations, and validates input', async () => {
  const [ct, st] = InMemoryTransport.createLinkedPair();
  const section = { text: 'Statutory text.', inlineCitation: '[5 U.S.C. § 552](https://uscode.ecfr.io/title/5/section/552)', release: {id:'119-117'}, sourceDate:'2026-09-25', nextOffset:null };
  const server = createServer({ titles: async () => ({titles: []}), search: async () => ({results: []}), section: async () => section });
  const client = new Client({ name:'test', version:'1' });
  await server.connect(st); await client.connect(ct);
  try {
    assert.deepEqual((await client.listTools()).tools.map(t=>t.name), ['search_uscode','get_section','list_titles']);
    const result = await client.callTool({name:'get_section',arguments:{path:'/title/5/section/552'}});
    assert.deepEqual(result.structuredContent.data, section);
    assert.ok((await client.readResource({uri:'uscode://citation-guide'})).contents[0].text.includes('uscode.ecfr.io'));
    assert.equal((await client.getPrompt({name:'cite_statutes',arguments:{question:'Research FOIA'}})).messages[0].role,'user');
    assert.equal((await client.callTool({name:'search_uscode',arguments:{query:'test',limit:100}})).isError,true);
    assert.equal((await client.callTool({name:'get_section',arguments:{path:'https://private.example'}})).isError,true);
  } finally { await client.close(); await server.close(); }
});

test('API client encodes paths and bounds, applies timeout, and rejects challenge/error responses', async () => {
  let observed;
  const api=createApiClient('https://uscode.ecfr.io',async (url, options)=>{observed={url,options}; return Response.json({text:'law'});});
  await api.section('/title/5/section/552',20000,60000);
  assert.equal(observed.url.pathname,'/api/v1/section');
  assert.equal(observed.url.searchParams.get('path'),'/title/5/section/552');
  assert.equal(observed.url.searchParams.get('offset'),'20000');
  assert.ok(observed.options.signal);
  await assert.rejects(createApiClient('https://uscode.ecfr.io',async()=>new Response('',{status:503})).titles(),/503/);
  await assert.rejects(createApiClient('https://uscode.ecfr.io',async()=>new Response('<html>Challenge</html>')).titles(),/JSON/);
  assert.throws(()=>createApiClient('http://public.example'),/HTTPS/);
});
