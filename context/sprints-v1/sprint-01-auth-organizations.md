# Sprint 01 - Auth e Organizations

## Objetivo

Estabelecer a fundação da plataforma com autenticação segura, multi-tenant básico e controle de acesso por papéis.

## Resultado Esperado

No final da sprint, um usuário consegue:

- Fazer login com Google OAuth.
- Receber JWT para acessar APIs.
- Pertencer a uma organização e time.
- Ter permissões controladas por RBAC (`Admin`, `Editor`, `Viewer`).

## Escopo

- `AuthModule`
- `UsersModule`
- `OrganizationsModule`
- `TeamsModule` (versão inicial)

## Backlog Técnico

1. Modelagem inicial

- Criar modelos/coleções para `User`, `Organization`, `Team` e `Membership`.
- Garantir `organizationId` em entidades multi-tenant.

2. Autenticação

- Implementar login com Google OAuth.
- Gerar JWT (access token).
- Implementar guard de autenticação.

3. Autorização

- Implementar RBAC com decorators + guard.
- Restringir endpoints por papel (`Admin`, `Editor`, `Viewer`).

4. APIs mínimas

- `POST /auth/google`
- `GET /auth/me`
- `POST /organizations`
- `GET /organizations/me`
- `POST /teams`
- `GET /teams`

5. Qualidade técnica

- DTOs com `class-validator`.
- Filtro global de exceções.
- Swagger com exemplos de autenticação e payloads.

## Ajustes pelos Princípios Core

- Full Traceability:
  - Definir padrão mínimo de auditoria e rastreabilidade nas entidades base (`createdBy`, `updatedBy`, `organizationId`, timestamps).
- Automatic Feedback Loop:
  - Criar infraestrutura mínima de eventos de domínio para suportar propagação automática nas próximas sprints.
- Unstructured to Structured Input:
  - Definir contrato base de metadados de origem (`sourceType`, `sourceRef`, `ingestedAt`) para uso futuro em requests.

## Checklist de Acompanhamento

- [x] Modelar `User`, `Organization`, `Team` e `Membership` com `organizationId`.
- [x] Implementar login com Google OAuth.
- [x] Gerar JWT e proteger rotas com autenticação.
- [x] Implementar RBAC para `Admin`, `Editor` e `Viewer`.
- [x] Publicar endpoints mínimos de auth, organizations e teams.
- [ ] Definir padrão de auditoria e rastreabilidade nas entidades base.
- [x] Implementar infraestrutura mínima de eventos de domínio (event bus/outbox).
- [x] Documentar endpoints no Swagger com exemplos.
- [x] Concluir testes unitários de autenticação e autorização.
- [x] Concluir testes de integração de login e acesso protegido.
- [ ] Validar critérios de aceite em review da sprint.

## Critérios de Aceite

- Usuário autenticado recebe JWT válido e acessa endpoint protegido.
- Usuário sem role suficiente recebe `403`.
- Dados sempre isolados por `organizationId`.
- Endpoints documentados no Swagger.
- Infraestrutura de eventos de domínio preparada para as próximas sprints.

## Testes Obrigatórios

- Unitários:
  - Serviço de autenticação (token, validação de usuário).
  - Serviço de autorização (resolução de papéis).
- Integração:
  - Fluxo `login -> endpoint protegido`.
  - Tentativa de acesso sem token e com role incorreta.

## Fora de Escopo

- Convites avançados por e-mail.
- SSO corporativo além de Google OAuth.
- Gerenciamento avançado de permissões customizadas.

## Dependência para Próxima Sprint

Base de segurança e organização pronta para iniciar CRUD de solicitações (`RequestsModule`).
