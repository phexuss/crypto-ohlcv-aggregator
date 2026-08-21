/**
 * Main App Controller — orchestrates UI state, API calls, and rendering
 */
import { ChartManager } from "./chart";
import { TableManager } from "./table";

interface AggregatedDataPoint {
	timestamp: number;
	[exchange: string]: any;
}

class CryptoAggregatorApp {
	private chartManager = new ChartManager();
	private tableManager = new TableManager();
	private currentData: AggregatedDataPoint[] = [];
	private currentExchanges: string[] = [];
	private viewMode: "grid" | "overlay" = "grid";

	constructor() {
		this.bindEvents();
	}

	private bindEvents() {
		// Fetch button
		const fetchBtn = document.getElementById("fetch-btn");
		fetchBtn?.addEventListener("click", () => this.fetchData());

		// View mode toggle
		window.addEventListener("viewModeChange", ((e: CustomEvent) => {
			this.viewMode = e.detail.mode;
			if (this.currentData.length > 0) {
				this.renderCharts();
			}
		}) as EventListener);

		// Keyboard shortcut: Enter to fetch
		document.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
				const active = document.activeElement;
				if (active?.tagName === "INPUT") {
					e.preventDefault();
					this.fetchData();
				}
			}
		});
	}

	private getFormValues() {
		// Exchanges
		const checkboxes = document.querySelectorAll<HTMLInputElement>(
			'input[name="exchange"]:checked',
		);
		const exchanges = Array.from(checkboxes).map((cb) => cb.value);

		// Market
		const marketInput = document.getElementById("market-input") as HTMLInputElement;
		const market = marketInput?.value.trim().toUpperCase() || "BTCUSDT";

		// Interval
		const activeInterval = document.querySelector<HTMLElement>(
			"#interval-group .toggle-btn.active",
		);
		const interval = activeInterval?.dataset.interval || "1h";

		// Period
		const activePeriod = document.querySelector<HTMLElement>(
			"#period-group .toggle-btn.active",
		);
		let period: string | number;

		if (activePeriod?.dataset.period === "custom") {
			const customInput = document.getElementById("custom-period-input") as HTMLInputElement;
			const customVal = customInput?.value.trim() || "24h";
			period = isNaN(Number(customVal)) ? customVal : Number(customVal);
		} else {
			period = activePeriod?.dataset.period || "24h";
		}

		return { exchanges, market, interval, period };
	}

	private async fetchData() {
		const { exchanges, market, interval, period } = this.getFormValues();

		if (exchanges.length === 0) {
			this.showToast("Please select at least one exchange", "error");
			return;
		}

		// Show loading
		this.setLoading(true, `Fetching ${market} ${interval} from ${exchanges.length} exchange(s)...`);

		try {
			const response = await fetch("/api/ohlcv", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ exchanges, market, interval, period }),
			});

			if (!response.ok) {
				const err = await response.json().catch(() => ({ error: "Unknown error" }));
				throw new Error(err.error || `HTTP ${response.status}`);
			}

			const data: AggregatedDataPoint[] = await response.json();

			if (!data || data.length === 0) {
				this.setLoading(false);
				this.showToast("No data returned from exchanges", "info");
				return;
			}

			this.currentData = data;
			this.currentExchanges = exchanges;

			// Update title
			const title = document.getElementById("chart-title");
			const subtitle = document.getElementById("chart-subtitle");
			if (title) title.textContent = `${market} — ${interval}`;
			if (subtitle) subtitle.textContent = `${exchanges.length} exchanges · ${data.length} candles`;

			// Render
			this.setLoading(false);
			this.renderCharts();
			this.tableManager.render(data, exchanges);
			this.updateStats(data, exchanges);

			this.showToast(`Loaded ${data.length} data points from ${exchanges.length} exchanges`, "success");
		} catch (err) {
			this.setLoading(false);
			this.showToast((err as Error).message, "error");
			console.error("Fetch error:", err);
		}
	}

	private renderCharts() {
		const emptyState = document.getElementById("empty-state");
		const chartsGrid = document.getElementById("charts-grid");
		const chartOverlay = document.getElementById("chart-overlay");

		emptyState?.classList.add("hidden");

		if (this.viewMode === "grid") {
			chartsGrid?.classList.remove("hidden");
			chartOverlay?.classList.add("hidden");
			this.chartManager.renderGrid(this.currentData, this.currentExchanges);
		} else {
			chartsGrid?.classList.add("hidden");
			chartOverlay?.classList.remove("hidden");
			this.chartManager.renderOverlay(this.currentData, this.currentExchanges);
		}
	}

	private setLoading(loading: boolean, text?: string) {
		const fetchBtn = document.getElementById("fetch-btn");
		const fetchText = fetchBtn?.querySelector(".fetch-text");
		const emptyState = document.getElementById("empty-state");
		const loadingState = document.getElementById("loading-state");
		const loadingSub = document.getElementById("loading-sub");
		const chartsGrid = document.getElementById("charts-grid");
		const chartOverlay = document.getElementById("chart-overlay");

		if (loading) {
			fetchBtn?.classList.add("loading");
			(fetchBtn as HTMLButtonElement).disabled = true;
			if (fetchText) fetchText.textContent = "Loading...";

			emptyState?.classList.add("hidden");
			chartsGrid?.classList.add("hidden");
			chartOverlay?.classList.add("hidden");
			loadingState?.classList.remove("hidden");
			if (loadingSub && text) loadingSub.textContent = text;
		} else {
			fetchBtn?.classList.remove("loading");
			(fetchBtn as HTMLButtonElement).disabled = false;
			if (fetchText) fetchText.textContent = "Fetch Data";
			loadingState?.classList.add("hidden");
		}
	}

	private updateStats(data: AggregatedDataPoint[], exchanges: string[]) {
		const panel = document.getElementById("stats-panel");
		panel?.classList.remove("hidden");

		const statExchanges = document.getElementById("stat-exchanges");
		const statDatapoints = document.getElementById("stat-datapoints");
		const statTimerange = document.getElementById("stat-timerange");

		if (statExchanges) statExchanges.textContent = String(exchanges.length);
		if (statDatapoints) statDatapoints.textContent = String(data.length);

		if (statTimerange && data.length > 0) {
			const first = new Date(data[0].timestamp);
			const last = new Date(data[data.length - 1].timestamp);
			const diffMs = last.getTime() - first.getTime();
			const diffHours = Math.round(diffMs / (1000 * 60 * 60));

			if (diffHours >= 24) {
				statTimerange.textContent = `${Math.round(diffHours / 24)}d`;
			} else {
				statTimerange.textContent = `${diffHours}h`;
			}
		}
	}

	private showToast(message: string, type: "success" | "error" | "info" = "info") {
		let container = document.querySelector(".toast-container");
		if (!container) {
			container = document.createElement("div");
			container.className = "toast-container";
			document.body.appendChild(container);
		}

		const toast = document.createElement("div");
		toast.className = `toast toast-${type}`;
		toast.textContent = message;
		container.appendChild(toast);

		setTimeout(() => {
			toast.style.opacity = "0";
			toast.style.transform = "translateX(20px)";
			toast.style.transition = "all 0.3s ease-out";
			setTimeout(() => toast.remove(), 300);
		}, 4000);
	}
}

// Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
	new CryptoAggregatorApp();
});
