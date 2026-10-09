import { EventEmitter } from 'node:events';

export interface Tick {
  symbol: string;
  price: number;
  size: number;
  ts: number;
  seq: number;
}

const TICK_MS = Number(process.env.TICK_MS ?? 100);

export class Simulator extends EventEmitter {
  private seq = 0;
  private prices: Record<string, number> = {
    BTCUSD: 67000,
    ETHUSD: 3500,
    SOLUSD: 160
  };

  start()  {
    setInterval(() => {
      for (const symbol of Object.keys(this.prices)) {
        const next = this.prices[symbol] * (1 + (Math.random() - 0.5) * 0.002);

        this.prices[symbol] = Math.round(next  * 100) / 100;

        const tick: Tick = {
          symbol,
          price: this.prices[symbol],
          size: Math.round(Math.random() * 200) / 100,
          ts: Date.now(),
          seq: ++this.seq,
        };

        this.emit('tick', tick);
      }
    }, TICK_MS);
  }
}