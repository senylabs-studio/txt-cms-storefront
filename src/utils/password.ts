// Mirrors ASP.NET Identity's default password policy, which the backend enforces for every
// account (AddIdentity in Program.cs doesn't relax it — staff logins share it): at least 6
// characters with a lowercase letter, an uppercase letter, a digit and a symbol. The forms used to
// check only the length, so a password like "password1" passed here and was then rejected by the
// backend with a Spanish-only message.
export function meetsPasswordRules(password: string): boolean {
  return password.length >= 6
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^a-zA-Z0-9]/.test(password);
}
