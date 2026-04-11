# Sprint 11 - Smart Prioritization Engine

## Objetivo

Implementar motor de priorizacao orientado a impacto de negocio, com score dinamico e explicavel.

## Resultado Esperado

No final da sprint, o produto entrega:

- Score composto por sinais de produto, receita e risco.
- Ranking de requests e features com explicacao de fatores.
- Atualizacao automatica do score com eventos de negocio.

## Escopo

- Priorizacao de requests e features
- Configuracao de pesos por organizacao
- Transparencia de score

## Backlog Tecnico

1. Modelo de score

- Definir formula base ponderada com pesos configuraveis.
- Entradas minimas: votos, receita, tier, churn risk, tags estrategicas.
- Definir escala e normalizacao dos fatores.

2. Cálculo e persistencia

- Persistir score e breakdown por entidade.
- Recalcular score em eventos relevantes.
- Registrar historico de mudanca de prioridade.

3. Exposicao de API

- Endpoint de ranking para Product.
- Endpoint de explicabilidade do score por request/feature.
- Filtros por impacto, urgencia e segmento.

4. Governanca

- Definir ownership de pesos e revisao periodica.
- Limites para evitar gaming de score.
- Validacoes de dados de entrada obrigatorios.

## Checklist de Acompanhamento

- [ ] Definir formula inicial e pesos default.
- [ ] Implementar score para requests.
- [ ] Implementar score para features.
- [ ] Expor ranking e explicabilidade via API.
- [ ] Garantir recalculo orientado a eventos.
- [ ] Validar consistencia em testes de regressao.

## Critérios de Aceite

- Product consegue ordenar backlog por score dinamico.
- Cada score possui justificativa rastreavel por fator.
- Recalculos ocorrem automaticamente apos mudancas de contexto.

## Fora de Escopo

- Modelos de machine learning para priorizacao.
- Otimizacao multi-objetivo com simulacao avancada.
