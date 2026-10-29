export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export function isValidEmployeeId(code: string): boolean {
  return code.trim().length >= 3;
}

export function isValidOtp(otp: string): boolean {
  return /^\d{6}$/.test(otp.trim());
}
