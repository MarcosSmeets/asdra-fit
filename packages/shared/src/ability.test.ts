import {
  isDefensiveAbility,
  MAX_EQUIPPED_ABILITIES,
  validateEquippedSet,
} from './ability';
import {
  abilitiesForCreature,
  defaultEquippedAbilityIds,
  getAbilityById,
  unlockedAbilities,
} from './content/abilities';

describe('habilidades — conteúdo e desbloqueio', () => {
  it('cada Adari tem exatamente 4 habilidades (1 por slot)', () => {
    for (const key of ['terravok', 'lumora', 'solivar']) {
      const list = abilitiesForCreature(key);
      expect(list).toHaveLength(4);
      expect(list.map((a) => a.slot)).toEqual([
        'basicAttack',
        'basicDefense',
        'special',
        'tactical',
      ]);
    }
  });

  it('nível 1 desbloqueia ataque + defesa básicos', () => {
    const unlocked = unlockedAbilities('terravok', 1);
    expect(unlocked.map((a) => a.slot).sort()).toEqual(['basicAttack', 'basicDefense']);
  });

  it('nível 4 desbloqueia a especial; nível 7 a tática', () => {
    expect(unlockedAbilities('lumora', 4).some((a) => a.slot === 'special')).toBe(true);
    expect(unlockedAbilities('lumora', 4).some((a) => a.slot === 'tactical')).toBe(false);
    expect(unlockedAbilities('lumora', 7).some((a) => a.slot === 'tactical')).toBe(true);
  });

  it('recargas por categoria: básico 0, defesa 1, especial 2, tática 3', () => {
    const list = abilitiesForCreature('solivar');
    expect(list.find((a) => a.slot === 'basicAttack')?.cooldown).toBe(0);
    expect(list.find((a) => a.slot === 'basicDefense')?.cooldown).toBe(1);
    expect(list.find((a) => a.slot === 'special')?.cooldown).toBe(2);
    expect(list.find((a) => a.slot === 'tactical')?.cooldown).toBe(3);
  });

  it('usa os nomes originais do spec', () => {
    expect(getAbilityById('terravok-special')?.name).toBe('Investida Estelar');
    expect(getAbilityById('terravok-tactical')?.name).toBe('Muralha Celeste');
    expect(getAbilityById('lumora-special')?.name).toBe('Corrente de Bruma');
    expect(getAbilityById('lumora-tactical')?.name).toBe('Passo Incansável');
    expect(getAbilityById('solivar-special')?.name).toBe('Pulso Harmônico');
    expect(getAbilityById('solivar-tactical')?.name).toBe('Equilíbrio Solar');
  });
});

describe('habilidades — validação de conjunto equipado', () => {
  const abilities = abilitiesForCreature('terravok');
  const basicAttack = 'terravok-basicAttack';
  const basicDefense = 'terravok-basicDefense';
  const special = 'terravok-special';
  const tactical = 'terravok-tactical';

  it('conjunto padrão do nível é válido', () => {
    const ids = defaultEquippedAbilityIds('terravok', 10);
    expect(ids).toHaveLength(4);
    expect(validateEquippedSet(abilities, 10, ids).valid).toBe(true);
  });

  it('rejeita conjunto vazio', () => {
    expect(validateEquippedSet(abilities, 10, []).reason).toBe('empty');
  });

  it('rejeita mais de 4 habilidades', () => {
    const ids = [basicAttack, basicDefense, special, tactical, basicAttack];
    expect(validateEquippedSet(abilities, 10, ids).valid).toBe(false);
  });

  it('rejeita sem ataque básico', () => {
    expect(validateEquippedSet(abilities, 10, [basicDefense, special]).reason).toBe(
      'missing_basic_attack',
    );
  });

  it('rejeita sem nenhuma defensiva', () => {
    expect(validateEquippedSet(abilities, 10, [basicAttack, special]).reason).toBe(
      'missing_defense',
    );
  });

  it('a tática de escudo conta como defensiva', () => {
    // Muralha Celeste (shield) satisfaz a exigência defensiva.
    expect(isDefensiveAbility(getAbilityById(tactical)!)).toBe(true);
    expect(validateEquippedSet(abilities, 10, [basicAttack, tactical]).valid).toBe(true);
  });

  it('rejeita habilidade bloqueada pelo nível', () => {
    expect(validateEquippedSet(abilities, 1, [basicAttack, basicDefense, special]).reason).toBe(
      'locked',
    );
  });

  it('rejeita duplicatas', () => {
    expect(validateEquippedSet(abilities, 10, [basicAttack, basicAttack]).reason).toBe('duplicate');
  });

  it('respeita o máximo de slots equipados', () => {
    expect(MAX_EQUIPPED_ABILITIES).toBe(4);
  });
});
