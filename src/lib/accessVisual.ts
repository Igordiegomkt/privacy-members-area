import { getValidGrant } from './accessGrant';

/**
 * Verifica se o modelo está desbloqueado por um AccessGrant válido (global ou específico do modelo).
 * @param modelId O ID do modelo a ser verificado.
 * @returns true se o acesso for concedido por link.
 */
export function isModelUnlockedByGrant(modelId: string): boolean {
  const grant = getValidGrant();
  if (!grant) return false;

  // 1. Acesso Global
  if (grant.scope === 'global') {
    return true;
  }

  // 2. Acesso Específico do Modelo
  if (grant.scope === 'model' && grant.model_id === modelId) {
    return true;
  }
  
  // 3. Acesso por Produto (Não consideramos aqui para evitar complexidade no feed/listagem de modelos)
  return false;
}