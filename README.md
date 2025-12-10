# Meu Privacy - Área de Membros

Uma aplicação web responsiva de área de membros inspirada na plataforma Privacy, construída com React, TypeScript e Tailwind CSS.

## 🚀 Características

- **Página de Login**: Sistema de autenticação com design moderno
- **Layout Responsivo**: Otimizado para dispositivos móveis e desktop
- **Scroll Infinito**: Carregamento automático de conteúdo ao rolar a página
- **Componentes Reutilizáveis**: Estrutura modular com componentes bem organizados
- **Galeria de Mídia**: Grid responsivo com thumbnails clicáveis (3 colunas)
- **Modal de Visualização**: Modal para visualizar imagens e vídeos em tela cheia
- **Design Moderno**: Interface dark theme idêntica ao Privacy
- **Roteamento**: Sistema de rotas protegidas com React Router

## 📦 Tecnologias

- **React 18** - Biblioteca JavaScript para construção de interfaces
- **TypeScript** - Superset do JavaScript com tipagem estática
- **Vite** - Build tool rápida e moderna
- **Tailwind CSS** - Framework CSS utility-first
- **React Router DOM** - Roteamento e navegação
- **Supabase** - Backend como serviço (banco de dados e autenticação)

## 🛠️ Instalação

1. Clone o repositório e instale as dependências:
```bash
npm install
```

2. Configure as variáveis de ambiente:
   - Crie um arquivo `.env` na raiz do projeto
   - Copie o conteúdo de `.env.example` e preencha com suas credenciais do Supabase
   - **IMPORTANTE**: Nunca commite o arquivo `.env` no Git!

3. Configure o banco de dados Supabase:
   - Acesse o arquivo `supabase-schema.sql`
   - Execute o script SQL no Supabase Dashboard (SQL Editor)
   - Veja instruções detalhadas em `SUPABASE_SETUP.md`

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

5. Abra o navegador em `http://localhost:5173`

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── Avatar.tsx      # Componente de avatar de perfil
│   ├── BioCard.tsx     # Card de biografia do criador
│   ├── Header.tsx      # Cabeçalho fixo da aplicação
│   ├── MediaGrid.tsx   # Grid de mídias
│   ├── MediaItem.tsx   # Item individual de mídia
│   └── MediaModal.tsx  # Modal para visualização de mídia
├── pages/              # Páginas da aplicação
│   ├── Login.tsx       # Página de login
│   └── Home.tsx        # Página principal (área de membros)
├── types/              # Definições de tipos TypeScript
│   └── index.ts
├── App.tsx             # Componente principal com rotas
├── main.tsx            # Ponto de entrada
└── index.css           # Estilos globais e Tailwind
```

## 🎨 Componentes

### Avatar
Componente de avatar com diferentes tamanhos (sm, md, lg, xl).

### BioCard
Exibe informações do perfil do criador: nome, username, estatísticas e biografia.

### MediaGrid
Grid responsivo que exibe uma coleção de mídias em formato de grade.

### MediaItem
Item individual de mídia com thumbnail e indicador de tipo (imagem/vídeo).

### MediaModal
Modal fullscreen para visualização de imagens e vídeos.

## 🎯 Funcionalidades Implementadas

- ✅ Página de acesso com nome e confirmação de maioridade
- ✅ Registro de primeiro acesso no Supabase
- ✅ Sistema de rotas protegidas
- ✅ Perfil do criador com avatar, bio e estatísticas
- ✅ Grid de mídias em 3 colunas
- ✅ Scroll infinito com carregamento automático
- ✅ Modal para visualização de imagens e vídeos
- ✅ Filtros de conteúdo (Todos, Fotos, Vídeos, Pagos)
- ✅ Design responsivo mobile-first
- ✅ Integração com Supabase para armazenar acessos

## 🚧 Próximos Passos

- [ ] Integração com API backend real
- [ ] Autenticação JWT completa
- [ ] Sistema de likes e comentários
- [ ] Upload de mídias
- [ ] Notificações em tempo real
- [ ] Sistema de assinaturas

## 📝 Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria build de produção
- `npm run preview` - Preview do build de produção
- `npm run lint` - Executa o linter

## 📄 Licença

Este projeto é privado e destinado apenas para uso interno.