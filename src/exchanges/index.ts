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
		super(
			config.exchanges.mexc.url,
			config.exchanges.mexc.apiKey,
			config.exchanges.mexc.apiSecret,
		);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		const symbol = SymbolNormalizer.normalize("mexc", market);
		const limit = 1000;

		try {
			const url = new URL(
				`${this.baseUrl}/api/v1/contract/kline/${symbol}`,
			);
			url.searchParams.set("interval", this.mapInterval(interval));
			url.searchParams.set("limit", limit.toString());

			const response = await this.fetchWithRetry<{
				success: boolean;
				data: {
					time: number[];
					open: string[];
					high: string[];
					low: string[];
					close: string[];
					vol: string[];
				};
			}>(url.toString());

			if (!response || !response.success || !response.data) {
				return [];
			}

			const data = response.data;
			const candles: IOhlcvData[] = [];

			for (let i = 0; i < data.time.length; i++) {
				const timestamp = data.time[i] * 1000;
				if (timestamp >= startTime) {
					candles.push({
						timestamp,
						open: parseFloat(data.open[i]),
						high: parseFloat(data.high[i]),
						low: parseFloat(data.low[i]),
						close: parseFloat(data.close[i]),
						volume: parseFloat(data.vol[i]),
					});
				}
			}

			return this.sortByTimestamp(candles);
		} catch (error) {
			console.error("MEXC API Error:", error);
			return [];
		}
	}

	private mapInterval(interval: string): string {
		const unit = interval.slice(-1);
		const value = interval.slice(0, -1);

		if (unit === "m") return `Min${value}`;
		if (unit === "h") {
			if (value === "1") return "Min60";
			if (value === "4") return "Hour4";
		}
		if (unit === "d") return "Day1";
		if (unit === "w") return "Week1";
		if (unit === "M") return "Month1";

		throw new Error(`Unsupported interval for MEXC: ${interval}`);
	}
}

export class GateioApi extends BaseExchangeApi implements IExchangeApi {
	constructor() {
		super(
			config.exchanges.gateio.url,
			config.exchanges.gateio.apiKey,
			config.exchanges.gateio.apiSecret,
		);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		const symbol = SymbolNormalizer.normalize("gateio", market);
		const limit = 2000;
		let allCandles: IOhlcvData[] = [];
		let currentFrom = Math.floor(startTime / 1000);
		const now = Math.floor(Date.now() / 1000);

		while (currentFrom < now) {
			try {
				const url = new URL(
					`${this.baseUrl}/api/v4/futures/usdt/candlesticks`,
				);
				url.searchParams.set("contract", symbol);
				url.searchParams.set("from", currentFrom.toString());
				url.searchParams.set("interval", this.mapInterval(interval));
				url.searchParams.set("limit", limit.toString());

				const response = await this.fetchWithRetry<
					Array<{
						t: string;
						o: string;
						h: string;
						l: string;
						c: string;
						v: string;
					}>
				>(url.toString());

				if (!Array.isArray(response) || response.length === 0) {
					break;
				}

				const candles: IOhlcvData[] = response.map((c) => ({
					timestamp: parseInt(c.t, 10) * 1000,
					open: parseFloat(c.o),
					high: parseFloat(c.h),
					low: parseFloat(c.l),
					close: parseFloat(c.c),
					volume: parseFloat(c.v),
				}));

				candles.sort((a, b) => a.timestamp - b.timestamp);
				allCandles = allCandles.concat(candles);

				const newestCandle = candles[candles.length - 1];
				if (newestCandle.timestamp >= now * 1000 || candles.length < limit) {
					break;
				}
				currentFrom = Math.floor(newestCandle.timestamp / 1000) + 1;

				if (allCandles.length > 100000) break;
			} catch (error) {
				console.error("Gate.IO API Error:", error);
				throw error;
			}
		}

		return this.filterByTime(allCandles, startTime);
	}

	private mapInterval(interval: string): string {
		const unit = interval.slice(-1);
		const value = interval.slice(0, -1);

		if (unit === "m") return `${value}m`;
		if (unit === "h") return `${value}h`;
		if (unit === "d") return `${value}d`;
		if (unit === "w") return "7d";

		return interval;
	}
}

export class BitmexApi extends BaseExchangeApi implements IExchangeApi {
	constructor() {
		super(
			config.exchanges.bitmex.url,
			config.exchanges.bitmex.apiKey,
			config.exchanges.bitmex.apiSecret,
		);
	}

	async getHistoricalData(
		market: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]> {
		const symbol = SymbolNormalizer.normalize("bitmex", market);
		const limit = 1000;
		let allCandles: IOhlcvData[] = [];
		let currentStartTime = new Date(startTime).toISOString();
		const now = new Date().toISOString();

		while (new Date(currentStartTime).getTime() < Date.now()) {
			try {
				const url = new URL(`${this.baseUrl}/api/v1/trade/bucketed`);
				url.searchParams.set("symbol", symbol);
				url.searchParams.set("binSize", interval);
				url.searchParams.set("count", limit.toString());
				url.searchParams.set("startTime", currentStartTime);
				url.searchParams.set("endTime", now);
				url.searchParams.set("reverse", "false");

				const response = await this.fetchWithRetry<
					Array<{
						timestamp: string;
						open: number;
						high: number;
						low: number;
						close: number;
						volume: number;
					}>
				>(url.toString());

				if (!Array.isArray(response) || response.length === 0) {
					break;
				}

				const candles: IOhlcvData[] = response.map((c) => ({
					timestamp: new Date(c.timestamp).getTime(),
					open: parseFloat(String(c.open)),
					high: parseFloat(String(c.high)),
					low: parseFloat(String(c.low)),
					close: parseFloat(String(c.close)),
					volume: parseFloat(String(c.volume)),
				}));

				candles.sort((a, b) => a.timestamp - b.timestamp);
				allCandles = allCandles.concat(candles);

				const newestCandle = candles[candles.length - 1];
				if (newestCandle.timestamp >= Date.now() || candles.length < limit) {
					break;
				}
				currentStartTime = new Date(newestCandle.timestamp + 1).toISOString();

				if (allCandles.length > 100000) break;
			} catch (error) {
				console.error("BitMEX API Error:", error);
				throw error;
			}
		}

		return this.filterByTime(allCandles, startTime);
	}
}

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
