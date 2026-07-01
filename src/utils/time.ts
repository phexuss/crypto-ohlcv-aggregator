export function timeToMs(duration: string): number {
	const units: Record<string, number> = {
		s: 1000,
		m: 60 * 1000,
		h: 60 * 60 * 1000,
		d: 24 * 60 * 60 * 1000,
		w: 7 * 24 * 60 * 60 * 1000,
	};

	const match = duration.match(/^(\d+)([smhdw])$/);
	if (!match) {
		throw new Error(
			'Invalid duration format. Use format like "1h", "30m", "7d"',
		);
	}

	const [, value, unit] = match;
	return parseInt(value, 10) * units[unit];
}
