type AuthError = { code?: string; message?: string };

export function pesanAuthError(error: AuthError, fallback: string): string {
  switch (error.code) {
    case "INVALID_PASSWORD":
      return "Password salah.";
    case "PASSWORD_TOO_SHORT":
      return "Password baru terlalu pendek (minimal 8 karakter).";
    case "PASSWORD_TOO_LONG":
      return "Password baru terlalu panjang.";
    default:
      return fallback;
  }
}