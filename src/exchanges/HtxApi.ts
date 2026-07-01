import { config } from "../config";
import { SymbolNormalizer } from "../services/SymbolNormalizer";
import type {
	IExchangeApi,
	IOhlcvData,
} from "../types";
import { BaseExchangeApi } from "./BaseExchangeApi";

export class HtxApi extends BaseExchangeApi implements IExchangeApi {
	constructor() {
		super(
			config.exchanges.htx.url,
			config.exchanges.htx.apiKey,
			config.exchanges.htx.apiSecret,
		);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		const symbol = SymbolNormalizer.normalize("htx", market);
		const limit = 2000;

		try {
			const url = new URL(`${this.baseUrl}/swap-ex/market/history/kline`);
			url.searchParams.set("contract_code", symbol);
			url.searchParams.set("period", this.mapInterval(interval));
			url.searchParams.set("size", limit.toString());

			const response = await this.fetchWithRetry<{
				data: Array<{
					id: number;
					open: string;
					high: string;
					low: string;
					close: string;
					vol: string;
				}>;
			}>(url.toString());

			if (!response || !response.data || response.data.length === 0) {
				return [];
			}

			const candles: IOhlcvData[] = response.data
				.map((c) => ({
					timestamp: c.id * 1000,
					open: parseFloat(c.open),
					high: parseFloat(c.high),
					low: parseFloat(c.low),
					close: parseFloat(c.close),
					volume: parseFloat(c.vol),
				}))
				.filter((c) => c.timestamp >= startTime);

			return this.sortByTimestamp(candles);
		} catch (error) {
			console.error("HTX API Error:", error);
			return [];
		}
	}

	private mapInterval(interval: string): string {
		const unit = interval.slice(-1);
		const value = interval.slice(0, -1);

		if (unit === "m") return `${value}min`;
		if (unit === "h") {
			if (value === "1") return "60min";
			if (value === "4") return "4hour";
		}
		if (unit === "d") return "1day";
		if (unit === "w") return "1week";
		if (unit === "M") return "1mon";

		throw new Error(`Unsupported interval for HTX: ${interval}`);
	}
}
