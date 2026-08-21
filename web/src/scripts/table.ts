/**
 * Table Manager — renders aggregated OHLCV data in a sortable table
 */

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

export class TableManager {
	private sortColumn = "timestamp";
	private sortAsc = true;

	render(data: AggregatedDataPoint[], exchanges: string[]) {
		const wrapper = document.getElementById("data-table-wrapper");
		const head = document.getElementById("table-head");
		const body = document.getElementById("table-body");
		const count = document.getElementById("table-count");

		if (!wrapper || !head || !body) return;

		wrapper.classList.remove("hidden");
		if (count) count.textContent = `${data.length} rows`;

		// Build header
		head.innerHTML = "";
		const headerRow = document.createElement("tr");

		const cols = ["Timestamp"];
		exchanges.forEach((ex) => {
			cols.push(`${this.capitalize(ex)} Close`);
			cols.push(`${this.capitalize(ex)} Vol`);
		});

		cols.forEach((col, i) => {
			const th = document.createElement("th");
			th.textContent = col;
			th.dataset.col = String(i);
			th.addEventListener("click", () => this.sort(data, exchanges, i));
			if (i === 0) th.classList.add("sorted");
			headerRow.appendChild(th);
		});

		head.appendChild(headerRow);

		// Build body
		this.renderBody(data, exchanges, body);
	}

	private renderBody(data: AggregatedDataPoint[], exchanges: string[], body: HTMLElement) {
		body.innerHTML = "";

		// Find best/worst close for highlighting
		const lastRow = data[data.length - 1];
		let bestExchange = "";
		let worstExchange = "";

		if (lastRow && exchanges.length > 1) {
			let bestPrice = -Infinity;
			let worstPrice = Infinity;

			exchanges.forEach((ex) => {
				const candle = lastRow[ex] as OhlcvCandle | undefined;
				if (candle && typeof candle !== "number") {
					if (candle.close > bestPrice) { bestPrice = candle.close; bestExchange = ex; }
					if (candle.close < worstPrice) { worstPrice = candle.close; worstExchange = ex; }
				}
			});
		}

		// Limit rows to last 200 for performance
		const displayData = data.slice(-200);

		displayData.forEach((point) => {
			const tr = document.createElement("tr");

			// Timestamp
			const tdTime = document.createElement("td");
			tdTime.className = "cell-timestamp";
			tdTime.textContent = this.formatTimestamp(point.timestamp);
			tr.appendChild(tdTime);

			// Exchange data
			exchanges.forEach((ex) => {
				const candle = point[ex] as OhlcvCandle | undefined;

				const tdClose = document.createElement("td");
				const tdVol = document.createElement("td");

				if (candle && typeof candle !== "number") {
					const isGreen = candle.close >= candle.open;
					tdClose.textContent = `$${this.formatPrice(candle.close)}`;
					tdClose.className = isGreen ? "cell-green" : "cell-red";

					tdVol.textContent = this.formatVolume(candle.volume);

					// Highlight best/worst on last row
					if (point === lastRow) {
						if (ex === bestExchange) tdClose.classList.add("cell-best");
						if (ex === worstExchange) tdClose.classList.add("cell-worst");
					}
				} else {
					tdClose.textContent = "—";
					tdClose.style.color = "var(--text-muted)";
					tdVol.textContent = "—";
					tdVol.style.color = "var(--text-muted)";
				}

				tr.appendChild(tdClose);
				tr.appendChild(tdVol);
			});

			body.appendChild(tr);
		});
	}

	private sort(data: AggregatedDataPoint[], exchanges: string[], colIndex: number) {
		const body = document.getElementById("table-body");
		if (!body) return;

		// Update sort state
		const head = document.getElementById("table-head");
		head?.querySelectorAll("th").forEach((th) => th.classList.remove("sorted"));
		head?.querySelector(`th[data-col="${colIndex}"]`)?.classList.add("sorted");

		const sorted = [...data];

		if (colIndex === 0) {
			// Sort by timestamp
			this.sortAsc = !this.sortAsc;
			sorted.sort((a, b) => this.sortAsc ? a.timestamp - b.timestamp : b.timestamp - a.timestamp);
		} else {
			// Determine exchange and field
			const exchangeIndex = Math.floor((colIndex - 1) / 2);
			const isVolume = (colIndex - 1) % 2 === 1;
			const exchange = exchanges[exchangeIndex];

			this.sortAsc = !this.sortAsc;
			sorted.sort((a, b) => {
				const aCandle = a[exchange] as OhlcvCandle | undefined;
				const bCandle = b[exchange] as OhlcvCandle | undefined;
				const aVal = aCandle && typeof aCandle !== "number" ? (isVolume ? aCandle.volume : aCandle.close) : -Infinity;
				const bVal = bCandle && typeof bCandle !== "number" ? (isVolume ? bCandle.volume : bCandle.close) : -Infinity;
				return this.sortAsc ? aVal - bVal : bVal - aVal;
			});
		}

		this.renderBody(sorted, exchanges, body);
	}

	private capitalize(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	private formatTimestamp(ts: number): string {
		const d = new Date(ts);
		return d.toLocaleString("en-US", {
			month: "short",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});
	}

	private formatPrice(num: number): string {
		if (num >= 1000) {
			return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
		}
		return num.toFixed(num < 1 ? 6 : 4);
	}

	private formatVolume(num: number): string {
		if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
		if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
		return num.toFixed(2);
	}
}
