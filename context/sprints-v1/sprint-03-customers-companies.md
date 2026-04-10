# Sprint 03 - Customers e Companies

## Objetivo

Adicionar contexto de negócio às solicitações com cadastro e vínculo de clientes e empresas.

## Resultado Esperado

No final da sprint, o time consegue:

- Gerenciar clientes e empresas por organização.
- Relacionar solicitações a clientes/empresas.
- Consultar impacto potencial por empresa (receita opcional).

## Escopo

- `CustomersModule`
- `CompaniesModule`
- Integração com `RequestsModule`

## Backlog Técnico

1. Modelagem

- Criar entidade `Company`:
  - `name`, `revenue?`, `organizationId`.
- Criar entidade `Customer`:
  - `name`, `email`, `companyId`, `organizationId`.
- Garantir índices para busca por `email` e `name`.

2. APIs de empresas

- `POST /companies`
- `GET /companies`
- `GET /companies/:id`
- `PATCH /companies/:id`

3. APIs de clientes

- `POST /customers`
- `GET /customers`
- `GET /customers/:id`
- `PATCH /customers/:id`

4. Vínculo com requests

- `POST /requests/:id/customers/:customerId`
- `DELETE /requests/:id/customers/:customerId`
- `POST /requests/:id/companies/:companyId`
- `DELETE /requests/:id/companies/:companyId`

5. Qualidade técnica

- Validação de vínculo entre tenant e entidades relacionadas.
- Swagger com exemplos de associação request-customer-company.

## Ajustes pelos Princípios Core

- Full Traceability:
  - Garantir consulta clara das relações entre request, customer e company.
- Automatic Feedback Loop:
  - Emitir eventos quando houver vínculo/desvínculo entre requests e customers/companies.
- Unstructured to Structured Input:
  - Preparar regra de matching inicial por e-mail/domínio para facilitar associação de entradas importadas.

## Checklist de Acompanhamento

- [x] Modelar `Company` e `Customer` com índices necessários.
- [x] Implementar APIs de empresas (create/read/update).
- [x] Implementar APIs de clientes (create/read/update).
- [x] Implementar endpoints de vínculo entre request, customer e company.
- [x] Garantir isolamento multi-tenant nas associações.
- [x] Implementar consultas de rastreabilidade request -> customers/companies.
- [x] Emitir eventos de domínio em vínculo e desvínculo de entidades.
- [ ] Preparar matching inicial por e-mail/domínio para entradas importadas.
- [x] Documentar exemplos de associação no Swagger.
- [x] Concluir testes unitários das regras de vínculo.
- [x] Concluir testes de integração do fluxo empresa -> cliente -> request.
- [ ] Validar critérios de aceite em review da sprint.

## Critérios de Aceite

- Não é possível associar cliente/empresa de outra organização.
- Relações são refletidas corretamente nas consultas de requests.
- APIs de cliente/empresa cobrem criação, leitura e edição.
- Relações request-customer-company são consultáveis de forma direta por API.

## Testes Obrigatórios

- Unitários:
  - Regras de vínculo entre request/customer/company.
- Integração:
  - Fluxo completo: criar empresa -> criar cliente -> associar request.
  - Testes de isolamento multi-tenant.

## Fora de Escopo

- Importação massiva de clientes por CSV.
- Enriquecimento automático por ferramentas externas.

## Dependência para Próxima Sprint

Com contexto de clientes e empresas pronto, a camada de produto pode priorizar iniciativas e features por impacto.
