/**
 * Gera um token aleatório forte (UUID v4 formatado como string).
 * @returns Uma string de token forte.
 */
export const generateStrongToken = (): string => {
  // Gera um UUID v4 (36 caracteres)
  return crypto.randomUUID();
};

/**
 * Calcula o hash SHA-256 de uma string e retorna o resultado em formato hexadecimal (lowercase).
 * @param input A string a ser hasheada.
 * @returns O hash SHA-256 em formato hexadecimal.
 */
export const sha256Hex = async (input: string): Promise<string> => {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  
  // Converte o ArrayBuffer para string hexadecimal
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};