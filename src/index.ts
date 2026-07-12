import { Elysia } from "elysia";
import logger from "logixlysia";
import { consola } from "consola";
import { config } from "./config";
import { createOhlcvPlugin } from "./routes/ohlcv";
import {
	BinanceApi,
	OkxApi,
	BybitApi,
	KuCoinApi,
	BitgetApi,
	MexcApi,
	GateioApi,
	BitmexApi,
	HtxApi,
	HyperliquidApi,
	XtApi,
	BingxApi,
	CoinexApi,
	BitmartApi,
	BlofinApi,
} from "./exchanges";

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
	.use(createOhlcvPlugin(adapters))
	.listen(config.port);

consola.ready({
	message: `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
	badge: true,
});
