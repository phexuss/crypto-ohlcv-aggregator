import type { IAggregatedDataPoint, IExchangeApi, IOhlcvData } from "../types";
import { timeToMs } from "../utils/time";
import { DataFillingService } from "./DataFillingService";
import { consola } from "consola";

export class AggregationService {
	private adapters: Record<string, IExchangeApi> = {};

	constructor(adapters: Record<string, IExchangeApi>) {
		this.adapters = adapters;
	}

	async aggregate(
		exchanges: string[],
		market: string,
		interval: string,
		startTime: number,
	): Promise<IAggregatedDataPoint[]> {
		const intervalMs = timeToMs(interval);

		const validExchanges = exchanges.filter((ex) => this.adapters[ex]);

		const results = await Promise.allSettled(
			validExchanges.map(async (exchange) => {
				try {
					const adapter = this.adapters[exchange];
					const rawData = await adapter.getHistoricalData(
						market,
						interval,
						startTime,
					);
					const filledData = DataFillingService.fillGaps(rawData, intervalMs);
					return { exchange, data: filledData };
				} catch (error) {
					consola.error(`Error fetching data from ${exchange}:`, error);
					return { exchange, data: [] as IOhlcvData[] };
				}
			}),
		);

		const exchangeDataMap: Record<string, IOhlcvData[]> = {};

		for (const result of results) {
			if (result.status === "fulfilled") {
				const { exchange, data } = result.value;
				exchangeDataMap[exchange] = data;
			}
		}

		const timestampSet = new Set<number>();
		for (const data of Object.values(exchangeDataMap)) {
			for (const candle of data) {
				timestampSet.add(candle.timestamp);
			}
		}

		const sortedTimestamps = Array.from(timestampSet).sort((a, b) => a - b);

		return sortedTimestamps.map((timestamp) => {
			const point: IAggregatedDataPoint = { timestamp };
			for (const exchange of validExchanges) {
				const candle = exchangeDataMap[exchange]?.find(
					(c) => c.timestamp === timestamp,
				);
				if (candle) {
					const { timestamp: _, ...ohlcvData } = candle;
					point[exchange] = ohlcvData;
				}
			}
			return point;
		});
	}
}
