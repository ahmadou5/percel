/**
 * Mapping of bank codes (CBN / Paystack / Monnify) and names to their corresponding
 * slug in the supermx1/nigerian-banks-api repository.
 */
const BANK_SLUGS: Record<string, string> = {
  // Access Bank
  '044': 'access-bank',
  '000014': 'access-bank',
  'access': 'access-bank',
  'access bank': 'access-bank',

  // Guaranty Trust Bank (GTB)
  '058': 'guaranty-trust-bank',
  '000013': 'guaranty-trust-bank',
  'gtb': 'guaranty-trust-bank',
  'gtbank': 'guaranty-trust-bank',
  'guaranty trust': 'guaranty-trust-bank',
  'guaranty trust bank': 'guaranty-trust-bank',

  // Zenith Bank
  '057': 'zenith-bank',
  '000015': 'zenith-bank',
  'zenith': 'zenith-bank',
  'zenith bank': 'zenith-bank',

  // United Bank for Africa
  '033': 'united-bank-for-africa',
  '000004': 'united-bank-for-africa',
  'uba': 'united-bank-for-africa',
  'united bank for africa': 'united-bank-for-africa',

  // First Bank of Nigeria
  '011': 'first-bank-of-nigeria',
  '000016': 'first-bank-of-nigeria',
  'first bank': 'first-bank-of-nigeria',
  'firstbank': 'first-bank-of-nigeria',
  'first bank of nigeria': 'first-bank-of-nigeria',

  // First City Monument Bank (FCMB)
  '214': 'first-city-monument-bank',
  '000003': 'first-city-monument-bank',
  'fcmb': 'first-city-monument-bank',
  'first city monument bank': 'first-city-monument-bank',

  // Union Bank
  '032': 'union-bank-of-nigeria',
  '000018': 'union-bank-of-nigeria',
  'union': 'union-bank-of-nigeria',
  'union bank': 'union-bank-of-nigeria',
  'union bank of nigeria': 'union-bank-of-nigeria',

  // Sterling Bank
  '232': 'sterling-bank',
  '000001': 'sterling-bank',
  'sterling': 'sterling-bank',
  'sterling bank': 'sterling-bank',

  // Wema Bank
  '035': 'wema-bank',
  '000017': 'wema-bank',
  'wema': 'wema-bank',
  'wema bank': 'wema-bank',

  // Fidelity Bank
  '070': 'fidelity-bank',
  '000007': 'fidelity-bank',
  'fidelity': 'fidelity-bank',
  'fidelity bank': 'fidelity-bank',

  // Polaris Bank (formerly Skye Bank)
  '076': 'polaris-bank',
  '000008': 'polaris-bank',
  'polaris': 'polaris-bank',
  'polaris bank': 'polaris-bank',

  // Keystone Bank
  '082': 'keystone-bank',
  '000002': 'keystone-bank',
  'keystone': 'keystone-bank',
  'keystone bank': 'keystone-bank',

  // Stanbic IBTC Bank
  '221': 'stanbic-ibtc-bank',
  '000012': 'stanbic-ibtc-bank',
  'stanbic': 'stanbic-ibtc-bank',
  'stanbic ibtc': 'stanbic-ibtc-bank',
  'stanbic ibtc bank': 'stanbic-ibtc-bank',

  // Ecobank Nigeria
  '050': 'ecobank-nigeria',
  '000010': 'ecobank-nigeria',
  'ecobank': 'ecobank-nigeria',
  'ecobank nigeria': 'ecobank-nigeria',

  // Providus Bank
  '101': 'providus-bank',
  '000023': 'providus-bank',
  'providus': 'providus-bank',
  'providus bank': 'providus-bank',

  // Jaiz Bank
  '301': 'jaiz-bank',
  '000006': 'jaiz-bank',
  'jaiz': 'jaiz-bank',
  'jaiz bank': 'jaiz-bank',

  // Taj Bank
  '302': 'taj-bank',
  'taj': 'taj-bank',
  'taj bank': 'taj-bank',

  // Globus Bank
  '103': 'globus-bank',
  'globus': 'globus-bank',
  'globus bank': 'globus-bank',

  // Titan Trust Bank / Titan Paystack
  '102': 'titan-paystack',
  'titan': 'titan-paystack',
  'titan trust': 'titan-paystack',
  'titan trust bank': 'titan-paystack',
  'titan paystack': 'titan-paystack',

  // Heritage Bank
  '030': 'heritage-bank',
  'heritage': 'heritage-bank',
  'heritage bank': 'heritage-bank',

  // Unity Bank
  '215': 'unity-bank',
  'unity': 'unity-bank',
  'unity bank': 'unity-bank',

  // Kuda Bank (Kuda MFB)
  '50211': 'kuda-bank',
  '090267': 'kuda-bank',
  'kuda': 'kuda-bank',
  'kuda bank': 'kuda-bank',
  'kuda mfb': 'kuda-bank',

  // Moniepoint MFB
  '50515': 'moniepoint-mfb-ng',
  '090272': 'moniepoint-mfb-ng',
  'moniepoint': 'moniepoint-mfb-ng',
  'moniepoint mfb': 'moniepoint-mfb-ng',

  // Carbon (Paylater)
  '565': 'carbon',
  'carbon': 'carbon',

  // Rubies Bank
  'rubies': 'rubies-mfb',
  'rubies bank': 'rubies-mfb',
  'rubies mfb': 'rubies-mfb',

  // VFD MFB
  'vfd': 'vfd',
  'vfd mfb': 'vfd',
  'vfd microfinance bank': 'vfd',

  // Lotus Bank
  '000036': 'lotus-bank',
  'lotus': 'lotus-bank',
  'lotus bank': 'lotus-bank',

  // Optimus Bank
  'optimus': 'optimus-bank-ltd',
  'optimus bank': 'optimus-bank-ltd',

  // Parallex Bank
  'parallex': 'parallex-bank',
  'parallex bank': 'parallex-bank',

  // Sparkle MFB
  'sparkle': 'sparkle-microfinance-bank',
  'sparkle mfb': 'sparkle-microfinance-bank',
  'sparkle microfinance bank': 'sparkle-microfinance-bank',

  // Standard Chartered
  '068': 'standard-chartered-bank',
  'standard chartered': 'standard-chartered-bank',
  'standard chartered bank': 'standard-chartered-bank',

  // Suntrust Bank
  '100': 'suntrust-bank',
  'suntrust': 'suntrust-bank',
  'suntrust bank': 'suntrust-bank',

  // Rand Merchant Bank
  'rand merchant': 'rand-merchant-bank',
  'rand merchant bank': 'rand-merchant-bank',

  // Premiumtrust Bank
  'premiumtrust': 'premiumtrust-bank-ng',
  'premium trust': 'premiumtrust-bank-ng',
  'premiumtrust bank': 'premiumtrust-bank-ng',

  // Branch
  'branch': 'branch',

  // Eyowo
  'eyowo': 'eyowo',

  // Tangerine Money
  'tangerine': 'tangerine-money',
  'tangerine money': 'tangerine-money',

  // Mint MFB
  'mint': 'mint-mfb',
  'mint mfb': 'mint-mfb',

  // MTN MoMo PSB
  'mtn momo': 'mtn-momo-psb-ng',
  'momo': 'mtn-momo-psb-ng',
  'mtn momo psb': 'mtn-momo-psb-ng',
};

