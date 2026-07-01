import { config } from "../config";
import { SymbolNormalizer } from "../services/SymbolNormalizer";
import type {
	IExchangeApi,
	IOhlcvData,
} from "../types";
import { BaseExchangeApi } from "./BaseExchangeApi";

export class BitmartApi extends BaseExchangeApi implements IExchangeApi {
	constructor() {
		super(
			config.exchanges.bitmart.url,
			config.exchanges.bitmart.apiKey,
			config.exchanges.bitmart.apiSecret,
		);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		const symbol = SymbolNormalizer.normalize("bitmart", market);
		const currentStartTime = startTime;
		const now = Date.now();

		try {
			const url = new URL(`${this.baseUrl}/contract/public/kline`);
			url.searchParams.set("symbol", symbol);
			url.searchParams.set("step", this.mapInterval(interval).toString());
			url.searchParams.set("start_time", Math.floor(currentStartTime / 1000).toString());
			url.searchParams.set("end_time", Math.floor(now / 1000).toString());

			const response = await this.fetchWithRetry<{
				data: Array<{
					timestamp: number;
					open_price: string;
					high_price: string;
					low_price: string;
					close_price: string;
					volume: string;
				}>;
			}>(url.toString());

			if (!response || !response.data || response.data.length === 0) {
				return [];
			}

			const candles: IOhlcvData[] = response.data.map((c) => ({
				timestamp: c.timestamp * 1000,
				open: parseFloat(c.open_price),
				high: parseFloat(c.high_price),
				low: parseFloat(c.low_price),
				close: parseFloat(c.close_price),
				volume: parseFloat(c.volume),
			}));

			return this.sortByTimestamp(this.filterByTime(candles, startTime));
		} catch (error) {
			console.error("Bitmart API Error:", error);
			return [];
		}
	}

	private mapInterval(interval: string): number {
		const unit = interval.slice(-1);
		const value = parseInt(interval.slice(0, -1), 10);

		if (unit === "m") return value;
		if (unit === "h") return value * 60;
		if (unit === "d") return value * 1440;
		if (unit === "w") return value * 10080;

		throw new Error(`Unsupported interval for Bitmart: ${interval}`);
	}
}
