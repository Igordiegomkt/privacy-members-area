import * as React from 'react';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

type GenerationType = 'feed_caption' | 'media_description' | 'product_description' | 'bio';

interface AiResult {
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  tags: string[];
}

const TYPE_LABELS: Record<GenerationType, string> = {
  feed_caption: 'Legenda para Feed (Post)',
  media_description: 'Descrição de Mídia (Conteúdo)',
  product_description: 'Descrição de Produto/Pack',
  bio: 'Bio para Perfil de Modelo',
};

export const AiTools: React.FC = () => {
  const [inputType, setInputType] = useState<GenerationType>('feed_caption');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AiResult | null>(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      setError('Por favor, forneça um contexto ou descrição.');
      return;
    }
    setIsLoading(true);
    setResult(null);
    setError('');

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('ai-generate-content', {
        body: {
          contentType: inputType,
          context: inputText,
          language: 'pt-BR',
        },
      });

      if (invokeError) {
        console.error('[AiTools] invoke error', invokeError);
        setError(`Erro na função de IA: ${invokeError.message || 'Falha desconhecida.'}`);
        return;
      }

      if (!data || data.ok === false) {
        let errorMessage = data?.message || 'Falha ao gerar conteúdo com IA.';
        if (data?.code === 'NO_OPENAI_KEY') {
          errorMessage = '⚠️ Chave OPENAI_API_KEY não configurada no servidor.';
        } else if (data?.code === 'OPENAI_API_ERROR') {
          errorMessage = `Erro na API da OpenAI: ${data.message || 'Verifique a chave e o billing.'}`;
        }
        setError(errorMessage);
        return;
      }

      const generatedData = data.data as AiResult;
      setResult(generatedData);
    } catch (err: any) {
      console.error('[AiTools] unexpected error', err);
      setError(`Erro ao gerar conteúdo: ${err?.message || 'Falha desconhecida na IA.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const inputStyle = "w-full px-4 py-3 bg-privacy-black border border-privacy-border rounded-lg text-privacy-text-primary focus:outline-none focus:border-primary";

  return (
    <div className="text-white p-6">
      <h1 className="text-2xl font-bold mb-3">✨ IA – Assistente de Conteúdo</h1>
      <p className="text-privacy-text-secondary mb-6">
        Gere títulos, descrições e CTAs usando GPT para otimizar seu perfil.
      </p>

      <div className="bg-privacy-surface border border-privacy-border rounded-xl p-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-privacy-text-secondary mb-2 block">Tipo de Conteúdo</label>
            <select
              value={inputType}
              onChange={(e) => setInputType(e.target.value as GenerationType)}
              className={inputStyle}
            >
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-privacy-text-secondary mb-2 block">Contexto / Descrição</label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ex: vídeo na banheira com espuma, pack com 50 fotos na praia..."
              className={`${inputStyle} h-28 resize-none`}
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
              <div className="space-y-4">
                <h3 className="font-semibold text-lg mb-2">Resultado Gerado:</h3>
                
                {/* Título */}
                <div>
                  <label className="font-medium text-privacy-text-secondary block mb-1">Título</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={result.title} 
                      onChange={(e) => setResult(prev => prev ? ({ ...prev, title: e.target.value }) : null)}
                      className={`${inputStyle} flex-1`}
                    />
                    <button onClick={() => handleCopy(result.title)} className="text-xs bg-privacy-border px-2 py-1 rounded hover:bg-primary hover:text-black">Copiar</button>
                  </div>
                </div>

                {/* Subtítulo */}
                <div>
                  <label className="font-medium text-privacy-text-secondary block mb-1">Subtítulo</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={result.subtitle} 
                      onChange={(e) => setResult(prev => prev ? ({ ...prev, subtitle: e.target.value }) : null)}
                      className={`${inputStyle} flex-1`}
                    />
                    <button onClick={() => handleCopy(result.subtitle)} className="text-xs bg-privacy-border px-2 py-1 rounded hover:bg-primary hover:text-black">Copiar</button>
                  </div>
                </div>

                {/* Descrição */}
                <div>
                  <label className="font-medium text-privacy-text-secondary block mb-1">Descrição</label>
                  <div className="flex items-center gap-2">
                    <textarea 
                      value={result.description} 
                      onChange={(e) => setResult(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                      className={`${inputStyle} flex-1 h-24 resize-none`}
                    />
                    <button onClick={() => handleCopy(result.description)} className="text-xs bg-privacy-border px-2 py-1 rounded hover:bg-primary hover:text-black self-start mt-2">Copiar</button>
                  </div>
                </div>

                {/* CTA */}
                <div>
                  <label className="font-medium text-privacy-text-secondary block mb-1">CTA (Chamada para Ação)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={result.cta} 
                      onChange={(e) => setResult(prev => prev ? ({ ...prev, cta: e.target.value }) : null)}
                      className={`${inputStyle} flex-1`}
                    />
                    <button onClick={() => handleCopy(result.cta)} className="text-xs bg-privacy-border px-2 py-1 rounded hover:bg-primary hover:text-black">Copiar</button>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="font-medium text-privacy-text-secondary block mb-1">Tags Sugeridas</label>
                  <div className="flex flex-wrap gap-2">
                    {result.tags.map((tag, index) => (
                      <span key={index} className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};