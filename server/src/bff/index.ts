import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { WebSocketServer, WebSocket } from 'ws';
import { fileURLToPath } from 'node:url';


const PROTO_PATH = fileURLToPath(new URL('../../proto/miniterm.proto', import.meta.url));
const def = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: Number,
  enums: String,
  defaults: true,
  oneofs: true,
});

const pkg = grpc.loadPackageDefinition(def) as any;
const core = new pkg.miniterm.Core('localhost:50051', grpc.credentials.createInsecure());

const stream = core.SubscribeMarket({ symbols: [] });
const subs =  new Map<string, Set<WebSocket>>();

stream.on('data', (ev: any) => {
  if (!ev.tick) return;

  const t = ev.tick;
  const msg = JSON.stringify({ type: 'tick', topic: `trades:${t.symbol}`, data: t });
  
  subs.get(`trades:${t.symbol}`)?.forEach(ws => ws.send(msg));
});

stream.on('error', (e: Error) => console.error('core stream error:', e.message));

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  const myTopics = new Set<string>();

  ws.on('message', (raw) => {
    const m =  JSON.parse(raw.toString());

    if (m.op === 'subscribe') {
      if (!subs.has(m.topic)) subs.set(m.topic, new Set());

      subs.get(m.topic)!.add(ws);
      myTopics.add(m.topic);
    }

    if (m.op === 'unsubscribe') {
      subs.get(m.topic)?.delete(ws);
      myTopics.delete(m.topic);
    }
  });

  ws.on('close', () => {
    myTopics.forEach(t => subs.get(t)?.delete(ws));
  });
});

console.log('BFF WS on :8080');