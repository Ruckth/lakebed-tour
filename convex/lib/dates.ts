export function isIsoDate(s: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
	const [y, m, d] = s.split('-').map((n) => Number(n));
	const date = new Date(Date.UTC(y, m - 1, d));
	return (
		date.getUTCFullYear() === y &&
		date.getUTCMonth() === m - 1 &&
		date.getUTCDate() === d
	);
}

export function utcMidnightMs(s: string): number {
	const [y, m, d] = s.split('-').map((n) => Number(n));
	return Date.UTC(y, m - 1, d);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
	return Math.floor((utcMidnightMs(checkOut) - utcMidnightMs(checkIn)) / 86400000);
}

export function stayDates(checkIn: string, checkOut: string): string[] {
	const dates: string[] = [];
	const cursor = new Date(`${checkIn}T00:00:00.000Z`);
	const end = new Date(`${checkOut}T00:00:00.000Z`);

	while (cursor < end) {
		dates.push(cursor.toISOString().slice(0, 10));
		cursor.setUTCDate(cursor.getUTCDate() + 1);
	}

	return dates;
}

export function todayIso(): string {
	return new Date().toISOString().split('T')[0];
}
