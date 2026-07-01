import { config } from "../config";
import { SymbolNormalizer } from "../services/SymbolNormalizer";
import type { BinanceKlineResponse, IExchangeApi, IOhlcvData } from "../types";
import { BaseExchangeApi } from "./BaseExchangeApi";

export class BinanceApi extends BaseExchangeApi implements IExchangeApi {
	constructor() {
		super(
			config.exchanges.binance.url,
			config.exchanges.binance.apiKey,
			config.exchanges.binance.apiSecret,
		);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		const symbol = SymbolNormalizer.normalize("binance", market);
		const limit = 1500;
		let allCandles: IOhlcvData[] = [];
		let currentStartTime = startTime;
		const now = Date.now();

		while (currentStartTime < now) {
			try {
				const url = new URL(`${this.baseUrl}/fapi/v1/klines`);
				url.searchParams.set("symbol", symbol);
				url.searchParams.set("interval", interval);
				url.searchParams.set("startTime", currentStartTime.toString());
				url.searchParams.set("limit", limit.toString());

				const data = await this.fetchWithRetry<BinanceKlineResponse[]>(
					url.toString(),
				);

				if (!Array.isArray(data) || data.length === 0) {
					break;
				}

				const candles: IOhlcvData[] = data.map((c) => ({
					timestamp: c[0],
					open: parseFloat(c[1]),
					high: parseFloat(c[2]),
					low: parseFloat(c[3]),
					close: parseFloat(c[4]),
					volume: parseFloat(c[5]),
				}));

				allCandles = allCandles.concat(candles);

				const lastCandle = candles[candles.length - 1];
				if (lastCandle.timestamp >= now || candles.length < limit) {
					break;
				}
				currentStartTime = lastCandle.timestamp + 1;

				if (allCandles.length > 100000) {
					console.warn("Binance pagination limit reached");
					break;
				}
			} catch (error) {
				console.error("Binance API Error:", error);
				throw error;
			}
		}

		return this.filterByTime(allCandles, startTime);
	}
}
