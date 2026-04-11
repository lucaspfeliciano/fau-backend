# Sprint 12 - Intelligent Deduplication v1

## Objetivo

Evoluir deduplicacao para similaridade semantica com suporte a sugestao, auto-merge e preservacao de contexto.

Status backend: concluido.

## Resultado Esperado

No final da sprint, o produto entrega:

- Sugestao de duplicidade em tempo de criacao/importacao.
- Consolidacao de votos e vinculos quando houver merge.
- Trilhas de auditoria para decisoes automáticas e manuais.

## Escopo

- Similaridade semantica
- Politica de threshold
- Fluxo de merge assistido

## Backlog Tecnico

1. Similaridade semantica

- Definir estrategia inicial (heuristica + embeddings opcionais).
- Calcular score de similaridade por contexto de tenant.
- Expor candidatos similares em APIs de criacao/importacao.

2. Politicas de decisao

- Threshold para sugestao, auto-link e auto-merge.
- Fallback para revisao humana em baixa confianca.
- Regras para evitar falso positivo em massa.

3. Operacao de merge

- Consolidar votos, clientes, empresas e evidencias.
- Manter referencia cruzada entre item original e consolidado.
- Preservar historico de decisoes para auditoria.

4. Qualidade

- Metricas: precision aproximada, taxa de merge, taxa de reversao.
- Ferramentas de revisão para CS/Product.
- Testes de regressao com dataset sintético.

## Checklist de Acompanhamento

- [x] Definir algoritmo inicial de similaridade semantica.
- [x] Implementar sugestao de duplicidade em tempo real.
- [x] Implementar auto-link e auto-merge por threshold.
- [x] Preservar contexto e historico em merges.
- [x] Expor metricas operacionais de deduplicacao.
- [x] Validar com cenarios de alta ambiguidade.

## Critérios de Aceite

- Plataforma sugere e consolida duplicidades com ganho real de qualidade.
- Contexto original e rastreabilidade sao preservados apos merge.
- Taxa de falso positivo fica em limite acordado com produto.

## Fora de Escopo

- Clusterizacao global offline em larga escala.
- Curadoria automatica sem supervisao humana.
