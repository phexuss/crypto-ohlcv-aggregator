export interface IExchangeAdapter {
	fetchOhlcv(
		market: string,
		interval: string,
		startTime: number,
	): Promise<any[]>;
}

export class AggregationService {
	constructor(private adapters: Record<string, IExchangeAdapter>) {}

	async aggregate(
		exchanges: string[],
		market: string,
		interval: string,
		startTime: number,
	): Promise<Record<string, any>> {
		const results = await Promise.allSettled(
			exchanges.map(async (exchange) => {
				const adapter = this.adapters[exchange];
				if (!adapter) {
					throw new Error(`Unknown exchange: ${exchange}`);
				}
				const data = await adapter.fetchOhlcv(market, interval, startTime);
				return { exchange, data };
			}),
		);

		const response: Record<string, any> = {};

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
