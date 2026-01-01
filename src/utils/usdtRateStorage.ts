const USDT_RATES_KEY = 'client_usdt_rates';

interface UsdtRates {
  [clientId: string]: number;
}

export const getUsdtRate = (clientId: string): number => {
  try {
    const stored = localStorage.getItem(USDT_RATES_KEY);
    if (!stored) return 90;

    const rates: UsdtRates = JSON.parse(stored);
    return rates[clientId] || 90;
  } catch {
    return 90;
  }
};

export const setUsdtRate = (clientId: string, rate: number): void => {
  try {
    const stored = localStorage.getItem(USDT_RATES_KEY);
    const rates: UsdtRates = stored ? JSON.parse(stored) : {};
    rates[clientId] = rate;
    localStorage.setItem(USDT_RATES_KEY, JSON.stringify(rates));
  } catch (error) {
    console.error('Failed to save USDT rate:', error);
  }
};

export const getAllUsdtRates = (): UsdtRates => {
  try {
    const stored = localStorage.getItem(USDT_RATES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};
