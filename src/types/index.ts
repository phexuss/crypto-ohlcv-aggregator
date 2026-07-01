export interface IOhlcvData {
	timestamp: number;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
}

export interface IExchangeApi {
	getHistoricalData(
		symbol: string,
		interval: string,
		startTime: number,
	): Promise<IOhlcvData[]>;
}

export interface IAggregatedDataPoint {
	timestamp: number;
	[exchange: string]: Omit<IOhlcvData, "timestamp"> | number;
}

export interface IExchangeConfig {
	url: string;
	apiKey?: string;
	apiSecret?: string;
	passphrase?: string;
}

export type BinanceKlineResponse = [
	number,
	string,
	string,
	string,
	string,
	string,
	number,
	string,
	number,
	string,
	string,
	string,
];

export type OkxCandleResponse = [
	string,
	string,
	string,
	string,
	string,
	string,
	string,
	string,
	string,
];

export type BybitKlineResponse = [
	string,
	string,
	string,
	string,
	string,
	string,
	string,
];
