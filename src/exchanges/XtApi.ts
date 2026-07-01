import { config } from "../config";
import { SymbolNormalizer } from "../services/SymbolNormalizer";
import type {
	IExchangeApi,
	IOhlcvData,
} from "../types";
import { BaseExchangeApi } from "./BaseExchangeApi";

export class XtApi extends BaseExchangeApi implements IExchangeApi {
	constructor() {
		super(
			config.exchanges.xt.url,
			config.exchanges.xt.apiKey,
			config.exchanges.xt.apiSecret,
		);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		const symbol = SymbolNormalizer.normalize("xt", market);
		const limit = 1000;

		try {
			const url = new URL(
				`${this.baseUrl}/future/market/v1/public/q/kline`,
			);
			url.searchParams.set("symbol", symbol);
			url.searchParams.set("interval", interval);
			url.searchParams.set("limit", limit.toString());

			const response = await this.fetchWithRetry<{
				result: Array<{
					t: number;
					o: string;
					h: string;
					l: string;
					c: string;
					v: string;
				}>;
			}>(url.toString());

			if (!response || !response.result || response.result.length === 0) {
				return [];
			}

			const candles: IOhlcvData[] = response.result.map((c) => ({
				timestamp: c.t,
				open: parseFloat(c.o),
				high: parseFloat(c.h),
				low: parseFloat(c.l),
				close: parseFloat(c.c),
				volume: parseFloat(c.v),
			}));

			return this.sortByTimestamp(this.filterByTime(candles, startTime));
		} catch (error) {
			console.error("XT API Error:", error);
			return [];
		}
	}
}
