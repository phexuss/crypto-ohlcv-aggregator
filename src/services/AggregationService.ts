import type { IExchangeApi, IOhlcvData } from "../types";

export class AggregationService {
	constructor(private adapters: Record<string, IExchangeApi>) {}

	async aggregate(
		exchanges: string[],
		market: string,
		interval: string,
		startTime: number,
	): Promise<
		Record<
			string,
			{ success: true; data: IOhlcvData[] } | { success: false; error: string }
		>
	> {
		const results = await Promise.allSettled(
			exchanges.map(async (exchange) => {
				const adapter = this.adapters[exchange];
				if (!adapter) {
					throw new Error(`Unknown exchange: ${exchange}`);
				}
				const data = await adapter.getHistoricalData(
					market,
					interval,
					startTime,
				);
				return { exchange, data };
			}),
		);

		const response: Record<
			string,
			{ success: true; data: IOhlcvData[] } | { success: false; error: string }
		> = {};

		for (const result of results) {
			if (result.status === "fulfilled") {
				response[result.value.exchange] = {
					success: true,
					data: result.value.data,
				};
			} else {
				const exchange = exchanges[results.indexOf(result)];
				response[exchange] = {
					success: false,
					error: result.reason.message,
				};
			}
		}

		return response;
	}
}
