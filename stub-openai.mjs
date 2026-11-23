// Local OpenAI-compatible stub for testing the tutor end-to-end without a paid key.
// It answers from the grounded system prompt it is given, so citations and grounding
// can be verified honestly. Never used in production.
import http from 'node:http';
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const payload = JSON.parse(body || '{}');
    const system = payload.messages?.find((m) => m.role === 'system')?.content || '';
    const user = [...(payload.messages || [])].reverse().find((m) => m.role === 'user')?.content || '';
    const passages = [...system.matchAll(/^\[(\d+)\] (.+)$/gm)].map((m) => `[${m[1]}] ${m[2].trim()}`);
    const hasContext = passages.length > 0;
    const text = [
      hasContext ? 'From the course material:' : 'Beyond the course material:',
      hasContext ? passages.slice(0, 2).join('\n') : `No matching passage; answering generally about "${user}".`,
      '',
      '```python',
      'def add(item, bucket=None):',
      '    bucket = [] if bucket is None else bucket',
      '    bucket.append(item)',
      '    return bucket',
      '```',
      'STUB_MODEL_REPLY',
    ].join('\n');
    if (payload.stream) {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      for (const chunk of text.match(/[\s\S]{1,60}/g)) {
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      model: payload.model,
      choices: [{ message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 100, completion_tokens: 50 },
    }));
  });
});
server.listen(4199, () => console.log('stub provider on 4199'));
