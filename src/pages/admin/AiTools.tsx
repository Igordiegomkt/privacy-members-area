import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

type GenerationType = 'caption' | 'cta' | 'product_description' | 'bio' | 'media_preview';

const PROMPT_TEMPLATES: Record<GenerationType, (input: string) => string> = {
  caption: (input) => `Gere uma legenda curta e provocante para uma foto ou vídeo de uma modelo de conteúdo adulto no estilo Privacy. A legenda deve ser sensual, mas elegante, e despertar curiosidade. Use emojis relevantes. Contexto: ${input}`,
  cta: (input) => `Crie 3 opções de Chamada para Ação (CTA) para uma modelo de conteúdo adulto vender um pack de mídias. O tom deve ser direto e persuasivo, incentivando o desbloqueio do conteúdo. Contexto do pack: ${input}`,
  product_description: (input) => `Escreva uma descrição de produto para um pack de fotos e vídeos de uma modelo no Privacy. A descrição deve ser atraente, detalhar o que o fã encontrará, e justificar o valor. Detalhes do produto: ${input}`,
  bio: (input) => `Crie uma bio curta e magnética para o perfil de uma modelo no Privacy. A bio deve ser convidativa, misteriosa e sugerir o tipo de conteúdo exclusivo que ela oferece. Informações da modelo: ${input}`,
  media_preview: (input) => `Gere um preview textual sensual para uma mídia (foto ou vídeo) de uma modelo, no estilo que o Privacy usa. O texto deve ser uma frase curta que descreva a cena de forma provocante, sem ser explícita. Descrição da mídia: ${input}`,
};

export const AiTools: React.FC = () => {
  const [inputType, setInputType] = useState<GenerationType>('caption');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      setError('Por favor, forneça um contexto ou descrição.');
      return;
    }
    setIsLoading(true);
    setResult('');
    setError('');

    const prompt = PROMPT_TEMPLATES[inputType](inputText);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('gemini-generate', {
        body: { prompt },
      });

      if (invokeError) {
        console.error('[AiTools] invoke error', invokeError);
        setError(`Erro na função de IA: ${invokeError.message || 'Falha desconhecida.'}`);
        return;
      }

      if (!data) {
        setError('Resposta vazia da IA.');
        return;
      }

      if (data.ok === false) {
        if (data.code === 'LIMIT_EXCEEDED') {
          setError('⚠️ O assistente de IA atingiu o limite de uso da conta. Tente novamente mais tarde.');
        } else if (data.code === 'GEMINI_API_ERROR') {
          setError(`Erro na IA: ${data.message || 'Verifique a GEMINI_API_KEY e o billing.'}`);
        } else {
          setError(`Erro na IA: ${data.message || data.code || 'Erro desconhecido.'}`);
        }
        return;
      }

      const text = data.generatedText?.toString().trim();
      if (!text) {
        setError('A IA não retornou texto.');
        return;
      }

      setResult(text);
    } catch (err: any) {
      console.error('[AiTools] unexpected error', err);
      setError(`Erro ao gerar conteúdo: ${err?.message || 'Falha desconhecida na IA.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="text-white p-6">
      <h1 className="text-2xl font-bold mb-3">✨ IA – Assistente de Conteúdo</h1>
      <p className="text-privacy-text-secondary mb-6">
        Gere legendas, descrições e CTAs usando Gemini Pro para otimizar seu perfil.
      </p>

      <div className="bg-privacy-surface border border-privacy-border rounded-xl p-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-privacy-text-secondary mb-2 block">Tipo de Conteúdo</label>
            <select
              value={inputType}
              onChange={(e) => setInputType(e.target.value as GenerationType)}
              className="w-full px-4 py-3 bg-privacy-black border border-privacy-border rounded-lg text-privacy-text-primary focus:outline-none focus:border-primary"
            >
              <option value="caption">Legenda para Feed</option>
              <option value="cta">Chamada para Ação (CTA)</option>
              <option value="product_description">Descrição de Produto</option>
              <option value="bio">Bio para Perfil</option>
              <option value="media_preview">Preview Textual de Mídia</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-privacy-text-secondary mb-2 block">Contexto / Descrição</label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ex: vídeo na banheira com espuma..."
              className="w-full px-4 py-3 bg-privacy-black border border-privacy-border rounded-lg text-privacy-text-primary focus:outline-none focus:border-primary h-28 resize-none"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full bg-primary text-privacy-black font-bold py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50"
          >
            {isLoading ? 'Gerando...' : 'Gerar com IA'}
          </button>
        </div>

        {(result || error) && (
          <div className="mt-6 pt-6 border-t border-privacy-border">
            {error && <p className="text-red-400 bg-red-500/10 p-3 rounded-md">{error}</p>}
            {result && (
              <div>
                <h3 className="font-semibold mb-2">Resultado:</h3>
                <div className="bg-privacy-black p-4 rounded-md whitespace-pre-wrap text-sm">{result}</div>
                <button
                  onClick={() => navigator.clipboard.writeText(result)}
                  className="mt-2 text-xs bg-privacy-border px-2 py-1 rounded hover:bg-primary hover:text-black"
                >
                  Copiar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};