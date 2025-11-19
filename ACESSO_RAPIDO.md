# 🚀 Como Acessar o Projeto

## Servidor está rodando!

O servidor de desenvolvimento está ativo na porta **5173**.

## 📍 Acesse manualmente:

### Opção 1: Local
```
http://localhost:5173
```

### Opção 2: IP da Rede Local
```
http://192.168.100.17:5173
```
(Substitua pelo IP da sua máquina se diferente)

## 🔍 Se não abrir automaticamente:

1. **Abra seu navegador** (Chrome, Firefox, Edge, etc.)
2. **Digite na barra de endereços:**
   ```
   http://localhost:5173
   ```
3. **Pressione Enter**

## ⚠️ Problemas Comuns:

### Erro: "Não é possível acessar este site"
- Verifique se o servidor está rodando
- Tente `http://127.0.0.1:5173` em vez de `localhost`
- Verifique se a porta 5173 não está bloqueada pelo firewall

### Página em branco
- Abra o Console do navegador (F12)
- Verifique se há erros em vermelho
- Recarregue a página (Ctrl+R ou F5)

### Erro de CORS ou mídias não carregam
- As URLs do Backblaze B2 precisam ter CORS configurado
- Verifique se os arquivos existem nas URLs configuradas

## 🛠️ Comandos Úteis:

### Parar o servidor:
```bash
# No terminal, pressione Ctrl+C
```

### Reiniciar o servidor:
```bash
npm run dev
```

### Verificar se está rodando:
```bash
netstat -ano | findstr ":5173"
```

## 📝 Checklist:

- [ ] Servidor rodando (porta 5173 ativa)
- [ ] Navegador aberto
- [ ] URL correta: `http://localhost:5173`
- [ ] Sem erros no console (F12)

