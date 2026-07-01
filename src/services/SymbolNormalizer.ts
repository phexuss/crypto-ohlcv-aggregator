export class SymbolNormalizer {
	private static mappings: Record<string, (market: string) => string> = {
		binance: (market) => market,
		okx: (market) => {
			const [base, quote] = SymbolNormalizer.splitMarket(market);
			return `${base}-${quote}-SWAP`;
		},
		bybit: (market) => market,
		bitget: (market) => market,
		kucoin: (market) => {
			if (market === "BTCUSDT") return "XBTUSDTM";
			return `${market}M`;
		},
		mexc: (market) => {
			const [base, quote] = SymbolNormalizer.splitMarket(market);
			return `${base}_${quote}`;
		},
		gateio: (market) => {
			const [base, quote] = SymbolNormalizer.splitMarket(market);
			return `${base}_${quote}`;
		},
		bitmex: (market) => {
			if (market === "BTCUSDT") return "XBTUSD";
			return market;
		},
		htx: (market) => {
			const [base] = SymbolNormalizer.splitMarket(market);
			return `${base}-USD`;
		},
		hyperliquid: (market) => {
			const [base] = SymbolNormalizer.splitMarket(market);
			return base;
		},
		xt: (market) => {
			const [base, quote] = SymbolNormalizer.splitMarket(market);
			return `${base.toLowerCase()}_${quote.toLowerCase()}`;
		},
		bingx: (market) => {
			const [base, quote] = SymbolNormalizer.splitMarket(market);
			return `${base}-${quote}`;
		},
		coinex: (market) => market,
		bitmart: (market) => market,
		blofin: (market) => {
			const [base, quote] = SymbolNormalizer.splitMarket(market);
			return `${base}-${quote}`;
		},
	};

	static normalize(exchange: string, market: string): string {
		const normalizer = SymbolNormalizer.mappings[exchange.toLowerCase()];
		if (!normalizer) {
			throw new Error(`No symbol normalizer for exchange: ${exchange}`);
		}
		return normalizer(market);
	}

	private static splitMarket(market: string): [string, string] {
		if (market.endsWith("USDT")) {
			return [market.replace("USDT", "").replace(/[-_]$/, ""), "USDT"];
		}
		if (market.endsWith("USD")) {
			return [market.replace("USD", "").replace(/[-_]$/, ""), "USD"];
		}
		return [market, ""];
	}
}
