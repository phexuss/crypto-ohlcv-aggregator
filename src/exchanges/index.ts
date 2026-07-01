import { config } from "../config";
import { SymbolNormalizer } from "../services/SymbolNormalizer";
import type {
	BinanceKlineResponse,
	BybitKlineResponse,
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
		const symbol = SymbolNormalizer.normalize("bybit", market);
		const category = symbol.endsWith("USDT") ? "linear" : "inverse";
		const limit = 1000;
		let allCandles: IOhlcvData[] = [];
		let currentStartTime = startTime;
		const now = Date.now();

		while (currentStartTime < now) {
			try {
				const url = new URL(`${this.baseUrl}/v5/market/kline`);
				url.searchParams.set("category", category);
				url.searchParams.set("symbol", symbol);
				url.searchParams.set("interval", this.mapInterval(interval));
				url.searchParams.set("start", currentStartTime.toString());
				url.searchParams.set("limit", limit.toString());

				const response = await this.fetchWithRetry<{
					retCode: number;
					retMsg?: string;
					result: { list: BybitKlineResponse[] };
				}>(url.toString());

				if (response.retCode !== 0) {
					throw new Error(`Bybit API Error: ${response.retMsg}`);
				}

				const list = response.result.list;
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

				allCandles = allCandles.concat(candles);

				const newestCandle = candles[0];
				if (newestCandle.timestamp >= now || candles.length < limit) {
					break;
				}
				currentStartTime = newestCandle.timestamp + 1;

				if (allCandles.length > 100000) break;
			} catch (error) {
				console.error("Bybit API Error:", error);
				throw error;
			}
		}

		return this.sortByTimestamp(this.filterByTime(allCandles, startTime));
	}

	private mapInterval(interval: string): string {
		const unit = interval.slice(-1);
		const value = parseInt(interval.slice(0, -1), 10);

		if (unit === "m") return value.toString();
		if (unit === "h") return (value * 60).toString();
		if (unit === "d") return "D";
		if (unit === "w") return "W";
		if (unit === "M") return "M";
		return interval;
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
		const symbol = SymbolNormalizer.normalize("kucoin", market);
		const granularity = this.mapInterval(interval);
		const limit = 500;
		let allCandles: IOhlcvData[] = [];
		let currentStartTime = startTime;
		const now = Date.now();

		while (currentStartTime < now) {
			try {
				const url = new URL(`${this.baseUrl}/api/v1/kline/query`);
				url.searchParams.set("symbol", symbol);
				url.searchParams.set("granularity", granularity.toString());
				url.searchParams.set("from", currentStartTime.toString());
				url.searchParams.set("to", now.toString());

				const response = await this.fetchWithRetry<{
					data: number[][];
				}>(url.toString());

				const data = response.data;
				if (!Array.isArray(data) || data.length === 0) {
					break;
				}

				const candles: IOhlcvData[] = data.map((c) => ({
					timestamp: c[0],
					open: c[1],
					high: c[2],
					low: c[3],
					close: c[4],
					volume: c[5],
				}));

				const isAscending =
					candles.length > 1 && candles[0].timestamp < candles[1].timestamp;

				if (!isAscending) {
					candles.reverse();
				}

				allCandles = allCandles.concat(candles);

				const newestCandle = candles[candles.length - 1];
				if (newestCandle.timestamp >= now || candles.length < limit) {
					break;
				}
				currentStartTime = newestCandle.timestamp + 1;

				if (allCandles.length > 100000) break;
			} catch (error) {
				console.error("KuCoin API Error:", error);
				throw error;
			}
		}

		return this.filterByTime(allCandles, startTime);
	}

	private mapInterval(interval: string): number {
		const unit = interval.slice(-1);
		const value = parseInt(interval.slice(0, -1), 10);

		if (unit === "m") return value;
		if (unit === "h") return value * 60;
		if (unit === "d") return value * 60 * 24;
		if (unit === "w") return value * 60 * 24 * 7;
		throw new Error(`Unsupported interval for KuCoin: ${interval}`);
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
