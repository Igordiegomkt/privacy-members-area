import { useEffect } from 'react';

/**
 * Hook para adicionar proteções básicas contra cópia/download
 */
export const useProtection = () => {
  useEffect(() => {
    // Prevenir menu de contexto (botão direito)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Prevenir seleção de texto
    const handleSelectStart = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Prevenir arrastar imagens
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Bloquear atalhos de teclado
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+S, Ctrl+U, Ctrl+P
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'j') ||
        (e.ctrlKey && e.key.toLowerCase() === 's') ||
        (e.ctrlKey && e.key.toLowerCase() === 'u') ||
        (e.ctrlKey && e.key.toLowerCase() === 'p')
      ) {
        e.preventDefault();
        return false;
      }
    };

    // Prevenir zoom com múltiplos toques
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('touchstart', handleTouchStart, { passive: false });

    // Adicionar atributos no body
    document.body.setAttribute('oncontextmenu', 'return false');
    document.body.setAttribute('onselectstart', 'return false');
    document.body.setAttribute('ondragstart', 'return false');

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);
};

