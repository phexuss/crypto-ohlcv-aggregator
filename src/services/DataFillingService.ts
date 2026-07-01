import type { IOhlcvData } from "../types";

export class DataFillingService {
	static fillGaps(data: IOhlcvData[], intervalMs: number): IOhlcvData[] {
		if (data.length < 2) return data;

		const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
		const filledData: IOhlcvData[] = [];

		for (let i = 0; i < sortedData.length; i++) {
			const current = sortedData[i];
			filledData.push(current);

			if (i < sortedData.length - 1) {
				const next = sortedData[i + 1];
				let expectedTimestamp = current.timestamp + intervalMs;

				while (expectedTimestamp < next.timestamp) {
					filledData.push({
						timestamp: expectedTimestamp,
						open: current.close,
						high: current.close,
						low: current.close,
						close: current.close,
						volume: 0,
					});
					expectedTimestamp += intervalMs;
				}
			}
		}

		return filledData;
	}
}
