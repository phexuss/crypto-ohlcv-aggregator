# Crypto OHLCV Aggregator

[![Bun](https://img.shields.io/badge/Bun-1.0+-000000?logo=bun)](https://bun.sh)
[![ElysiaJS](https://img.shields.io/badge/ElysiaJS-Latest-8B5CF6?logo=elysia)](https://elysiajs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A production-grade cryptocurrency data aggregation service that fetches and synchronizes historical OHLCV (Open, High, Low, Close, Volume) candlestick data from 15 major cryptocurrency futures exchanges. Built with modern TypeScript, ElysiaJS framework, and Bun runtime.

## Project Background

This project started as a **freelance commission** for a client who needed a service to aggregate cryptocurrency market data from multiple exchanges. The original version ran in production, handling live trading data.

This is a **refactored version** of the original codebase. All client-specific code and proprietary logic have been removed or rewritten. The core architecture and exchange integrations are preserved to showcase the project.

### Migration Details

- **Original Stack**: Node.js + Express + Axios
- **Current Stack**: Bun + ElysiaJS + Native Fetch
- **Why the Change**: ElysiaJS provides better type safety through TypeBox, which is really helpful when working with 15 different exchange APIs that all have different response formats. Bun made the refactoring process faster with native TypeScript support and quicker startup times.

This version demonstrates:

- Working with multiple third-party APIs in parallel
- Handling data inconsistencies across different sources
- Production-ready error handling
- Clean, modular architecture

## Key Features

### Exchange Coverage

Integrates with 15 major cryptocurrency futures exchanges:

- **Tier 1**: Binance, OKX, Bybit (high liquidity venues)
- **Tier 2**: KuCoin, Bitget, MEXC, Gate.io (mid-tier exchanges)
- **Specialized**: BitMEX, HTX, HyperLiquid, XT, BingX, CoinEx, Bitmart, Blofin

### Core Capabilities

- **Parallel Execution**: Concurrent API requests with Promise.allSettled for fault isolation
- **Data Synchronization**: Timestamp-based alignment of candles across all exchanges
- **Gap Filling**: Smart interpolation for missing data points to maintain continuous time series
- **Symbol Normalization**: Automatic conversion of trading pairs to exchange-specific formats
- **Flexible Time Ranges**: Support for human-readable durations (`24h`, `7d`, `30d`) or precise Unix timestamps
- **Batch Queries**: Single `["all"]` parameter to query all 15 exchanges simultaneously
- **Type Safety**: Full TypeScript with runtime validation via TypeBox schemas
- **Error Resilience**: Individual exchange failures don't cascade to other exchanges

## Architecture Overview

```
src/
├── config/
│   └── index.ts              # Environment validation with TypeBox
├── exchanges/
│   ├── BaseExchangeApi.ts    # Abstract base class with common utilities
│   ├── BinanceApi.ts         # Binance futures integration
│   ├── OkxApi.ts             # OKX swap contracts integration
│   └── ...                   # 13 additional exchange implementations
├── routes/
│   └── ohlcv.ts              # Elysia plugin with POST /api/ohlcv endpoint
├── schemas/
│   └── ohlcv.ts              # Request/response validation schemas
├── services/
│   ├── AggregationService.ts # Parallel fetching and data synchronization
│   ├── DataFillingService.ts # Gap interpolation logic
│   └── SymbolNormalizer.ts   # Exchange-specific symbol conversion
├── types/
│   └── index.ts              # Core TypeScript interfaces and types
├── utils/
│   └── time.ts               # Duration parsing utilities
└── index.ts                  # Application entry point
```

### Design Patterns

- **Dependency Injection**: Exchange adapters injected into route plugins
- **Strategy Pattern**: Each exchange implements `IExchangeApi` interface
- **Plugin Architecture**: Elysia plugins for modular route composition
- **Repository Pattern**: BaseExchangeApi provides common data access methods

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.0.0 (or Node.js >= 18 for compatibility)
- No database required (stateless API)

### Installation

```bash
# Clone repository
git clone https://github.com/phexuss/crypto-ohlcv-aggregator.git
cd crypto-ohlcv-aggregator

# Install dependencies
bun install
```

### Environment Configuration

Copy the example environment file and adjust if needed:

```bash
cp .env.example .env.local
```

All exchange API URLs come pre-filled with default values. API keys are optional — public endpoints work without authentication.

See [.env.example](.env.example) for the full list of available variables.

### Running the Service

```bash
# Development mode with hot reload
bun run dev

# Production mode
bun run src/index.ts
```

Service starts at `http://localhost:3000` (or configured PORT)

Health check available at: `GET /api/health`

## API Documentation

### Endpoint

```
POST /api/ohlcv
Content-Type: application/json
```

### Request Schema

```typescript
{
  exchanges: string[]      // Array of exchange names or ["all"] for all exchanges
  market: string           // Trading pair symbol (e.g., "BTCUSDT", "ETHUSDT")
  interval: string         // Candle timeframe: "1m" | "5m" | "15m" | "1h" | "4h" | "1d"
  period: string | number  // Duration like "24h", "7d" OR Unix timestamp in milliseconds
}
```

### Request Examples

#### Query Multiple Exchanges

```bash
curl -X POST http://localhost:3000/api/ohlcv \
  -H "Content-Type: application/json" \
  -d '{
    "exchanges": ["binance", "okx", "bybit"],
    "market": "BTCUSDT",
    "interval": "1h",
    "period": "24h"
  }'
```

#### Query All Exchanges Simultaneously

```bash
curl -X POST http://localhost:3000/api/ohlcv \
  -H "Content-Type: application/json" \
  -d '{
    "exchanges": ["all"],
    "market": "ETHUSDT",
    "interval": "15m",
    "period": "7d"
  }'
```

#### Using Absolute Timestamp

```bash
curl -X POST http://localhost:3000/api/ohlcv \
  -H "Content-Type: application/json" \
  -d '{
    "exchanges": ["binance"],
    "market": "BTCUSDT",
    "interval": "1h",
    "period": 1719878400000
  }'
```

### Response Format

Returns array of timestamped data points with exchange-specific OHLCV data:

```json
[
  {
    "timestamp": 1719878400000,
    "binance": {
      "open": 50000.5,
      "high": 50500.0,
      "low": 49800.0,
      "close": 50200.0,
      "volume": 1234.56
    },
    "okx": {
      "open": 50001.0,
      "high": 50499.5,
      "low": 49799.0,
      "close": 50199.0,
      "volume": 1235.67
    },
    "bybit": {
      "open": 49999.0,
      "high": 50498.0,
      "low": 49801.0,
      "close": 50198.0,
      "volume": 1233.45
    }
  }
]
```

### Error Responses

```json
// 400 Bad Request - Invalid input
{
  "error": "Invalid period format. Use duration (e.g. \"24h\") or timestamp."
}

// 500 Internal Server Error - Server fault
{
  "error": "Failed to fetch data from exchanges",
  "message": "Connection timeout" // Only in development mode
}
```

## Technical Implementation Details

### Exchange Integration Patterns

Each exchange adapter handles:

1. **Symbol Normalization**: Converting `BTCUSDT` to exchange format

   - Binance: `BTCUSDT` (direct)
   - OKX: `BTC-USDT-SWAP` (hyphenated with swap suffix)
   - MEXC: `BTC_USDT` (underscore separator)
   - KuCoin: `XBTUSDTM` (special BTC notation with M suffix)
2. **Pagination**: Different strategies per exchange

   - Cursor-based (Binance, Bybit): Uses last timestamp
   - Token-based (OKX): Uses "after" pagination token
   - Range-based (Gate.io, Bitmart): Uses from/to timestamps
3. **Interval Mapping**: Converting standard intervals to exchange formats

   - Standard: `1h` → Bybit: `60` (minutes)
   - Standard: `1h` → OKX: `1H` (capitalized)
   - Standard: `1h` → MEXC: `Min60` (special format)

### Data Synchronization Algorithm

```
1. Parallel fetch from all selected exchanges
2. Apply DataFillingService.fillGaps() to each exchange dataset
3. Extract unique timestamp set from all datasets
4. Sort timestamps chronologically
5. For each timestamp, aggregate OHLCV data from available exchanges
6. Return unified array of IAggregatedDataPoint
```

## License

MIT License - See LICENSE file for details
