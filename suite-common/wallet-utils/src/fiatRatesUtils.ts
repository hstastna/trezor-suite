import { NetworkSymbol } from '@suite-common/wallet-config';
import { FiatCurrencyCode } from '@suite-common/suite-config';
import { TokenAddress, FiatRateKey, TickerId, Timestamp } from '@suite-common/wallet-types';

const ONE_HOUR_IN_SECONDS = 60 * 60;

export const getFiatRateKey = (
    symbol: NetworkSymbol,
    fiatCurrency: FiatCurrencyCode,
    tokenAddress?: TokenAddress,
): FiatRateKey => {
    if (tokenAddress) {
        return `${symbol}-${tokenAddress}-${fiatCurrency}` as FiatRateKey;
    }

    return `${symbol}-${fiatCurrency}` as FiatRateKey;
};

export const getFiatRateKeyFromTicker = (
    ticker: TickerId,
    fiatCurrency: FiatCurrencyCode,
): FiatRateKey => {
    const { symbol, tokenAddress } = ticker;

    return getFiatRateKey(symbol, fiatCurrency, tokenAddress);
};

export const roundTimestampToNearestPastHour = (timestamp: Timestamp) =>
    Math.floor(timestamp / ONE_HOUR_IN_SECONDS) * ONE_HOUR_IN_SECONDS;

export const roundTimestampsToNearestPastHour = (timestamps: Timestamp[]) => {
    return timestamps.map(timestamp => {
        return roundTimestampToNearestPastHour(timestamp);
    });
};
