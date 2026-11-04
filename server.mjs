import { createServer } from 'node:http';
// The local HTTP server supplies its own protocol header before handing off to SvelteKit.
process.env.PROTOCOL_HEADER = 'x-idea-garden-protocol';
const { handler } = await import('./build/handler.js');
createServer((request, response) => {
  request.headers['x-idea-garden-protocol'] = 'http';
  handler(request, response);
}).listen(Number(process.env.PORT || 4340), '127.0.0.1', () => console.log('Idea Garden: http://127.0.0.1:' + (process.env.PORT || 4340)));
