import { config } from "../config";
import { SymbolNormalizer } from "../services/SymbolNormalizer";
import type {
	IExchangeApi,
	IOhlcvData,
} from "../types";
import { BaseExchangeApi } from "./BaseExchangeApi";

export class CoinexApi extends BaseExchangeApi implements IExchangeApi {
	constructor() {
		super(
			config.exchanges.coinex.url,
			config.exchanges.coinex.apiKey,
			config.exchanges.coinex.apiSecret,
		);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		const symbol = SymbolNormalizer.normalize("coinex", market);
		const limit = 1000;
		let allCandles: IOhlcvData[] = [];
		let currentStartTime = startTime;
		const now = Date.now();

		while (currentStartTime < now) {
			try {
				const url = new URL(`${this.baseUrl}/perpetual/v1/market/kline`);
				url.searchParams.set("market", symbol);
				url.searchParams.set("type", this.mapInterval(interval));
				url.searchParams.set("limit", limit.toString());

				const response = await this.fetchWithRetry<{
					data: Array<[number, string, string, string, string, string]>;
				}>(url.toString());

				if (!response || !response.data || response.data.length === 0) {
					break;
				}

				const candles: IOhlcvData[] = response.data
					.map((c) => ({
						timestamp: c[0] * 1000,
						open: parseFloat(c[1]),
						close: parseFloat(c[2]),
						high: parseFloat(c[3]),
						low: parseFloat(c[4]),
						volume: parseFloat(c[5]),
					}))
					.filter((c) => c.timestamp >= startTime && c.timestamp < now);

				if (candles.length === 0) break;

				candles.sort((a, b) => a.timestamp - b.timestamp);
				allCandles = allCandles.concat(candles);

				const newestCandle = candles[candles.length - 1];
				if (newestCandle.timestamp >= now || candles.length < limit) {
					break;
				}
				currentStartTime = newestCandle.timestamp + 1;

				if (allCandles.length > 100000) break;
			} catch (error) {
				console.error("CoinEx API Error:", error);
				throw error;
			}
		}

		return allCandles;
	}

	private mapInterval(interval: string): string {
		const unit = interval.slice(-1);
		const value = interval.slice(0, -1);

		if (unit === "m") return `${value}min`;
		if (unit === "h") return `${value}hour`;
		if (unit === "d") return `${value}day`;
		if (unit === "w") return "1week";

		throw new Error(`Unsupported interval for CoinEx: ${interval}`);
	}
}
