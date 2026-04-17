/**
 * Tipos de nodes disponíveis no canvas do Playground.
 *
 * Tipos estruturados (criados via botões):
 * - note: Notas estruturadas
 * - problem: Problemas identificados
 * - solution: Soluções propostas
 * - insight: Insights descobertos
 * - evidence: Evidências com assets anexados
 *
 * Tipos de desenho/texto livre (criados via ferramentas):
 * - text: Texto livre criado pela ferramenta Text (atalho: T)
 * - shape: Formas/desenhos criados pela ferramenta Draw (atalho: P)
 */
export enum PlaygroundNodeType {
  Note = 'note',
  Problem = 'problem',
  Solution = 'solution',
  Insight = 'insight',
  Evidence = 'evidence',
  Text = 'text',
  Shape = 'shape',
}

/**
 * Lista de todos os tipos válidos de nodes para validação.
 */
export const PLAYGROUND_NODE_TYPES = Object.values(PlaygroundNodeType);
