# Script para configurar variáveis de ambiente na Vercel via CLI
# Execute este script se tiver a Vercel CLI instalada

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configuracao de Variaveis na Vercel" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se Vercel CLI está instalado
Write-Host "Verificando Vercel CLI..." -ForegroundColor Yellow
try {
    $vercelVersion = vercel --version 2>&1
    Write-Host "✅ Vercel CLI encontrado: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Vercel CLI nao encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Para instalar, execute:" -ForegroundColor Yellow
    Write-Host "  npm install -g vercel" -ForegroundColor White
    Write-Host ""
    Write-Host "Ou configure manualmente pelo Dashboard:" -ForegroundColor Yellow
    Write-Host "  https://vercel.com/dashboard" -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Host "Lendo credenciais do arquivo .env..." -ForegroundColor Yellow

# Ler variáveis do .env
$envFile = ".env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile
    $supabaseUrl = ""
    $supabaseKey = ""
    
    foreach ($line in $envContent) {
        if ($line -match "^VITE_SUPABASE_URL=(.+)$") {
            $supabaseUrl = $matches[1].Trim()
        }
        if ($line -match "^VITE_SUPABASE_ANON_KEY=(.+)$") {
            $supabaseKey = $matches[1].Trim()
        }
    }
    
    if ($supabaseUrl -and $supabaseKey) {
        Write-Host "✅ Credenciais encontradas no .env" -ForegroundColor Green
        Write-Host ""
        Write-Host "Para adicionar as variaveis na Vercel, execute:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "1. Fazer login:" -ForegroundColor White
        Write-Host "   vercel login" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "2. Adicionar VITE_SUPABASE_URL:" -ForegroundColor White
        Write-Host "   vercel env add VITE_SUPABASE_URL production preview development" -ForegroundColor Cyan
        Write-Host "   (Quando pedir, cole: $supabaseUrl)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "3. Adicionar VITE_SUPABASE_ANON_KEY:" -ForegroundColor White
        Write-Host "   vercel env add VITE_SUPABASE_ANON_KEY production preview development" -ForegroundColor Cyan
        Write-Host "   (Quando pedir, cole: $supabaseKey)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "4. Fazer deploy:" -ForegroundColor White
        Write-Host "   vercel --prod" -ForegroundColor Cyan
        Write-Host ""
    } else {
        Write-Host "❌ Nao foi possivel ler as credenciais do .env" -ForegroundColor Red
        Write-Host "Verifique se o arquivo .env existe e esta configurado corretamente" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Arquivo .env nao encontrado!" -ForegroundColor Red
    Write-Host "Crie o arquivo .env primeiro com as credenciais do Supabase" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Ou configure manualmente pelo Dashboard:" -ForegroundColor Yellow
Write-Host "https://vercel.com/dashboard" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

