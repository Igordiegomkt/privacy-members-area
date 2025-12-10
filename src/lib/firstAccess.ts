import { SupabaseClient } from '@supabase/supabase-js';

/**
 * -- SQL sugerido para criar a tabela de controle de primeiro acesso:
 * -- Esta tabela é leve e serve apenas para registrar a primeira vez que um usuário autenticado acessa o sistema.
 *
 * CREATE TABLE public.user_first_access (
 *   user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 *   created_at timestamptz NOT NULL DEFAULT now()
 * );
 *
 * -- Habilita RLS para segurança
 * ALTER TABLE public.user_first_access ENABLE ROW LEVEL SECURITY;
 *
 * -- Permite que usuários autenticados leiam e criem seu próprio registro de primeiro acesso.
 * CREATE POLICY "Allow users to manage their own first access record"
 * ON public.user_first_access
 * FOR ALL
 * TO authenticated
 * USING (auth.uid() = user_id)
 * WITH CHECK (auth.uid() = user_id);
 *
 */

/**
 * Verifica se é o primeiro acesso de um usuário autenticado.
 * Se for, registra o acesso e retorna true. Caso contrário, retorna false.
 * @param supabase - O cliente Supabase.
 * @param userId - O ID do usuário autenticado.
 * @returns Um objeto com a flag isFirstAccess.
 */
export const ensureFirstAccess = async (
  supabase: SupabaseClient,
  userId: string
): Promise<{ isFirstAccess: boolean }> => {
  try {
    // 1. Verifica se já existe um registro para este usuário.
    const { data, error: selectError } = await supabase
      .from('user_first_access')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 significa "nenhuma linha encontrada", o que é esperado no primeiro acesso.
      // Qualquer outro erro deve ser logado.
      throw selectError;
    }

    if (data) {
      // O registro já existe, não é o primeiro acesso.
      return { isFirstAccess: false };
    }

    // 2. Se não existe, insere um novo registro.
    const { error: insertError } = await supabase
      .from('user_first_access')
      .insert({ user_id: userId });

    if (insertError) {
      // Se a inserção falhar (ex: por uma condição de corrida), tratamos como não sendo o primeiro acesso para evitar loops.
      console.error('Error inserting first access record:', insertError);
      return { isFirstAccess: false };
    }

    // Inserção bem-sucedida, é o primeiro acesso.
    return { isFirstAccess: true };

  } catch (error) {
    console.error('Failed to ensure first access:', error);
    // Em caso de qualquer erro inesperado, assumimos que não é o primeiro acesso para evitar redirecionamentos incorretos.
    return { isFirstAccess: false };
  }
};