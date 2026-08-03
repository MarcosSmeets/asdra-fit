import type { BattleEvent, BattleEventKind, Side } from '@ad-sidera/shared';

export interface BattleVisualFeedback {
  seq: number;
  attacker: Side;
  kind: BattleEventKind;
  /** Nome da habilidade, quando o motor informou. É o que a arena anuncia. */
  abilityName?: string;
  /** Mensagem pt-BR já pronta pelo motor. Último recurso do anúncio. */
  text: string;
  damage: number;
  rawDamage: number;
  blockedDamage: number;
  heal: number;
}

/**
 * Um round pode conter a ação do jogador e a resposta inimiga.
 *
 * Antes isto filtrava por `damage > 0`, e o efeito era grave: turnos de buff,
 * escudo, cura, debuff, controle, telegrafado, contra-ataque e redução de recarga
 * simplesmente NÃO ACONTECIAM visualmente — o inimigo agia e a tela não mudava.
 * Agora todo evento de ação vira beat; só os derivados (dot, fase de chefe,
 * contra-ataque) grudam no beat que os produziu.
 */
export function battleVisualFeedbackSequence(
  events: readonly BattleEvent[],
  sequenceBase: number,
): BattleVisualFeedback[] {
  const beats: BattleVisualFeedback[] = [];
  for (const event of events) {
    const damage = Math.max(0, event.damage ?? 0);
    const rawDamage = Math.max(damage, event.rawDamage ?? damage);
    const blockedDamage = Math.max(0, event.blockedDamage ?? rawDamage - damage);
    const heal = Math.max(0, event.heal ?? 0);
    const previous = beats.at(-1);

    // Eventos derivados não abrem beat próprio: eles descrevem a consequência do
    // golpe anterior, e virar beat separado dobraria a duração do turno.
    if (previous && DERIVED_KINDS.has(event.kind)) {
      previous.damage += damage;
      previous.rawDamage += rawDamage;
      previous.blockedDamage += blockedDamage;
      previous.heal += heal;
      continue;
    }

    beats.push({
      seq: sequenceBase + beats.length + 1,
      attacker: event.side,
      kind: event.kind,
      abilityName: event.abilityName,
      text: event.text,
      damage,
      rawDamage,
      blockedDamage,
      heal,
    });
  }
  return beats;
}

const DERIVED_KINDS: ReadonlySet<BattleEventKind> = new Set<BattleEventKind>([
  'dot',
  'counter',
  'phase',
  'cooldownReduction',
]);

/** Fallback quando o motor não nomeou a habilidade. */
const KIND_ACTION: Partial<Record<BattleEventKind, string>> = {
  telegraph: 'concentra energia',
  stunned: 'perdeu o turno',
  dot: 'sofre dano contínuo',
  phase: 'mudou de postura',
  counter: 'revidou',
  control: 'tentou controlar',
  buff: 'se fortaleceu',
  debuff: 'enfraqueceu o oponente',
  shield: 'ergueu proteção',
  heal: 'se recuperou',
  cooldownReduction: 'acelerou a recarga',
};

/**
 * A frase que a arena mostra durante o beat.
 *
 * Existe porque o nome da habilidade só aparecia no painel de histórico — em
 * `caption`, cor apagada, no fim do scroll. O jogador não tinha como saber o que
 * o inimigo tinha usado contra ele.
 */
export function battleAnnouncement(feedback: BattleVisualFeedback, actorName: string): string {
  if (feedback.abilityName) return `${actorName} usou ${feedback.abilityName}`;
  const action = KIND_ACTION[feedback.kind];
  if (action) return `${actorName} ${action}`;
  return feedback.text;
}
