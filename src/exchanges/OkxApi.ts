import { config } from "../config";
import { SymbolNormalizer } from "../services/SymbolNormalizer";
import type {
	IExchangeApi,
	IOhlcvData,
	OkxCandleResponse,
} from "../types";
import { BaseExchangeApi } from "./BaseExchangeApi";

export class OkxApi extends BaseExchangeApi implements IExchangeApi {
	constructor() {
		super(
			config.exchanges.okx.url,
			config.exchanges.okx.apiKey,
			config.exchanges.okx.apiSecret,
			config.exchanges.okx.passphrase,
		);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		const symbol = SymbolNormalizer.normalize("okx", market);
		const bar = this.mapInterval(interval);
		const limit = 100;
		let allCandles: IOhlcvData[] = [];
		let currentAfter: string | undefined = undefined;

		for (let i = 0; i < 10; i++) {
			try {
				const url = new URL(`${this.baseUrl}/api/v5/market/candles`);
				url.searchParams.set("instId", symbol);
				url.searchParams.set("bar", bar);
				url.searchParams.set("limit", limit.toString());
				if (currentAfter) {
					url.searchParams.set("after", currentAfter);
				}

				const response = await this.fetchWithRetry<{
					code: string;
					msg?: string;
					data: OkxCandleResponse[];
				}>(url.toString());

				if (response.code !== "0") {
					console.error(`OKX API Error: ${response.msg}`);
					break;
				}

				const data = response.data;
				if (!Array.isArray(data) || data.length === 0) {
					break;
				}

				const candles: IOhlcvData[] = data.map((c) => ({
					timestamp: parseInt(c[0]),
					open: parseFloat(c[1]),
					high: parseFloat(c[2]),
					low: parseFloat(c[3]),
					close: parseFloat(c[4]),
					volume: parseFloat(c[5]),
				}));

				allCandles = allCandles.concat(candles);

				const oldestCandle = candles[candles.length - 1];
				if (oldestCandle.timestamp <= startTime) {
					break;
				}

				currentAfter = oldestCandle.timestamp.toString();
			} catch (error) {
				console.error("OKX API Request Failed:", error);
				break;
			}
		}

		return this.sortByTimestamp(this.filterByTime(allCandles, startTime));
	}

	private mapInterval(interval: string): string {
		const unit = interval.slice(-1);
		const value = interval.slice(0, -1);
		if (unit === "h") return `${value}H`;
		if (unit === "d") return `${value}D`;
		if (unit === "w") return `${value}W`;
		if (unit === "M") return `${value}M`;
		return interval;
	}
}
