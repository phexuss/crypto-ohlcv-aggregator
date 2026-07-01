import { config } from "../config";
import { SymbolNormalizer } from "../services/SymbolNormalizer";
import type {
	IExchangeApi,
	IOhlcvData,
} from "../types";
import { BaseExchangeApi } from "./BaseExchangeApi";

export class BlofinApi extends BaseExchangeApi implements IExchangeApi {
	constructor() {
		super(
			config.exchanges.blofin.url,
			config.exchanges.blofin.apiKey,
			config.exchanges.blofin.apiSecret,
		);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		const symbol = SymbolNormalizer.normalize("blofin", market);
		const limit = 100;

		try {
			const url = new URL(`${this.baseUrl}/api/v1/market/candles`);
			url.searchParams.set("instId", symbol);
			url.searchParams.set("bar", this.mapInterval(interval));
			url.searchParams.set("limit", limit.toString());

			const response = await this.fetchWithRetry<{
				data: Array<[string, string, string, string, string, string]>;
			}>(url.toString());

			if (!response || !response.data || response.data.length === 0) {
				return [];
			}

			const candles: IOhlcvData[] = response.data.map((c) => ({
				timestamp: parseInt(c[0], 10),
				open: parseFloat(c[1]),
				high: parseFloat(c[2]),
				low: parseFloat(c[3]),
				close: parseFloat(c[4]),
				volume: parseFloat(c[5]),
			}));

			return this.sortByTimestamp(this.filterByTime(candles, startTime));
		} catch (error) {
			console.error("Blofin API Error:", error);
			return [];
		}
	}

	private mapInterval(interval: string): string {
		const unit = interval.slice(-1);
		const value = interval.slice(0, -1);

		if (unit === "m") return `${value}m`;
		if (unit === "h") return `${value}H`;
		if (unit === "d") return `${value}D`;
		if (unit === "w") return `${value}W`;
		if (unit === "M") return `${value}M`;

		return interval;
	}
}
