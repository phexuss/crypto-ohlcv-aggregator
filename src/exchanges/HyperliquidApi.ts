import { config } from "../config";
import { SymbolNormalizer } from "../services/SymbolNormalizer";
import type {
	IExchangeApi,
	IOhlcvData,
} from "../types";
import { BaseExchangeApi } from "./BaseExchangeApi";

export class HyperliquidApi extends BaseExchangeApi implements IExchangeApi {
	constructor() {
		super(
			config.exchanges.hyperliquid.url,
			config.exchanges.hyperliquid.apiKey,
			config.exchanges.hyperliquid.apiSecret,
		);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		const symbol = SymbolNormalizer.normalize("hyperliquid", market);

		try {
			const response = await fetch(`${this.baseUrl}/info`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					type: "candleSnapshot",
					req: {
						coin: symbol,
						interval,
						startTime,
						endTime: Date.now(),
					},
				}),
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json();

			if (!Array.isArray(data) || data.length === 0) {
				return [];
			}

			const candles: IOhlcvData[] = data.map((c: any) => ({
				timestamp: c.t,
				open: parseFloat(c.o),
				high: parseFloat(c.h),
				low: parseFloat(c.l),
				close: parseFloat(c.c),
				volume: parseFloat(c.v),
			}));

			return this.sortByTimestamp(this.filterByTime(candles, startTime));
		} catch (error) {
			console.error("HyperLiquid API Error:", error);
			throw error;
		}
	}
}
