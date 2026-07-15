import { swagger } from "@elysiajs/swagger";
import { consola } from "consola";
import { Elysia } from "elysia";
import logger from "logixlysia";
import { config } from "./config";
import {
	BinanceApi,
	BingxApi,
	BitgetApi,
	BitmartApi,
	BitmexApi,
	BlofinApi,
	BybitApi,
	CoinexApi,
	GateioApi,
	HtxApi,
	HyperliquidApi,
	KuCoinApi,
	MexcApi,
	OkxApi,
	XtApi,
} from "./exchanges";
import { createOhlcvPlugin } from "./routes/ohlcv";

const adapters = {
	binance: new BinanceApi(),
	okx: new OkxApi(),
	bybit: new BybitApi(),
	kucoin: new KuCoinApi(),
	bitget: new BitgetApi(),
	mexc: new MexcApi(),
	gateio: new GateioApi(),
	bitmex: new BitmexApi(),
	htx: new HtxApi(),
	hyperliquid: new HyperliquidApi(),
	xt: new XtApi(),
	bingx: new BingxApi(),
	coinex: new CoinexApi(),
	bitmart: new BitmartApi(),
	blofin: new BlofinApi(),
};

const app = new Elysia()
	.use(logger())
	.use(
		swagger({
			documentation: {
				info: {
					title: "Crypto OHLCV Aggregator API",
					version: "1.0.0",
				},
			},
		}),
	)
	.use(createOhlcvPlugin(adapters))
	.listen(config.port);

consola.ready({
	message: `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
	badge: true,
});
