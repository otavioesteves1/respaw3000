# RESPAW3000 — Proxy RubinOT (Vercel)

Função serverless que busca o **level** de um personagem no RubinOT (que fica atrás
do Cloudflare) via uma API de scraping, e devolve JSON com CORS liberado — pro
RESPAW3000 (site estático) conseguir consumir.

```
GET https://SEU-PROJETO.vercel.app/api/rubinot?name=old%20toze
→ { "ok": true, "exists": true, "name": "old toze", "level": 1120 }
```

## Passo a passo (tudo grátis, ~10 min)

### 1) Conta na API de scraping (escolha UMA)
- **ScrapingAnt** (recomendado — free 10k créditos/mês): https://scrapingant.com → cadastre → copie a **API Key**.
- ou **Scrape.do** (free ~1k/mês): https://scrape.do → copie o **token**.

### 2) Deploy no Vercel
1. Crie conta em https://vercel.com (login com o GitHub).
2. **New Project** → importe o repositório `respaw3000`.
3. Em **Root Directory**, clique *Edit* e selecione a pasta **`rubinot-proxy`**.
   (Isso faz o Vercel deployar só o proxy, não o site.)
4. Em **Environment Variables**, adicione:
   - `SCRAPINGANT_KEY` = sua chave do ScrapingAnt
   - *(ou)* `SCRAPEDO_TOKEN` = seu token do Scrape.do
5. **Deploy**. No fim o Vercel te dá uma URL tipo `https://respaw3000-xxxx.vercel.app`.

### 3) Teste
Abra no navegador (troque pela sua URL e pelo seu char):
```
https://SEU-PROJETO.vercel.app/api/rubinot?name=old%20toze
```
Deve voltar o JSON com o `level`. Se o número vier errado/nulo, rode com `&debug=1`
que ele devolve um trecho do HTML — me manda esse trecho que eu afino o parser.

### 4) Cole a URL no RESPAW
No RESPAW3000, cole a URL do proxy no campo de configuração do RubinOT (perfil).
Pronto — daí ele puxa o level sozinho.

## Notas
- **Custo:** $0 no free tier pra uso pessoal (poucas checagens/dia).
- **Cloudflare pode mudar:** se um dia parar de funcionar, geralmente é só a API de
  scraping precisar de outro modo (ex.: trocar `proxy_type`); dá pra ajustar aqui.
- O parser do "Nível" está em `api/rubinot.js` (função `parseLevel`).
