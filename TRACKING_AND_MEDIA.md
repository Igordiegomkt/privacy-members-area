# 🎯 Tracking e Sistema de Mídias Implementado

## ✅ O que foi implementado

### 1. **Scripts de Tracking Integrados**

#### Google Tag Manager
- ✅ GTM ID: `GTM-MT6B5TBD`
- ✅ Script no `<head>` (primeiro script)
- ✅ Noscript no `<body>`

#### Facebook Pixel (2 IDs)
- ✅ Pixel Principal: `1312196850345293`
- ✅ Pixel Secundário: `1748812605764523`
- ✅ Lógica de Purchase único por pixel (não dispara duas vezes)
- ✅ PageView disparado automaticamente
- ✅ Noscript fallback para ambos os pixels

#### UTMify
- ✅ Script de UTMs (`utms/latest.js`)
- ✅ Pixel UTMify ID: `68e19e32a255808f0ad6f844`
- ✅ Prevenção de XCOD e SUBIDs

### 2. **Sistema de Mídias do Backblaze B2**

#### Configuração (`src/config/media.ts`)
- ✅ URLs base configuráveis:
  - Vídeos: `https://conteudos.s3.us-east-005.backblazeb2.com/video/video`
  - Fotos: `https://conteudos.s3.us-east-005.backblazeb2.com/foto/foto`
- ✅ 21 vídeos (video1.mp4 até video21.mp4)
- ✅ 44 fotos (foto1.png até foto44.png)
- ✅ Função para embaralhar mídias aleatoriamente

### 3. **Lazy Loading Inteligente**

#### Intersection Observer
- ✅ Carrega imagens apenas quando estão próximas da viewport
- ✅ Root margin de 100px (começa a carregar antes de aparecer)
- ✅ Skeleton loader enquanto carrega
- ✅ Tratamento de erros (mostra mensagem se falhar)

### 4. **Proteções Básicas**

#### Hook `useProtection`
- ✅ Bloqueia menu de contexto (botão direito)
- ✅ Previne seleção de texto
- ✅ Previne arrastar imagens
- ✅ Bloqueia atalhos: F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+S, Ctrl+U, Ctrl+P
- ✅ Previne zoom com múltiplos toques
- ✅ `controlsList="nodownload"` em vídeos
- ✅ `draggable={false}` em imagens

### 5. **Estrutura de Carregamento**

#### Scroll Infinito
- ✅ Carrega 12 itens por vez
- ✅ Detecta quando está a 300px do final
- ✅ Indicador de loading
- ✅ Mensagem quando todos os conteúdos foram carregados

## 📁 Arquivos Criados/Modificados

### Novos Arquivos
- `src/config/media.ts` - Configuração de URLs e geração de mídias
- `src/hooks/useProtection.ts` - Hook de proteções

### Arquivos Modificados
- `index.html` - Scripts de tracking adicionados
- `src/pages/Home.tsx` - Integração com sistema de mídias
- `src/components/MediaItem.tsx` - Lazy loading implementado
- `src/components/MediaGrid.tsx` - Callback de load adicionado
- `src/components/MediaModal.tsx` - Proteções adicionadas

## 🔧 Como Configurar

### 1. Ajustar URLs do Backblaze B2

Edite `src/config/media.ts`:

```typescript
export const MEDIA_CONFIG = {
  VIDEO_BASE_URL: 'https://seu-bucket.backblazeb2.com/video/video',
  PHOTO_BASE_URL: 'https://seu-bucket.backblazeb2.com/foto/foto',
  TOTAL_VIDEOS: 21,  // Ajuste conforme quantidade
  TOTAL_PHOTOS: 44,  // Ajuste conforme quantidade
  VIDEO_EXTENSION: '.mp4',
  PHOTO_EXTENSION: '.png',
};
```

### 2. Verificar IDs de Tracking

No `index.html`, verifique:
- Google Tag Manager ID: `GTM-MT6B5TBD`
- Facebook Pixel IDs: `1312196850345293` e `1748812605764523`
- UTMify Pixel ID: `68e19e32a255808f0ad6f844`

## 📊 Como Funciona

### Fluxo de Carregamento

1. **Inicialização:**
   - Gera arrays de 21 vídeos e 44 fotos
   - Embaralha aleatoriamente
   - Carrega primeiros 12 itens

2. **Lazy Loading:**
   - Intersection Observer monitora cada item
   - Quando item está a 100px da viewport, começa a carregar
   - Mostra skeleton loader enquanto carrega

3. **Scroll Infinito:**
   - Detecta quando usuário está a 300px do final
   - Carrega próximos 12 itens
   - Repete até não haver mais conteúdo

4. **Tracking:**
   - Facebook Pixel dispara PageView automaticamente
   - Purchase dispara apenas uma vez por pixel (localStorage)
   - UTMify captura UTMs automaticamente
   - GTM rastreia todos os eventos

## 🛡️ Proteções Implementadas

### Nível de Proteção: Básico
⚠️ **Nota:** Estas proteções são básicas e podem ser contornadas por usuários técnicos. Para proteção real, use:
- Watermarking
- DRM para vídeos
- Backend com autenticação
- CDN com assinatura de URLs

### O que está protegido:
- ✅ Botão direito desabilitado
- ✅ Seleção de texto bloqueada
- ✅ Arrastar imagens bloqueado
- ✅ Atalhos de desenvolvedor bloqueados
- ✅ Download de vídeos desabilitado nos controles nativos
- ✅ Zoom com múltiplos toques bloqueado

## 🚀 Próximos Passos (Opcional)

1. **Watermarking:**
   - Adicionar watermark nas imagens/vídeos
   - Usar biblioteca como `react-watermark` ou processar no backend

2. **DRM para Vídeos:**
   - Implementar Widevine ou PlayReady
   - Usar serviços como AWS MediaPackage

3. **Autenticação de URLs:**
   - Assinar URLs no backend
   - URLs expiram após tempo determinado

4. **Analytics Avançado:**
   - Rastrear visualizações de mídias
   - Heatmaps de interação
   - Tempo de visualização

## 📝 Notas Importantes

- As URLs do Backblaze B2 devem estar públicas ou configuradas com CORS adequado
- Os scripts de tracking funcionam automaticamente
- O lazy loading melhora significativamente a performance
- As proteções são básicas e não impedem usuários avançados

