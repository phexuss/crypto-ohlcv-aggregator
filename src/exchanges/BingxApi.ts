import { config } from "../config";
import { SymbolNormalizer } from "../services/SymbolNormalizer";
import type {
	IExchangeApi,
	IOhlcvData,
} from "../types";
import { BaseExchangeApi } from "./BaseExchangeApi";

export class BingxApi extends BaseExchangeApi implements IExchangeApi {
	constructor() {
		super(
			config.exchanges.bingx.url,
			config.exchanges.bingx.apiKey,
			config.exchanges.bingx.apiSecret,
		);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		const symbol = SymbolNormalizer.normalize("bingx", market);
		const limit = 1000;

		try {
			const url = new URL(`${this.baseUrl}/openApi/swap/v3/quote/klines`);
			url.searchParams.set("symbol", symbol);
			url.searchParams.set("interval", interval);
			url.searchParams.set("limit", limit.toString());

			const response = await this.fetchWithRetry<{
				data: Array<{
					time: number;
					open: string;
					high: string;
					low: string;
					close: string;
					volume: string;
				}>;
			}>(url.toString());

			if (!response || !response.data || response.data.length === 0) {
				return [];
			}

			const candles: IOhlcvData[] = response.data.map((c) => ({
				timestamp: c.time,
				open: parseFloat(c.open),
				high: parseFloat(c.high),
				low: parseFloat(c.low),
				close: parseFloat(c.close),
				volume: parseFloat(c.volume),
			}));

			return this.sortByTimestamp(this.filterByTime(candles, startTime));
		} catch (error) {
			console.error("BingX API Error:", error);
			return [];
		}
	}
}
