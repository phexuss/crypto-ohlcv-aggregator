import { Value } from "@sinclair/typebox/value";
import { t } from "elysia";

const envSchema = t.Object(
	{
		PORT: t.Optional(t.String({ default: "3000" })),
		NODE_ENV: t.Optional(
			t.Union(
				[t.Literal("development"), t.Literal("production"), t.Literal("test")],
				{
					default: "development",
				},
			),
		),

		API_URL_BINANCE: t.String({ format: "uri" }),
		API_URL_OKX: t.String({ format: "uri" }),
		API_URL_BYBIT: t.String({ format: "uri" }),
		API_URL_BITGET: t.String({ format: "uri" }),
		API_URL_KUCOIN: t.String({ format: "uri" }),
		API_URL_MEXC: t.String({ format: "uri" }),
		API_URL_GATEIO: t.String({ format: "uri" }),
		API_URL_BITMEX: t.String({ format: "uri" }),
		API_URL_HTX: t.String({ format: "uri" }),
		API_URL_HYPERLIQUID: t.String({ format: "uri" }),
		API_URL_XT: t.String({ format: "uri" }),
		API_URL_BINGX: t.String({ format: "uri" }),
		API_URL_COINEX: t.String({ format: "uri" }),
		API_URL_BITMART: t.String({ format: "uri" }),
		API_URL_BLOFIN: t.String({ format: "uri" }),

		BINANCE_API_KEY: t.Optional(t.String()),
		BINANCE_API_SECRET: t.Optional(t.String()),
		OKX_API_KEY: t.Optional(t.String()),
		OKX_API_SECRET: t.Optional(t.String()),
		OKX_PASSPHRASE: t.Optional(t.String()),
		BYBIT_API_KEY: t.Optional(t.String()),
		BYBIT_API_SECRET: t.Optional(t.String()),
		KUCOIN_API_KEY: t.Optional(t.String()),
		KUCOIN_API_SECRET: t.Optional(t.String()),
		KUCOIN_PASSPHRASE: t.Optional(t.String()),
		BITGET_API_KEY: t.Optional(t.String()),
		BITGET_API_SECRET: t.Optional(t.String()),
		BITGET_PASSPHRASE: t.Optional(t.String()),
		MEXC_API_KEY: t.Optional(t.String()),
		MEXC_API_SECRET: t.Optional(t.String()),
		GATEIO_API_KEY: t.Optional(t.String()),
		GATEIO_API_SECRET: t.Optional(t.String()),
		BITMEX_API_KEY: t.Optional(t.String()),
		BITMEX_API_SECRET: t.Optional(t.String()),
		HTX_API_KEY: t.Optional(t.String()),
		HTX_API_SECRET: t.Optional(t.String()),
		HYPERLIQUID_API_KEY: t.Optional(t.String()),
		HYPERLIQUID_API_SECRET: t.Optional(t.String()),
		XT_API_KEY: t.Optional(t.String()),
		XT_API_SECRET: t.Optional(t.String()),
		BINGX_API_KEY: t.Optional(t.String()),
		BINGX_API_SECRET: t.Optional(t.String()),
		COINEX_API_KEY: t.Optional(t.String()),
		COINEX_API_SECRET: t.Optional(t.String()),
		BITMART_API_KEY: t.Optional(t.String()),
		BITMART_API_SECRET: t.Optional(t.String()),
		BLOFIN_API_KEY: t.Optional(t.String()),
		BLOFIN_API_SECRET: t.Optional(t.String()),
	},
	{ additionalProperties: true },
);

const isValid = Value.Check(envSchema, Bun.env);

if (!isValid) {
	const errors = [...Value.Errors(envSchema, Bun.env)];
	console.error("❌ Config validation error(s):");
	for (const error of errors) {
		console.error(` - ${error.path}: ${error.message}`);
	}
	process.exit(1);
}

const envVars = Bun.env as Record<string, string>;

export const config = {
	port: parseInt(envVars.PORT || "3000", 10),
	env: envVars.NODE_ENV || "development",
	exchanges: {
		binance: {
			url: envVars.API_URL_BINANCE,
			apiKey: envVars.BINANCE_API_KEY,
			apiSecret: envVars.BINANCE_API_SECRET,
		},
		okx: {
			url: envVars.API_URL_OKX,
			apiKey: envVars.OKX_API_KEY,
			apiSecret: envVars.OKX_API_SECRET,
			passphrase: envVars.OKX_PASSPHRASE,
		},
		bybit: {
			url: envVars.API_URL_BYBIT,
			apiKey: envVars.BYBIT_API_KEY,
			apiSecret: envVars.BYBIT_API_SECRET,
		},
		bitget: {
			url: envVars.API_URL_BITGET,
			apiKey: envVars.BITGET_API_KEY,
			apiSecret: envVars.BITGET_API_SECRET,
			passphrase: envVars.BITGET_PASSPHRASE,
		},
		kucoin: {
			url: envVars.API_URL_KUCOIN,
			apiKey: envVars.KUCOIN_API_KEY,
			apiSecret: envVars.KUCOIN_API_SECRET,
			passphrase: envVars.KUCOIN_PASSPHRASE,
		},
		mexc: {
			url: envVars.API_URL_MEXC,
			apiKey: envVars.MEXC_API_KEY,
			apiSecret: envVars.MEXC_API_SECRET,
		},
		gateio: {
			url: envVars.API_URL_GATEIO,
			apiKey: envVars.GATEIO_API_KEY,
			apiSecret: envVars.GATEIO_API_SECRET,
		},
		bitmex: {
			url: envVars.API_URL_BITMEX,
			apiKey: envVars.BITMEX_API_KEY,
			apiSecret: envVars.BITMEX_API_SECRET,
		},
		htx: {
			url: envVars.API_URL_HTX,
			apiKey: envVars.HTX_API_KEY,
			apiSecret: envVars.HTX_API_SECRET,
		},
		hyperliquid: {
			url: envVars.API_URL_HYPERLIQUID,
			apiKey: envVars.HYPERLIQUID_API_KEY,
			apiSecret: envVars.HYPERLIQUID_API_SECRET,
		},
		xt: {
			url: envVars.API_URL_XT,
			apiKey: envVars.XT_API_KEY,
			apiSecret: envVars.XT_API_SECRET,
		},
		bingx: {
			url: envVars.API_URL_BINGX,
			apiKey: envVars.BINGX_API_KEY,
			apiSecret: envVars.BINGX_API_SECRET,
		},
		coinex: {
			url: envVars.API_URL_COINEX,
			apiKey: envVars.COINEX_API_KEY,
			apiSecret: envVars.COINEX_API_SECRET,
		},
		bitmart: {
			url: envVars.API_URL_BITMART,
			apiKey: envVars.BITMART_API_KEY,
			apiSecret: envVars.BITMART_API_SECRET,
		},
		blofin: {
			url: envVars.API_URL_BLOFIN,
			apiKey: envVars.BLOFIN_API_KEY,
			apiSecret: envVars.BLOFIN_API_SECRET,
		},
	},
};
