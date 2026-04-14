# 🔍 Buscador de Vagas — William Carmo

Busca vagas reais via **Google Jobs** e analisa compatibilidade com IA (Claude).

## Como funciona
1. Frontend faz chamada para `/api/jobs`
2. Backend busca vagas no Google Jobs via SerpApi
3. Claude analisa cada vaga e retorna score de compatibilidade
4. Resultados ordenados do maior para menor match

## Deploy no Vercel

### 1. Variáveis de ambiente necessárias
No painel do Vercel, adicione em **Settings → Environment Variables**:

| Variável | Onde obter |
|---|---|
| `SERP_API_KEY` | https://serpapi.com → free plan (100 buscas/mês) |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com |

### 2. Deploy
```bash
# Via Vercel CLI
npm i -g vercel
vercel --prod
```
Ou conecte o repositório GitHub no painel do Vercel.

## Fontes de vagas
- **Google Jobs** indexa: LinkedIn, Indeed, Glassdoor, Gupy, InfoJobs, Catho, e centenas de outros sites de vagas globalmente.
