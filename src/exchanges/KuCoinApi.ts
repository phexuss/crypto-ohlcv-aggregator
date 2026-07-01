import { config } from "../config";
import { SymbolNormalizer } from "../services/SymbolNormalizer";
import type {
	IExchangeApi,
	IOhlcvData,
} from "../types";
import { BaseExchangeApi } from "./BaseExchangeApi";

export class KuCoinApi extends BaseExchangeApi implements IExchangeApi {
	constructor() {
		super(
			config.exchanges.kucoin.url,
			config.exchanges.kucoin.apiKey,
			config.exchanges.kucoin.apiSecret,
			config.exchanges.kucoin.passphrase,
		);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		const symbol = SymbolNormalizer.normalize("kucoin", market);
		const granularity = this.mapInterval(interval);
		const limit = 500;
		let allCandles: IOhlcvData[] = [];
		let currentStartTime = startTime;
		const now = Date.now();

		while (currentStartTime < now) {
			try {
				const url = new URL(`${this.baseUrl}/api/v1/kline/query`);
				url.searchParams.set("symbol", symbol);
				url.searchParams.set("granularity", granularity.toString());
				url.searchParams.set("from", currentStartTime.toString());
				url.searchParams.set("to", now.toString());

				const response = await this.fetchWithRetry<{
					data: number[][];
				}>(url.toString());

				const data = response.data;
				if (!Array.isArray(data) || data.length === 0) {
					break;
				}

				const candles: IOhlcvData[] = data.map((c) => ({
					timestamp: c[0],
					open: c[1],
					high: c[2],
					low: c[3],
					close: c[4],
					volume: c[5],
				}));

				const isAscending =
					candles.length > 1 && candles[0].timestamp < candles[1].timestamp;

				if (!isAscending) {
					candles.reverse();
				}

				allCandles = allCandles.concat(candles);

				const newestCandle = candles[candles.length - 1];
				if (newestCandle.timestamp >= now || candles.length < limit) {
					break;
				}
				currentStartTime = newestCandle.timestamp + 1;

				if (allCandles.length > 100000) break;
			} catch (error) {
				console.error("KuCoin API Error:", error);
				throw error;
			}
		}

		return this.filterByTime(allCandles, startTime);
	}

	private mapInterval(interval: string): number {
		const unit = interval.slice(-1);
		const value = parseInt(interval.slice(0, -1), 10);

		if (unit === "m") return value;
		if (unit === "h") return value * 60;
		if (unit === "d") return value * 60 * 24;
		if (unit === "w") return value * 60 * 24 * 7;
		throw new Error(`Unsupported interval for KuCoin: ${interval}`);
	}
}
