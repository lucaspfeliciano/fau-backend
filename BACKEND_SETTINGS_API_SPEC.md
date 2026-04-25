# Backend Settings API - Especificação Atual

## ✅ STATUS: ROTAS IMPLEMENTADAS

As rotas de configurações públicas do portal estão implementadas no `PublicPortalController`.

**Controller:** `src/public-portal/public-portal.controller.ts`  
**Service:** `src/public-portal/public-portal.service.ts`  
**Base Path:** `@Controller(['public', 'api/public'])`

---

## 📋 Rota 1: GET Settings (Público - Sem Autenticação)

### Endpoint

```
GET /api/public/workspaces/:workspaceSlug/settings
```

### Descrição

Retorna as configurações públicas do portal de um workspace. Esta rota **NÃO exige autenticação** e é acessível publicamente.

### Parâmetros

- `workspaceSlug` (path): Slug único do workspace (ex: `lucas-organization`)

### Response 200 (Success)

```json
{
  "workspaceSlug": "lucas-organization",
  "publicPortalEnabled": true,
  "publicRoadmapEnabled": true,
  "publicChangelogEnabled": true,
  "widgetApiKey": "fau_widget_abc123xyz"
}
```

### Response 404 (Not Found)

```json
{
  "message": "Workspace not found.",
  "error": "Not Found",
  "statusCode": 404
}
```

### Observações

- ⚠️ **ATENÇÃO:** Atualmente a API **retorna o `widgetApiKey`** publicamente (sem autenticação)
- Usado para validar se o portal público está habilitado antes de renderizar páginas
- Não possui wrapper `"settings"` - retorna o objeto diretamente

### Campos Retornados

| Campo                    | Tipo    | Descrição                         |
| ------------------------ | ------- | --------------------------------- |
| `workspaceSlug`          | string  | Slug único da organização         |
| `publicPortalEnabled`    | boolean | Portal público habilitado         |
| `publicRoadmapEnabled`   | boolean | Roadmap público habilitado        |
| `publicChangelogEnabled` | boolean | Changelog público habilitado      |
| `widgetApiKey`           | string? | Chave de API do widget (opcional) |

---

## 📋 Rota 2: PATCH Settings (Público - Sem Autenticação)

### Endpoint

```
PATCH /api/public/workspaces/:workspaceSlug/settings
```

### Descrição

Atualiza as configurações do portal público de um workspace.

⚠️ **ATENÇÃO:** Atualmente esta rota **NÃO exige autenticação** - qualquer pessoa pode alterar as configurações.

### Headers

- `Content-Type: application/json`

### Parâmetros

- `workspaceSlug` (path): Slug do workspace (ex: `lucas-organization`)

### Request Body

```json
{
  "publicPortalEnabled": true,
  "publicRoadmapEnabled": true,
  "publicChangelogEnabled": false,
  "rotateWidgetApiKey": false
}
```

### Campos do Payload

| Campo                    | Tipo    | Obrigatório | Descrição                                   |
| ------------------------ | ------- | ----------- | ------------------------------------------- |
| `publicPortalEnabled`    | boolean | Não         | Habilitar/desabilitar portal público        |
| `publicRoadmapEnabled`   | boolean | Não         | Habilitar/desabilitar roadmap público       |
| `publicChangelogEnabled` | boolean | Não         | Habilitar/desabilitar changelog público     |
| `rotateWidgetApiKey`     | boolean | Não         | Se `true`, gera nova chave de API do widget |

**Observação:** Pelo menos um campo deve ser fornecido.

### Response 200 (Success)

```json
{
  "workspaceSlug": "lucas-organization",
  "publicPortalEnabled": true,
  "publicRoadmapEnabled": true,
  "publicChangelogEnabled": false,
  "widgetApiKey": "fau_widget_new_key_generated"
}
```

### Response 404 (Not Found)

```json
{
  "message": "Workspace not found.",
  "error": "Not Found",
  "statusCode": 404
}
```

### Response 400 (Validation Error)

```json
{
  "message": "At least one field must be provided for update.",
  "error": "Bad Request",
  "statusCode": 400
}
```

### Observações

- ⚠️ **SEGURANÇA:** Esta rota deveria ser protegida com autenticação de admin
- Se `rotateWidgetApiKey: true`, o service gera uma nova chave e atualiza o banco
- Não há validação de permissões - qualquer requisição pode modificar os settings

---

## 🗂️ Modelo de Dados (MongoDB)

### Collection: `organizations`

**Schema:** `src/organizations/repositories/organization.schema.ts`

