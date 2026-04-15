# Sistema de Logging - Guia Rápido

## O que foi implementado

✅ **Winston** como biblioteca de logging consolidada  
✅ Log de todas as requisições HTTP (método, URL, status, duração)  
✅ Log estruturado de erros com stack traces  
✅ Configuração pronta para migração ao Datadog  
✅ Logs coloridos em desenvolvimento, JSON em produção

## Como usar nos seus serviços

```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MeuService {
  private readonly logger = new Logger(MeuService.name);

  async minhaFuncao() {
    this.logger.log('Iniciando operação');

    this.logger.log({
      message: 'Operação concluída',
      userId: 'abc123',
      itemsProcessed: 10,
    });
  }
}
```

## Variáveis de ambiente

```bash
# Nível de log (error | warn | info | debug)
LOG_LEVEL=info

# Para Datadog (quando migrar)
DD_API_KEY=sua_chave_api
DD_SERVICE=fau-backend
DD_ENV=production
```

## Migração para Datadog

Quando estiver pronto para usar o Datadog:

```bash
# 1. Instalar transport do Datadog
npm install @datadog/datadog-winston

# 2. Descomentar a configuração em src/common/logging/logging.module.ts
# 3. Configurar variáveis DD_API_KEY e DD_SERVICE
# 4. Reiniciar a aplicação
```

Documentação completa em: [docs/LOGGING.md](docs/LOGGING.md)

## O que é logado automaticamente

- ✅ Todas as requisições HTTP (entrada e saída)
- ✅ Erros 4xx como warnings
- ✅ Erros 5xx com stack trace completo
- ✅ Exceções não tratadas
- ✅ Duração de cada requisição
- ✅ ID do usuário (quando autenticado)

## Exemplos de logs

### Desenvolvimento

```
[2026-04-15T10:30:45.123Z] info: → GET /api/requests
[2026-04-15T10:30:45.156Z] info: ← GET /api/requests 200 33ms
```

### Produção (JSON)

```json
{
  "level": "info",
  "message": "← GET /api/requests 200 33ms",
  "timestamp": "2026-04-15T10:30:45.156Z",
  "method": "GET",
  "url": "/api/requests",
  "statusCode": 200,
  "duration": 33,
  "userId": "user-123"
}
```
