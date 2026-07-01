import { config } from "../config";
import { SymbolNormalizer } from "../services/SymbolNormalizer";
import type {
	BinanceKlineResponse,
	IExchangeApi,
	IOhlcvData,
	OkxCandleResponse,
} from "../types";
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

export class BybitApi extends BaseExchangeApi implements IExchangeApi {
	constructor() {
		super(
			config.exchanges.bybit.url,
			config.exchanges.bybit.apiKey,
			config.exchanges.bybit.apiSecret,
		);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		throw new Error("BybitApi not implemented yet");
	}
}

export class KuCoinApi extends BaseExchangeApi implements IExchangeApi {
	constructor() {
		super(
			config.exchanges.kucoin.url,
			config.exchanges.kucoin.apiKey,
			config.exchanges.kucoin.apiSecret,
			config.exchanges.kucoin.passphrase,
		);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		throw new Error("KuCoinApi not implemented yet");
	}
}

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
		throw new Error("BitgetApi not implemented yet");
	}
}

export class MexcApi extends BaseExchangeApi implements IExchangeApi {
	constructor() {
		super(config.exchanges.mexc.url);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		throw new Error("MexcApi not implemented yet");
	}
}

export class GateioApi extends BaseExchangeApi implements IExchangeApi {
	constructor() {
		super(config.exchanges.gateio.url);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		throw new Error("GateioApi not implemented yet");
	}
}

export class BitmexApi extends BaseExchangeApi implements IExchangeApi {
	constructor() {
		super(config.exchanges.bitmex.url);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		throw new Error("BitmexApi not implemented yet");
	}
}

export class HtxApi extends BaseExchangeApi implements IExchangeApi {
	constructor() {
		super(config.exchanges.htx.url);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		throw new Error("HtxApi not implemented yet");
	}
}

export class HyperliquidApi extends BaseExchangeApi implements IExchangeApi {
	constructor() {
		super(config.exchanges.hyperliquid.url);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		throw new Error("HyperliquidApi not implemented yet");
	}
}

export class XtApi extends BaseExchangeApi implements IExchangeApi {
	constructor() {
		super(config.exchanges.xt.url);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		throw new Error("XtApi not implemented yet");
	}
}

export class BingxApi extends BaseExchangeApi implements IExchangeApi {
	constructor() {
		super(config.exchanges.bingx.url);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		throw new Error("BingxApi not implemented yet");
	}
}

export class CoinexApi extends BaseExchangeApi implements IExchangeApi {
	constructor() {
		super(config.exchanges.coinex.url);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		throw new Error("CoinexApi not implemented yet");
	}
}

export class BitmartApi extends BaseExchangeApi implements IExchangeApi {
	constructor() {
		super(config.exchanges.bitmart.url);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		throw new Error("BitmartApi not implemented yet");
	}
}

export class BlofinApi extends BaseExchangeApi implements IExchangeApi {
	constructor() {
		super(config.exchanges.blofin.url);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		throw new Error("BlofinApi not implemented yet");
	}
}
