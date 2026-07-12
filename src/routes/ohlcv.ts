import { Elysia } from "elysia";
import { consola } from "consola";
import { AggregationService } from "../services/AggregationService";
import { timeToMs } from "../utils/time";
import { ErrorResponseSchema, OhlcvRequestSchema } from "../schemas/ohlcv";
import type { IExchangeApi } from "../types";

export const createOhlcvPlugin = (adapters: Record<string, IExchangeApi>) => {
	const aggregationService = new AggregationService(adapters);

	return new Elysia({ prefix: "/api" })
		.post(
			"/ohlcv",
			async ({ body, set }) => {
				try {
					let exchanges: string[];

					if (body.exchanges.length === 1 && body.exchanges[0] === "all") {
						exchanges = [
							"binance",
							"okx",
							"bybit",
							"kucoin",
							"bitget",
							"mexc",
							"gateio",
							"bitmex",
							"htx",
							"hyperliquid",
							"xt",
							"bingx",
							"coinex",
							"bitmart",
							"blofin",
						];
					} else {
						exchanges = body.exchanges.map((e) => e.trim().toLowerCase());
					}

					let startTime: number;

					if (
						typeof body.period === "string" &&
						Number.isNaN(Number(body.period))
					) {
						try {
							const durationMs = timeToMs(body.period);
							startTime = Date.now() - durationMs;
						} catch (err) {
							set.status = 400;
							return {
								error:
									'Invalid period format. Use duration (e.g. "24h") or timestamp.',
							};
						}
					} else {
						startTime = Number(body.period);
					}

					if (Number.isNaN(startTime)) {
						set.status = 400;
						return {
							error:
								'Invalid period format. Use duration (e.g. "24h") or timestamp.',
						};
					}

					const data = await aggregationService.aggregate(
						exchanges,
						body.market,
						body.interval,
						startTime,
					);

					return data;
				} catch (err) {
					const error = err as Error;
					consola.error("Error in getOhlcv:", {
						message: error.message,
						stack: error.stack,
						exchanges: body.exchanges,
						market: body.market,
					});
					set.status = 500;
					return {
						error: "Failed to fetch data from exchanges",
						message:
							process.env.NODE_ENV === "development"
								? error.message
								: undefined,
					};
				}
			},
			{
				body: OhlcvRequestSchema,
				response: {
					400: ErrorResponseSchema,
					500: ErrorResponseSchema,
				},
			},
		)
		.get("/health", () => ({ status: "ok" }));
};
