# Script para fazer deploy do projeto para o GitHub
# Execute este script apos garantir que o Git esta instalado e funcionando

Write-Host "Iniciando deploy para GitHub..." -ForegroundColor Green

# Verificar se o Git esta disponivel
try {
    $gitVersion = git --version
    Write-Host "Git encontrado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "Erro: Git nao encontrado!" -ForegroundColor Red
    Write-Host "Por favor, instale o Git e feche/reabra o terminal." -ForegroundColor Yellow
    Write-Host "Download: https://git-scm.com/download/win" -ForegroundColor Cyan
    exit 1
}

# Verificar se ja existe um repositorio Git
if (Test-Path .git) {
    Write-Host "Repositorio Git ja existe" -ForegroundColor Yellow
} else {
    Write-Host "Inicializando repositorio Git..." -ForegroundColor Cyan
    git init
}

# Adicionar todos os arquivos
Write-Host "Adicionando arquivos ao staging..." -ForegroundColor Cyan
git add .

# Verificar se ha mudancas para commitar
$status = git status --porcelain
if ($status) {
    Write-Host "Criando commit inicial..." -ForegroundColor Cyan
    git commit -m "feat: projeto Privacy - area de membros com React, TypeScript e Supabase`n`n- Sistema de login com registro de primeiro acesso`n- Integracao com tracking (GTM, Facebook Pixel, UTMify)`n- Grid de midias com scroll infinito`n- Modal para visualizacao de conteudo`n- Design responsivo dark theme`n- Integracao com Supabase para armazenamento de dados"
    
    Write-Host "Commit criado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "Nenhuma mudanca para commitar" -ForegroundColor Yellow
}

# Verificar se ja existe um remote
$remote = git remote -v
if ($remote) {
    Write-Host "Remote ja configurado:" -ForegroundColor Yellow
    Write-Host $remote
} else {
    Write-Host ""
    Write-Host "Proximos passos:" -ForegroundColor Cyan
    Write-Host "1. Crie um repositorio no GitHub (https://github.com/new)" -ForegroundColor White
    Write-Host "2. Execute os seguintes comandos:" -ForegroundColor White
    Write-Host ""
    Write-Host "   git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git" -ForegroundColor Yellow
    Write-Host "   git branch -M main" -ForegroundColor Yellow
    Write-Host "   git push -u origin main" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Processo concluido!" -ForegroundColor Green

