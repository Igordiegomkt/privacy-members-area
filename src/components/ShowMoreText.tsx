import * as React from 'react';
import { useState } from 'react';

interface ShowMoreTextProps {
  text: string;
  maxLines?: number;
  className?: string;
}

export const ShowMoreText: React.FC<ShowMoreTextProps> = ({
  text,
  maxLines = 3,
  className = 'text-privacy-text-secondary',
}: ShowMoreTextProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Usamos line-clamp para limitar visualmente o texto
  const clampedClass = `line-clamp-${maxLines}`;
  
  // Nota: A funcionalidade de line-clamp depende de plugins CSS no Tailwind, 
  // mas a lógica de expansão via botão funciona independentemente.

  return (
    <div className={className}>
      <p className={`${!isExpanded ? clampedClass : ''} transition-all duration-300`}>
        {text}
      </p>
      {/* Assumimos que o texto pode ser longo o suficiente para precisar de um toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-primary text-xs font-semibold mt-1 hover:underline"
      >
        {isExpanded ? 'Mostrar menos' : 'Mostrar mais'}
      </button>
    </div>
  );
};