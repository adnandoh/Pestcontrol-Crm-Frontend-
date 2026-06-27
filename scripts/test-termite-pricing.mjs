/**
 * Termite pricing lookup — run: npx tsx scripts/test-termite-pricing.mjs
 */
import {
  computePerServicePricing,
  getUnitPrice,
  MUMBAI_PRICING_CONFIG,
} from '../src/utils/jobCardPricing.ts';

const apiStyleConfig = {
  ...MUMBAI_PRICING_CONFIG,
  pricing: {
    ...MUMBAI_PRICING_CONFIG.pricing,
    Termite: {
      'One Time Service': {
        '1 BHK': 2500,
        '2 BHK': 3000,
      },
    },
  },
};

const price = getUnitPrice('Termite', 'One Time Treatment', '1 BHK', apiStyleConfig);
if (price !== 2500) {
  console.error('FAIL: expected 2500, got', price);
  process.exit(1);
}

const { total, lines } = computePerServicePricing(
  { Termite: { plan: 'One Time Treatment', area: '1 BHK' } },
  apiStyleConfig,
);
if (total !== 2500 || lines[0]?.price !== 2500) {
  console.error('FAIL: computePerServicePricing total', total, lines);
  process.exit(1);
}

console.log('Termite One Time Treatment → 1 BHK = ₹', price, 'OK');
