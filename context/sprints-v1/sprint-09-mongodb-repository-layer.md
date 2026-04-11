# Sprint 09 - MongoDB e Repository Layer

## Objetivo

Migrar persistencia principal de memoria para MongoDB com Mongoose, preservando contratos de API e rastreabilidade.

## Resultado Esperado

No final da sprint, o produto entrega:

- Persistencia real em MongoDB para entidades centrais.
- Repositories desacoplados da camada de servico.
- Compatibilidade de comportamento com os fluxos existentes.

## Escopo

- Integracao NestJS + Mongoose
- Repository layer por agregado
- Migracao inicial de Requests, Features, Tasks e Sprints

## Backlog Tecnico

1. Fundacao de persistencia

- Definir estrategia de conexao por ambiente.
- Criar modulo de banco e politicas de configuracao.
- Padronizar indices e convencoes de colecao.

2. Arquitetura Repository

- Introduzir interfaces de repositorio por dominio.
- Implementar adapters Mongoose com mapeamento entity <-> document.
- Preservar regras de negocio em services.

3. Migracao incremental

- Requests: CRUD, votos, historico, soft delete.
- Product: initiatives/features e links com requests.
- Engineering: tasks/sprints e sincronizacao de status.

4. Qualidade tecnica

- Testes de integracao com Mongo real em ambiente de teste.
- Performance basica para consultas de listagem e rastreabilidade.
- Compatibilidade retroativa de payloads de API.

## Checklist de Acompanhamento

- [x] Definir contrato de conexao e configuracao por ambiente.
- [ ] Implementar repositories Mongoose para Requests.
- [ ] Implementar repositories Mongoose para Product.
- [ ] Implementar repositories Mongoose para Engineering.
- [ ] Garantir indices para filtros principais e rastreabilidade.
- [ ] Validar integridade multi-tenant no nivel de consulta.
- [ ] Executar testes de regressao dos endpoints migrados.
- [ ] Publicar documentacao de arquitetura de persistencia.

## Critérios de Aceite

- Endpoints principais funcionam com persistencia Mongo sem regressao funcional.
- Repositories estao desacoplados e cobertos por testes.
- Regras de tenant e auditoria permanecem consistentes.

## Fora de Escopo

- Migracao de historico legado entre bancos.
- Otimizacoes avancadas de particionamento/sharding.
