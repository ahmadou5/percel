/**
 * Mapping of bank codes (CBN / Paystack / Monnify) and names to their corresponding
 * slug in the supermx1/nigerian-banks-api repository.
 */
const BANK_SLUGS: Record<string, string> = {
  // Access Bank
  '044': 'access-bank',
  '000014': 'access-bank',
  'access': 'access-bank',

  // Guaranty Trust Bank
  '058': 'guaranty-trust-bank',
  '000013': 'guaranty-trust-bank',
  'gtb': 'guaranty-trust-bank',
  'gtbank': 'guaranty-trust-bank',
  'guaranty trust': 'guaranty-trust-bank',

  // Zenith Bank
  '057': 'zenith-bank',
  '000015': 'zenith-bank',
  'zenith': 'zenith-bank',

  // United Bank for Africa
  '033': 'united-bank-for-africa',
  '000004': 'united-bank-for-africa',
  'uba': 'united-bank-for-africa',

  // First Bank of Nigeria
  '011': 'first-bank-of-nigeria',
  '000016': 'first-bank-of-nigeria',
  'first bank': 'first-bank-of-nigeria',
  'firstbank': 'first-bank-of-nigeria',

  // Union Bank
  '032': 'union-bank-of-nigeria',
  '000018': 'union-bank-of-nigeria',
  'union': 'union-bank-of-nigeria',

  // Sterling Bank
  '232': 'sterling-bank',
  '000001': 'sterling-bank',
  'sterling': 'sterling-bank',

  // Wema Bank
  '035': 'wema-bank',
  '000017': 'wema-bank',
  'wema': 'wema-bank',

  // Fidelity Bank
  '070': 'fidelity-bank',
  '000007': 'fidelity-bank',
  'fidelity': 'fidelity-bank',

  // Polaris Bank (formerly Skye Bank)
  '076': 'polaris-bank',
  '000008': 'polaris-bank',
  'polaris': 'polaris-bank',

  // Keystone Bank
  '082': 'keystone-bank',
  '000002': 'keystone-bank',
  'keystone': 'keystone-bank',

  // Stanbic IBTC Bank
  '221': 'stanbic-ibtc-bank',
  '000012': 'stanbic-ibtc-bank',
  'stanbic': 'stanbic-ibtc-bank',
  'stanbic ibtc': 'stanbic-ibtc-bank',

  // Ecobank Nigeria
  '050': 'ecobank-nigeria',
  '000010': 'ecobank-nigeria',
  'ecobank': 'ecobank-nigeria',

  // Providus Bank
  '101': 'providus-bank',
  '000023': 'providus-bank',
  'providus': 'providus-bank',

  // Jaiz Bank
  '301': 'jaiz-bank',
  '000006': 'jaiz-bank',
  'jaiz': 'jaiz-bank',

  // Taj Bank
  '302': 'taj-bank',
  'taj': 'taj-bank',

  // Globus Bank
  '103': 'globus-bank',
  'globus': 'globus-bank',

  // Titan Trust Bank
  '102': 'titan-trust-bank',
  'titan': 'titan-trust-bank',

  // Heritage Bank
  '030': 'heritage-bank',
  'heritage': 'heritage-bank',

  // Unity Bank
  '215': 'unity-bank',
  'unity': 'unity-bank',

  // Kuda Bank (Kuda MFB)
  '50211': 'kuda-bank',
  '090267': 'kuda-bank',
  'kuda': 'kuda-bank',

  // OPay (OPay Digital Services)
  '999992': 'opay-digital-services-opay',
  '100004': 'opay-digital-services-opay',
  'opay': 'opay-digital-services-opay',

  // PalmPay
  '999991': 'palmpay',
  '100033': 'palmpay',
  'palmpay': 'palmpay',

  // Carbon
  '565': 'carbon',
  'carbon': 'carbon',

  // Moniepoint MFB
  '50515': 'moniepoint-mfb',
  'moniepoint': 'moniepoint-mfb',

  // Rubies Bank
  'rubies': 'rubies-bank',

  // VFD MFB
  'vfd': 'vfd-microfinance-bank',
};

/**
 * Normalizes a bank name into a potential slug representation.
 * E.g., "First Bank of Nigeria Plc" -> "first-bank-of-nigeria"
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(limited|ltd|plc|microfinance bank|mfb|bank)\b/g, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Returns a high-quality PNG logo URL for the given bank code and/or bank name.
 * Uses the community-maintained CDN from jsdelivr targeting the nigerian-banks-api.
 */
export function getBankLogoUrl(bankCode?: string, bankName?: string): string {
  // 1. Try matching using the bank code
  if (bankCode && BANK_SLUGS[bankCode]) {
    return `https://cdn.jsdelivr.net/gh/supermx1/nigerian-banks-api@main/logos/${BANK_SLUGS[bankCode]}.png`;
  }

  // 2. Try matching by lowercased bank name string match
  if (bankName) {
    const cleanName = bankName.toLowerCase().trim();
    if (BANK_SLUGS[cleanName]) {
      return `https://cdn.jsdelivr.net/gh/supermx1/nigerian-banks-api@main/logos/${BANK_SLUGS[cleanName]}.png`;
    }

    // 3. Fallback: normalize the name dynamically and request slug
    const normalized = normalizeName(bankName);
    if (normalized) {
      return `https://cdn.jsdelivr.net/gh/supermx1/nigerian-banks-api@main/logos/${normalized}.png`;
    }
  }

  // 4. Default fallback: generic bank building icon (represented by the first-bank-of-nigeria logo or similar, or customizable)
  return 'https://cdn.jsdelivr.net/gh/supermx1/nigerian-banks-api@main/logos/default-bank.png';
}
