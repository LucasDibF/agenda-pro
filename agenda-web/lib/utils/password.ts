export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Senha deve ter pelo menos 8 caracteres.";
  }
  if (!/[a-z]/.test(password)) {
    return "Senha deve conter ao menos uma letra minuscula.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Senha deve conter ao menos uma letra maiuscula.";
  }
  if (!/[0-9]/.test(password)) {
    return "Senha deve conter ao menos um numero.";
  }
  return null;
}