/**
 * Normalizes a bank name into a potential slug representation.
 * E.g., "First Bank of Nigeria Plc" -> "first-bank-of-nigeria"
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(limited|ltd|plc|microfinance bank|mfb)\b/g, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Returns a high-quality PNG logo URL for the given bank code and/or bank name.
 * Uses the community-maintained CDN from jsdelivr targeting the nigerian-banks-api.
 */
export function getBankLogoUrl(bankCode?: string, bankName?: string, slug?: string | null): string {
  const baseUrl = 'https://cdn.jsdelivr.net/gh/supermx1/nigerian-banks-api@main/logos';
  const code = bankCode?.trim();
  const cleanSlug = slug?.trim();

  // Some providers send the bank code as `slug`, so known mappings need to win
  // before trusting a provider slug directly.
  if (code && BANK_SLUGS[code]) {
    return baseUrl + '/' + BANK_SLUGS[code] + '.png';
  }

  if (cleanSlug && BANK_SLUGS[cleanSlug]) {
    return baseUrl + '/' + BANK_SLUGS[cleanSlug] + '.png';
  }

  if (bankName) {
    const cleanName = bankName.toLowerCase().trim();
    if (BANK_SLUGS[cleanName]) {
      return baseUrl + '/' + BANK_SLUGS[cleanName] + '.png';
    }

    const normalized = normalizeName(bankName);
    if (normalized) {
      return baseUrl + '/' + normalized + '.png';
    }
  }

  if (cleanSlug && !/^[0-9]+$/.test(cleanSlug)) {
    return baseUrl + '/' + cleanSlug + '.png';
  }

  return baseUrl + '/default-bank.png';
}
