import { t } from "elysia";

export const OhlcvRequestSchema = t.Object({
	exchanges: t.Array(t.String(), { minItems: 1 }),
	market: t.String(),
	interval: t.Union([
		t.Literal("1m"),
		t.Literal("5m"),
		t.Literal("15m"),
		t.Literal("1h"),
		t.Literal("4h"),
		t.Literal("1d"),
	]),
	period: t.Union([t.String(), t.Number()]),
});

export const OhlcvResponseSchema = t.Object({
	data: t.Any(),
});

export const ErrorResponseSchema = t.Object({
	error: t.String(),
	message: t.Optional(t.String()),
});
