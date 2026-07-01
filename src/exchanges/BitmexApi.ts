import { config } from "../config";
import { SymbolNormalizer } from "../services/SymbolNormalizer";
import type {
	IExchangeApi,
	IOhlcvData,
} from "../types";
import { BaseExchangeApi } from "./BaseExchangeApi";

export class BitmexApi extends BaseExchangeApi implements IExchangeApi {
	constructor() {
		super(
			config.exchanges.bitmex.url,
			config.exchanges.bitmex.apiKey,
			config.exchanges.bitmex.apiSecret,
		);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		const symbol = SymbolNormalizer.normalize("bitmex", market);
		const limit = 1000;
		let allCandles: IOhlcvData[] = [];
		let currentStartTime = new Date(startTime).toISOString();
		const now = new Date().toISOString();

		while (new Date(currentStartTime).getTime() < Date.now()) {
			try {
				const url = new URL(`${this.baseUrl}/api/v1/trade/bucketed`);
				url.searchParams.set("symbol", symbol);
				url.searchParams.set("binSize", interval);
				url.searchParams.set("count", limit.toString());
				url.searchParams.set("startTime", currentStartTime);
				url.searchParams.set("endTime", now);
				url.searchParams.set("reverse", "false");

				const response = await this.fetchWithRetry<
					Array<{
						timestamp: string;
						open: number;
						high: number;
						low: number;
						close: number;
						volume: number;
					}>
				>(url.toString());

				if (!Array.isArray(response) || response.length === 0) {
					break;
				}

				const candles: IOhlcvData[] = response.map((c) => ({
					timestamp: new Date(c.timestamp).getTime(),
					open: parseFloat(String(c.open)),
					high: parseFloat(String(c.high)),
					low: parseFloat(String(c.low)),
					close: parseFloat(String(c.close)),
					volume: parseFloat(String(c.volume)),
				}));

				candles.sort((a, b) => a.timestamp - b.timestamp);
				allCandles = allCandles.concat(candles);

				const newestCandle = candles[candles.length - 1];
				if (newestCandle.timestamp >= Date.now() || candles.length < limit) {
					break;
				}
				currentStartTime = new Date(newestCandle.timestamp + 1).toISOString();

				if (allCandles.length > 100000) break;
			} catch (error) {
				console.error("BitMEX API Error:", error);
				throw error;
			}
		}

		return this.filterByTime(allCandles, startTime);
	}
}
