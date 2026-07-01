import { config } from "../config";
import { SymbolNormalizer } from "../services/SymbolNormalizer";
import type {
	IExchangeApi,
	IOhlcvData,
} from "../types";
import { BaseExchangeApi } from "./BaseExchangeApi";

export class GateioApi extends BaseExchangeApi implements IExchangeApi {
	constructor() {
		super(
			config.exchanges.gateio.url,
			config.exchanges.gateio.apiKey,
			config.exchanges.gateio.apiSecret,
		);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		const symbol = SymbolNormalizer.normalize("gateio", market);
		const limit = 2000;
		let allCandles: IOhlcvData[] = [];
		let currentFrom = Math.floor(startTime / 1000);
		const now = Math.floor(Date.now() / 1000);

		while (currentFrom < now) {
			try {
				const url = new URL(
					`${this.baseUrl}/api/v4/futures/usdt/candlesticks`,
				);
				url.searchParams.set("contract", symbol);
				url.searchParams.set("from", currentFrom.toString());
				url.searchParams.set("interval", this.mapInterval(interval));
				url.searchParams.set("limit", limit.toString());

				const response = await this.fetchWithRetry<
					Array<{
						t: string;
						o: string;
						h: string;
						l: string;
						c: string;
						v: string;
					}>
				>(url.toString());

				if (!Array.isArray(response) || response.length === 0) {
					break;
				}

				const candles: IOhlcvData[] = response.map((c) => ({
					timestamp: parseInt(c.t, 10) * 1000,
					open: parseFloat(c.o),
					high: parseFloat(c.h),
					low: parseFloat(c.l),
					close: parseFloat(c.c),
					volume: parseFloat(c.v),
				}));

				candles.sort((a, b) => a.timestamp - b.timestamp);
				allCandles = allCandles.concat(candles);

				const newestCandle = candles[candles.length - 1];
				if (newestCandle.timestamp >= now * 1000 || candles.length < limit) {
					break;
				}
				currentFrom = Math.floor(newestCandle.timestamp / 1000) + 1;

				if (allCandles.length > 100000) break;
			} catch (error) {
				console.error("Gate.IO API Error:", error);
				throw error;
			}
		}

		return this.filterByTime(allCandles, startTime);
	}

	private mapInterval(interval: string): string {
		const unit = interval.slice(-1);
		const value = interval.slice(0, -1);

		if (unit === "m") return `${value}m`;
		if (unit === "h") return `${value}h`;
		if (unit === "d") return `${value}d`;
		if (unit === "w") return "7d";

		return interval;
	}
}
