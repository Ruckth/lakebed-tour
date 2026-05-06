export function demoCode(prefix: string, bookingId: string): string {
	return `${prefix}-${new Date().getUTCFullYear()}-${bookingId.slice(-6).toUpperCase()}`;
}
