export function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizePhone(value: string) {
  const trimmed = value.trim();
  const digits = phoneDigits(trimmed);
  if (!digits) return "";
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

export function getPhoneValidationError(value: string) {
  const digits = phoneDigits(value);

  if (digits.length < 10 || digits.length > 15) {
    return "Enter a real mobile number with 10 to 15 digits.";
  }

  if (/^(\d)\1+$/.test(digits)) {
    return "Please do not use placeholder numbers like 9999999999.";
  }

  if (new Set(digits).size < 4) {
    return "Please enter a real mobile number, not a repeated or placeholder number.";
  }

  const obviousPlaceholders = new Set([
    "0123456789",
    "1234567890",
    "9876543210",
    "9999999999",
    "8888888888",
    "7777777777",
    "0000000000",
  ]);
  const lastTen = digits.slice(-10);
  if (obviousPlaceholders.has(lastTen)) {
    return "Please enter a real mobile number, not a sample number.";
  }

  return "";
}

export function isValidPhoneNumber(value: string) {
  return !getPhoneValidationError(value);
}
