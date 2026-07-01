import { config } from "../config";
import { SymbolNormalizer } from "../services/SymbolNormalizer";
import type {
	BybitKlineResponse,
	IExchangeApi,
	IOhlcvData,
} from "../types";
import { BaseExchangeApi } from "./BaseExchangeApi";

export class BybitApi extends BaseExchangeApi implements IExchangeApi {
	constructor() {
		super(
			config.exchanges.bybit.url,
			config.exchanges.bybit.apiKey,
			config.exchanges.bybit.apiSecret,
		);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		const symbol = SymbolNormalizer.normalize("bybit", market);
		const category = symbol.endsWith("USDT") ? "linear" : "inverse";
		const limit = 1000;
		let allCandles: IOhlcvData[] = [];
		let currentStartTime = startTime;
		const now = Date.now();

		while (currentStartTime < now) {
			try {
				const url = new URL(`${this.baseUrl}/v5/market/kline`);
				url.searchParams.set("category", category);
				url.searchParams.set("symbol", symbol);
				url.searchParams.set("interval", this.mapInterval(interval));
				url.searchParams.set("start", currentStartTime.toString());
				url.searchParams.set("limit", limit.toString());

				const response = await this.fetchWithRetry<{
					retCode: number;
					retMsg?: string;
					result: { list: BybitKlineResponse[] };
				}>(url.toString());

				if (response.retCode !== 0) {
					throw new Error(`Bybit API Error: ${response.retMsg}`);
				}

				const list = response.result.list;
				if (!Array.isArray(list) || list.length === 0) {
					break;
				}

				const candles: IOhlcvData[] = list.map((c) => ({
					timestamp: parseInt(c[0], 10),
					open: parseFloat(c[1]),
					high: parseFloat(c[2]),
					low: parseFloat(c[3]),
					close: parseFloat(c[4]),
					volume: parseFloat(c[5]),
				}));

				allCandles = allCandles.concat(candles);

				const newestCandle = candles[0];
				if (newestCandle.timestamp >= now || candles.length < limit) {
					break;
				}
				currentStartTime = newestCandle.timestamp + 1;

				if (allCandles.length > 100000) break;
			} catch (error) {
				console.error("Bybit API Error:", error);
				throw error;
			}
		}

		return this.sortByTimestamp(this.filterByTime(allCandles, startTime));
	}

	private mapInterval(interval: string): string {
		const unit = interval.slice(-1);
		const value = parseInt(interval.slice(0, -1), 10);

		if (unit === "m") return value.toString();
		if (unit === "h") return (value * 60).toString();
		if (unit === "d") return "D";
		if (unit === "w") return "W";
		if (unit === "M") return "M";
		return interval;
	}
}
