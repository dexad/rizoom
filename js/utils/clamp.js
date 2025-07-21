/**
 * Clamps a number between min and max values
 */
export function clamp(num, min, max) {
	return Math.min(Math.max(num, min), max);
}
