import type { IOhlcvData } from "../types";

export abstract class BaseExchangeApi {
	protected baseUrl: string;
	protected apiKey?: string;
	protected apiSecret?: string;
	protected passphrase?: string;

	constructor(
		baseUrl: string,
		apiKey?: string,
		apiSecret?: string,
		passphrase?: string,
	) {
		this.baseUrl = baseUrl;
		this.apiKey = apiKey;
		this.apiSecret = apiSecret;
		this.passphrase = passphrase;
	}

	protected async fetchWithRetry<T>(url: string): Promise<T> {
		try {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			return await response.json();
		} catch (error) {
			const err = error as Error;
			console.error(`API Request Failed for ${url}:`, err.message);
			throw error;
		}
	}

	protected parseCandle(data: string[] | number[]): IOhlcvData {
		return {
			timestamp: typeof data[0] === "string" ? parseInt(data[0]) : data[0],
			open: parseFloat(String(data[1])),
			high: parseFloat(String(data[2])),
			low: parseFloat(String(data[3])),
			close: parseFloat(String(data[4])),
			volume: parseFloat(String(data[5])),
		};
	}

	protected filterByTime(
		candles: IOhlcvData[],
		startTime: number,
		endTime?: number,
	): IOhlcvData[] {
		return candles.filter((c) => {
			const afterStart = c.timestamp >= startTime;
			const beforeEnd = endTime ? c.timestamp < endTime : true;
			return afterStart && beforeEnd;
		});
	}

	protected sortByTimestamp(candles: IOhlcvData[]): IOhlcvData[] {
		return candles.sort((a, b) => a.timestamp - b.timestamp);
	}
}
