import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { fileURLToPath } from  'node:url';
import { Simulator, Tick } from './simulator';

const PROTO_PATH = fileURLToPath(new URL('../../proto/miniterm.proto', import.meta.url));
const def = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: Number,
  enums: String,
  defaults: true,
  oneofs: true,
});

const pkg = grpc.loadPackageDefinition(def) as any;
const sim = new Simulator();

sim.start();

const server = new grpc.Server();

server.addService(pkg.miniterm.Core.service, {
  SubscribeMarket(call: grpc.ServerWritableStream<any, any>) {
    const symbols: string[] = call.request.symbols;
    const onTick = (t: Tick) => {
      if (symbols.length === 0 || symbols.includes(t.symbol)) call.write({ tick: t});
    };
    
    sim.on('tick', onTick);
    call.on('cancelled', () => sim.off('tick', onTick));
  },
});

server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
  console.log('Core gRPC on :50051');
});
