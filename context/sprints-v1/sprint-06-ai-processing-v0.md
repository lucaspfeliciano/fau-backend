# Sprint 06 - AI Processing (v0)

## Objetivo

Entregar versão inicial do processamento de notas de reunião para extrair solicitações, bugs e dores de cliente.

## Resultado Esperado

No final da sprint, CS/Sales consegue:

- Enviar notas brutas de reunião.
- Receber itens extraídos e classificados.
- Reutilizar request existente (incrementando votos) ou criar nova request.

## Escopo

- `AIProcessingModule`
- Integração com `RequestsModule`

## Backlog Técnico

1. Pipeline de processamento

- Endpoint para ingestão de notas:
  - `POST /ai/requests/import-notes`
- Etapas:
  - Normalização de texto.
  - Extração de itens (feature request, bug, pain point).
  - Tentativa de correspondência com requests existentes.

2. Regras de deduplicação v0

- Estratégia inicial por similaridade textual simples + mesma organização.
- Se similaridade acima do limiar:
  - Incrementar `votes` da request existente.
- Caso contrário:
  - Criar nova request com origem `ai-import`.

3. Governança

- Registrar fonte da nota, usuário e timestamp.
- Retornar nível de confiança por item extraído.
- Marcar itens com baixa confiança para revisão humana.

4. Qualidade técnica

- Timeouts e tratamento de falha de provedor de IA.
- Logs de rastreio por processamento.
- Swagger com exemplos de payload de notas.

## Ajustes pelos Princípios Core

- Full Traceability:
  - Persistir evidência de origem (tipo de fonte, identificador externo e trecho original).
- Automatic Feedback Loop:
  - Emitir eventos de resultado de processamento para requests criadas/deduplicadas.
- Unstructured to Structured Input:
  - Suportar ingestão de meeting notes, sales conversations e Slack messages.

## Checklist de Acompanhamento

- [x] Implementar endpoint de importação de notas (`POST /ai/requests/import-notes`).
- [x] Implementar pipeline de normalização e extração de itens.
- [x] Implementar deduplicação v0 por similaridade textual.
- [x] Implementar incremento de votos para requests similares.
- [x] Persistir origem, usuário, timestamp e nível de confiança.
- [x] Suportar múltiplos tipos de fonte (`meeting-notes`, `sales-conversation`, `slack-message`).
- [x] Persistir trecho de evidência para auditoria da extração.
- [x] Emitir eventos de resultado (request criada, request deduplicada, voto incrementado).
- [x] Implementar tratamento de timeout/falhas e logs de processamento.
- [x] Documentar payloads e respostas no Swagger.
- [x] Concluir testes unitários de parser e deduplicação.
- [x] Concluir testes de integração para cenários de similaridade alta e baixa.
- [x] Validar critérios de aceite em review da sprint.

## Critérios de Aceite

- Notas com múltiplos pontos geram múltiplos itens processáveis.
- Sistema não cruza dados entre organizações.
- Deduplicação v0 evita criação excessiva de duplicatas óbvias.
- Entradas de diferentes fontes não estruturadas são convertidas para requests estruturadas.
- Cada item extraído mantém vínculo auditável com sua origem.

## Testes Obrigatórios

- Unitários:
  - Parser/extrator de itens.
  - Regra de deduplicação e incremento de voto.
- Integração:
  - Fluxo fim-a-fim de importação de nota.
  - Cenários com similaridade alta e baixa.

## Fora de Escopo

- Treinamento de modelo próprio.
- Integrações diretas com Fireflies/Zoom/Meet.

## Dependência para Próxima Sprint

Com IA básica funcional, integrações externas passam a alimentar e distribuir dados automaticamente.
