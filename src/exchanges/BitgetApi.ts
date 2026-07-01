import { config } from "../config";
import { SymbolNormalizer } from "../services/SymbolNormalizer";
import type {
	IExchangeApi,
	IOhlcvData,
} from "../types";
import { BaseExchangeApi } from "./BaseExchangeApi";

export class BitgetApi extends BaseExchangeApi implements IExchangeApi {
	constructor() {
		super(
			config.exchanges.bitget.url,
			config.exchanges.bitget.apiKey,
			config.exchanges.bitget.apiSecret,
			config.exchanges.bitget.passphrase,
		);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		const symbol = SymbolNormalizer.normalize("bitget", market);
		const granularity = this.mapInterval(interval);
		const limit = 200;
		let allCandles: IOhlcvData[] = [];
		const now = Date.now();
		let currentEndTime = now;

		for (let i = 0; i < 10; i++) {
			try {
				const url = new URL(`${this.baseUrl}/api/v2/mix/market/candles`);
				url.searchParams.set("symbol", symbol);
				url.searchParams.set("granularity", granularity);
				url.searchParams.set("startTime", startTime.toString());
				url.searchParams.set("endTime", currentEndTime.toString());
				url.searchParams.set("limit", limit.toString());
				url.searchParams.set("productType", "USDT-FUTURES");

				const response = await this.fetchWithRetry<{
					code: string;
					msg?: string;
					data: string[][];
				}>(url.toString());

				if (response.code !== "00000") {
					console.error(`Bitget API Error: ${response.msg}`);
					break;
				}

				const list = response.data;
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

				candles.sort((a, b) => a.timestamp - b.timestamp);
				allCandles = allCandles.concat(candles);

				const oldestCandle = candles[0];
				if (oldestCandle.timestamp < startTime || candles.length < limit) {
					break;
				}
				currentEndTime = oldestCandle.timestamp - 1;
			} catch (error) {
				console.error("Bitget API Request Failed:", error);
				break;
			}
		}

		return this.filterByTime(allCandles, startTime);
	}

	private mapInterval(interval: string): string {
		const unit = interval.slice(-1);
		const value = interval.slice(0, -1);

		if (unit === "m") return `${value}m`;
		if (unit === "h") return `${value}H`;
		if (unit === "d") return `${value}D`;
		if (unit === "w") return `${value}W`;
		return interval;
	}
}
