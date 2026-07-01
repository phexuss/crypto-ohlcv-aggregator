import { config } from "../config";
import { SymbolNormalizer } from "../services/SymbolNormalizer";
import type {
	IExchangeApi,
	IOhlcvData,
} from "../types";
import { BaseExchangeApi } from "./BaseExchangeApi";

export class MexcApi extends BaseExchangeApi implements IExchangeApi {
	constructor() {
		super(
			config.exchanges.mexc.url,
			config.exchanges.mexc.apiKey,
			config.exchanges.mexc.apiSecret,
		);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		const symbol = SymbolNormalizer.normalize("mexc", market);
		const limit = 1000;

		try {
			const url = new URL(
				`${this.baseUrl}/api/v1/contract/kline/${symbol}`,
			);
			url.searchParams.set("interval", this.mapInterval(interval));
			url.searchParams.set("limit", limit.toString());

			const response = await this.fetchWithRetry<{
				success: boolean;
				data: {
					time: number[];
					open: string[];
					high: string[];
					low: string[];
					close: string[];
					vol: string[];
				};
			}>(url.toString());

			if (!response || !response.success || !response.data) {
				return [];
			}

			const data = response.data;
			const candles: IOhlcvData[] = [];

			for (let i = 0; i < data.time.length; i++) {
				const timestamp = data.time[i] * 1000;
				if (timestamp >= startTime) {
					candles.push({
						timestamp,
						open: parseFloat(data.open[i]),
						high: parseFloat(data.high[i]),
						low: parseFloat(data.low[i]),
						close: parseFloat(data.close[i]),
						volume: parseFloat(data.vol[i]),
					});
				}
			}

			return this.sortByTimestamp(candles);
		} catch (error) {
			console.error("MEXC API Error:", error);
			return [];
		}
	}

	private mapInterval(interval: string): string {
		const unit = interval.slice(-1);
		const value = interval.slice(0, -1);

		if (unit === "m") return `Min${value}`;
		if (unit === "h") {
			if (value === "1") return "Min60";
			if (value === "4") return "Hour4";
		}
		if (unit === "d") return "Day1";
		if (unit === "w") return "Week1";
		if (unit === "M") return "Month1";

		throw new Error(`Unsupported interval for MEXC: ${interval}`);
	}
}
