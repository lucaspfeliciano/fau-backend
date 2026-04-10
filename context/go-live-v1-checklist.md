# Go-Live v1 Checklist

## Deployment Checklist

- [ ] Confirmar versao de release (tag + changelog)
- [ ] Validar build limpo em CI (`npm run build`)
- [ ] Validar suite e2e (`npm run test:e2e`)
- [ ] Validar ambiente com `.env` completo e segredos rotacionados
- [ ] Executar smoke test em homologacao
- [ ] Publicar release notes para CS/Sales/Engineering
- [ ] Habilitar monitoramento basico (logs de erro e alertas de disponibilidade)

## Rollback Checklist

- [ ] Definir versao anterior segura para rollback
- [ ] Preservar snapshot de configuracao atual
- [ ] Reverter para build/tag anterior
- [ ] Revalidar endpoints criticos (`/auth/me`, `/requests`, `/roadmap/overview`)
- [ ] Comunicar rollback para stakeholders com impacto e ETA
- [ ] Abrir incidente/postmortem com causa raiz e acao corretiva

## Observability Baseline

- [ ] Taxa de erros 5xx monitorada
- [ ] Latencia de endpoints criticos monitorada
- [ ] Eventos de negocio principais auditaveis (`request.status_changed`, `product.feature_status_changed`, `engineering.sprint_status_changed`, `release.created`)
