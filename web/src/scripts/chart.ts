/**
 * Chart Manager — handles TradingView Lightweight Charts rendering
 * Supports Grid mode (separate chart per exchange) and Overlay mode (all on one chart)
 */

declare const LightweightCharts: any;

// Unique colors for each exchange
const EXCHANGE_COLORS: Record<string, { up: string; down: string; line: string }> = {
	binance: { up: "#F0B90B", down: "#B8860B", line: "#F0B90B" },
	okx: { up: "#00C076", down: "#008F57", line: "#00C076" },
	bybit: { up: "#F7A600", down: "#C68500", line: "#F7A600" },
	kucoin: { up: "#23AF91", down: "#1A8A72", line: "#23AF91" },
	bitget: { up: "#00C8A0", down: "#009E7E", line: "#00C8A0" },
	mexc: { up: "#2354E6", down: "#1A3FB8", line: "#2354E6" },
	gateio: { up: "#17E6A1", down: "#12B880", line: "#17E6A1" },
	bitmex: { up: "#FF0000", down: "#CC0000", line: "#FF4444" },
	htx: { up: "#2DAF7D", down: "#228B63", line: "#2DAF7D" },
	hyperliquid: { up: "#84E4A8", down: "#5CB878", line: "#84E4A8" },
	xt: { up: "#3B82F6", down: "#2563EB", line: "#3B82F6" },
	bingx: { up: "#2B6AFF", down: "#1E4FCC", line: "#2B6AFF" },
	coinex: { up: "#47B5FF", down: "#2D93DB", line: "#47B5FF" },
	bitmart: { up: "#00BCD4", down: "#008A9E", line: "#00BCD4" },
	blofin: { up: "#A855F7", down: "#8B3FD4", line: "#A855F7" },
};

const DEFAULT_COLORS = { up: "#8b5cf6", down: "#6366f1", line: "#8b5cf6" };

interface OhlcvCandle {
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
}

interface AggregatedDataPoint {
	timestamp: number;
	[exchange: string]: OhlcvCandle | number;
}

const CHART_OPTIONS_BASE = {
	layout: {
		background: { type: "solid" as const, color: "transparent" },
		textColor: "#9ca3af",
		fontFamily: "'Inter', sans-serif",
		fontSize: 11,
	},
	grid: {
		vertLines: { color: "rgba(255, 255, 255, 0.04)" },
		horzLines: { color: "rgba(255, 255, 255, 0.04)" },
	},
	crosshair: {
		mode: 0,
		vertLine: {
			color: "rgba(139, 92, 246, 0.3)",
			width: 1,
			style: 2,
			labelBackgroundColor: "#8b5cf6",
		},
		horzLine: {
			color: "rgba(139, 92, 246, 0.3)",
			width: 1,
			style: 2,
			labelBackgroundColor: "#8b5cf6",
		},
	},
	rightPriceScale: {
		borderColor: "rgba(255, 255, 255, 0.06)",
		scaleMargins: { top: 0.1, bottom: 0.2 },
	},
	timeScale: {
		borderColor: "rgba(255, 255, 255, 0.06)",
		timeVisible: true,
		secondsVisible: false,
	},
	handleScroll: { vertTouchDrag: false },
};

export class ChartManager {
	private charts: any[] = [];
	private resizeObserver: ResizeObserver | null = null;

	destroy() {
		this.charts.forEach((c) => c.remove());
		this.charts = [];
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
	}