```typescript
{
  id: string;                      // UUID único
  name: string;                    // Nome da organização
  slug: string;                    // Slug único (usado na URL)
  widgetApiKey?: string;           // Chave de API do widget (opcional)
  publicPortalEnabled: boolean;    // Portal público habilitado (default: false)
  publicRoadmapEnabled: boolean;   // Roadmap público habilitado (default: false)
  publicChangelogEnabled: boolean; // Changelog público habilitado (default: false)
  createdBy: string;               // ID do usuário criador
  createdAt: string;               // Data de criação (ISO 8601)
  updatedAt: string;               // Data de atualização (ISO 8601)
}
```

### Índices

```javascript
{
  slug: 1;
} // unique
```

---

## 🔄 Fluxo de Requisições

### Frontend (Next.js) → Backend (NestJS)

**Porta Frontend:** 3001  
**Porta Backend:** 3000

#### 1. Usuário acessa portal público:

```
Browser     → GET http://localhost:3001/api/public/workspaces/lucas-organization/settings
Next.js     → GET http://localhost:3000/api/public/workspaces/lucas-organization/settings
Backend     → Retorna settings completos (incluindo widgetApiKey)
```

#### 2. Admin atualiza configurações:

```
Browser     → PATCH http://localhost:3001/api/public/workspaces/lucas-organization/settings
              Body: { publicPortalEnabled: true }
Next.js     → PATCH http://localhost:3000/api/public/workspaces/lucas-organization/settings
Backend     → Atualiza → Retorna settings atualizados
```

---

## ⚠️ Problemas de Segurança Identificados

### 🔴 Crítico

1. **Rota PATCH sem autenticação**
   - Qualquer pessoa pode desabilitar o portal público
   - Qualquer pessoa pode rotacionar a API key do widget
   - **Recomendação:** Adicionar `@UseGuards(JwtAuthGuard, RolesGuard)` e validar permissão de admin

2. **widgetApiKey exposto publicamente**
   - A chave de API é retornada mesmo sem autenticação
   - **Recomendação:** Retornar `widgetApiKey` apenas se usuário autenticado for admin

### 🟡 Média

3. **Faltam campos na entidade Organization**
   - Não há campo `workspaceName` (usa o campo `name` da organização)
   - Não há campo `logoUrl` para customização do portal
   - Não há campo `subtitle` para descrição do portal
   - **Recomendação:** Adicionar campos opcionais ao schema se necessário

---

## ✅ Checklist de Melhorias Sugeridas

- [ ] Adicionar autenticação JWT na rota PATCH
- [ ] Validar permissão de admin para PATCH
- [ ] Ocultar `widgetApiKey` para usuários não autenticados no GET
- [ ] Adicionar campos `logoUrl` e `subtitle` ao schema Organization (se necessário)
- [ ] Adicionar testes unitários para o service
- [ ] Adicionar testes de integração e2e
- [ ] Documentar rotas no Swagger com exemplos

---

## 🧪 Testando as Rotas

### Via Postman/Thunder Client

#### GET Settings

```http
GET http://localhost:3000/api/public/workspaces/lucas-organization/settings
```

#### PATCH Settings

```http
PATCH http://localhost:3000/api/public/workspaces/lucas-organization/settings
Content-Type: application/json

{
  "publicPortalEnabled": true,
  "publicRoadmapEnabled": true,
  "publicChangelogEnabled": true
}
```

#### PATCH Settings (gerar nova API key)

```http
PATCH http://localhost:3000/api/public/workspaces/lucas-organization/settings
Content-Type: application/json

{
  "rotateWidgetApiKey": true
}
```

---

## 📝 Notas Importantes para o Frontend

1. **URL completa:** Sempre usar `/api/public/workspaces/:slug/settings` (não apenas `/workspaces/:slug/settings`)
2. **Sem wrapper:** A resposta não tem wrapper `{ settings: {...} }`, retorna o objeto direto
3. **Campos disponíveis:** Apenas os 5 campos listados acima (não há `workspaceName`, `logoUrl`, `subtitle`, `widgetEnabled`)
4. **Workspace slug obrigatório:** O `:workspaceSlug` na URL é essencial para identificar a organização
5. **CORS:** Backend aceita requisições do frontend se configurado em `CORS_ORIGIN` no `.env`

---

## 📚 Arquivos Relacionados

- `src/public-portal/public-portal.controller.ts` - Controller com as rotas
- `src/public-portal/public-portal.service.ts` - Business logic
- `src/organizations/organizations.service.ts` - Service de organizações
- `src/organizations/repositories/organization.schema.ts` - Schema MongoDB
- `src/public-portal/dto/update-public-workspace-settings.schema.ts` - Validação Zod do PATCH
