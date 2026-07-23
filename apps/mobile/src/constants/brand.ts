/**
 * Termos da marca centralizados. A interface SEMPRE usa estes termos — nunca
 * "criatura"/"companheiro"/"pet" soltos. Assim o nome coletivo pode mudar sem
 * tocar dezenas de telas.
 *
 * Origem do nome: os Adaris são companheiros que despertam e evoluem através da
 * disciplina, da constância e das ações reais de seus Exploradores.
 */
export const BRAND = {
  appName: 'Ad Sidera',
  tagline: 'Rumo às estrelas através da disciplina diária.',
  companionSingular: 'Adari',
  companionPlural: 'Adaris',
  userTitle: 'Explorador',
} as const;

/** Nome de exibição do companheiro (apelido ou nome do Adari; fallback = "Adari"). */
export function companionDisplayName(name?: string | null): string {
  return name && name.length > 0 ? name : BRAND.companionSingular;
}