	renderGrid(data: AggregatedDataPoint[], exchanges: string[]) {
		this.destroy();

		const container = document.getElementById("charts-grid");
		if (!container) return;
		container.innerHTML = "";

		exchanges.forEach((exchange) => {
			const candles = this.extractCandleData(data, exchange);
			if (candles.length === 0) return;

			const lastCandle = candles[candles.length - 1];
			const colors = EXCHANGE_COLORS[exchange] || DEFAULT_COLORS;

			// Card
			const card = document.createElement("div");
			card.className = "chart-card animate-fade-in";

			// Header
			const header = document.createElement("div");
			header.className = "chart-card-header";

			const nameEl = document.createElement("span");
			nameEl.className = "chart-card-name";
			const dot = document.createElement("span");
			dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:${colors.line}`;
			nameEl.appendChild(dot);
			nameEl.appendChild(document.createTextNode(this.capitalize(exchange)));

			const priceEl = document.createElement("span");
			priceEl.className = "chart-card-price";
			const priceChange = lastCandle.close >= lastCandle.open;
			priceEl.style.color = priceChange ? "#10b981" : "#ef4444";
			priceEl.textContent = `$${this.formatNumber(lastCandle.close)}`;

			header.appendChild(nameEl);
			header.appendChild(priceEl);

			// Body
			const body = document.createElement("div");
			body.className = "chart-card-body";

			card.appendChild(header);
			card.appendChild(body);
			container.appendChild(card);

			// Create chart
			const chart = LightweightCharts.createChart(body, {
				...CHART_OPTIONS_BASE,
				width: body.clientWidth,
				height: body.clientHeight || 250,
				autoSize: true,
			});

			const candleSeries = chart.addCandlestickSeries({
				upColor: colors.up,
				downColor: colors.down,
				borderUpColor: colors.up,
				borderDownColor: colors.down,
				wickUpColor: colors.up,
				wickDownColor: colors.down,
			});

			candleSeries.setData(candles);

			// Volume
			const volumeSeries = chart.addHistogramSeries({
				priceFormat: { type: "volume" },
				priceScaleId: "volume",
			});

			chart.priceScale("volume").applyOptions({
				scaleMargins: { top: 0.8, bottom: 0 },
			});

			volumeSeries.setData(
				candles.map((c: any) => ({
					time: c.time,
					value: c.volume,
					color: c.close >= c.open
						? "rgba(16, 185, 129, 0.2)"
						: "rgba(239, 68, 68, 0.2)",
				})),
			);

			chart.timeScale().fitContent();
			this.charts.push(chart);
		});
	}

	renderOverlay(data: AggregatedDataPoint[], exchanges: string[]) {
		this.destroy();

		const container = document.getElementById("chart-overlay");
		if (!container) return;
		container.innerHTML = "";

		// Legend
		const legend = document.createElement("div");
		legend.className = "overlay-legend";

		exchanges.forEach((exchange) => {
			const colors = EXCHANGE_COLORS[exchange] || DEFAULT_COLORS;
			const item = document.createElement("div");
			item.className = "legend-item";

			const dot = document.createElement("span");
			dot.className = "legend-dot";
			dot.style.background = colors.line;

			item.appendChild(dot);
			item.appendChild(document.createTextNode(this.capitalize(exchange)));
			legend.appendChild(item);
		});

		container.appendChild(legend);

		// Chart wrapper
		const wrapper = document.createElement("div");
		wrapper.className = "overlay-chart-wrapper";
		container.appendChild(wrapper);

		const chart = LightweightCharts.createChart(wrapper, {
			...CHART_OPTIONS_BASE,
			width: wrapper.clientWidth,
			height: wrapper.clientHeight || 400,
			autoSize: true,
		});

		// Add line series for each exchange (close prices)
		exchanges.forEach((exchange) => {
			const candles = this.extractCandleData(data, exchange);
			if (candles.length === 0) return;

			const colors = EXCHANGE_COLORS[exchange] || DEFAULT_COLORS;

			const series = chart.addLineSeries({
				color: colors.line,
				lineWidth: 2,
				priceLineVisible: false,
				lastValueVisible: true,
				title: this.capitalize(exchange),
			});

			series.setData(
				candles.map((c: any) => ({
					time: c.time,
					value: c.close,
				})),
			);
		});

		chart.timeScale().fitContent();
		this.charts.push(chart);
	}

	private extractCandleData(data: AggregatedDataPoint[], exchange: string) {
		return data
			.filter((point) => point[exchange] && typeof point[exchange] !== "number")
			.map((point) => {
				const candle = point[exchange] as OhlcvCandle;
				return {
					time: Math.floor(point.timestamp / 1000) as any,
					open: candle.open,
					high: candle.high,
					low: candle.low,
					close: candle.close,
					volume: candle.volume,
				};
			})
			.sort((a: any, b: any) => a.time - b.time);
	}

	private capitalize(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	private formatNumber(num: number): string {
		if (num >= 1000) {
			return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
		}
		return num.toFixed(num < 1 ? 6 : 4);
	}
}
