/**
 * Calcula o hash SHA-256 de uma string e retorna o resultado em formato hexadecimal.
 * @param input A string a ser hasheada.
 * @returns Uma Promise que resolve para a string hash hexadecimal.
 */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Gera um token forte e único com prefixo 'mp_'.
 * @returns O token gerado.
 */
export function generateStrongToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join('');
  return `mp_${hex}`; // prefixo só para identificação
}