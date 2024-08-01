import { chainMods, OF32, pokeRound } from '@smogon/calc/dist/mechanics/util';
import { PokemonInitialStats } from '@showdex/consts/dex';
import { type CalcdexPokemon } from '@showdex/interfaces/calc';

export type CalcdexStatModDict =
  | 'abilities'
  | 'boost'
  | 'items'
  | 'field'
  // | 'modifier' // unused
  | 'moves'
  | 'nonvolatiles'
  | 'ultimates';

/**
 * Details of a single stat modifier.
 *
 * @since 1.1.0
 */
export interface CalcdexStatMod {
  /**
   * Reason for the stat modifier, which will be displayed to the user.
   *
   * @example
   * ```ts
   * 'Choice Specs'
   * ```
   * @since 1.1.0
   */
  label?: string;

  /**
   * Source of the stat modifier.
   *
   * * Primarily used as a key in the translations dictionary.
   *
   * @example
   * ```ts
   * 'items'
   * ```
   * @since 1.1.0
   */
  dict?: CalcdexStatModDict;

  /**
   * Modifier value.
   *
   * @example 1.5
   * @since 1.1.0
   */
  modifier?: number;

  /**
   * Stats that were swapped, if any.
   *
   * @example
   * ```ts
   * ['atk', 'def']
   * ```
   * @since 1.1.6
   */
  swapped?: [
    sourceStat: Showdown.StatNameNoHp,
    targetStat: Showdown.StatNameNoHp,
  ];

  /**
   * Previous stat value before the `modifier`.
   *
   * @example 328
   * @since 1.1.0
   */
  prev: number;

  /**
   * Value after the `modifier`.
   *
   * @example 492
   * @since 1.1.0
   */
  value: number;
}

export type CalcdexStatModRecords = Partial<Record<Showdown.StatName, CalcdexStatMod[]>>;

export interface CalcdexStatModRecording extends CalcdexStatModRecords {
  stats: Showdown.StatsTable;
}

export interface CalcdexStatModRecorder {
  export: () => CalcdexStatModRecording;
  stats: () => Showdown.StatsTable;
  cap: (max?: number) => void;
  apply: (stat: Showdown.StatName, modifier: number, dict?: CalcdexStatModDict, label?: string) => void;
  swap: (statA: Showdown.StatNameNoHp, statB: Showdown.StatNameNoHp, dict?: CalcdexStatModDict, label?: string) => void;
}

/**
 * Records stat modifications and stores the results that can be `export()`'d later.
 *
 * * Should this have been a `class`? Yeah, probably lol.
 *
 * @since 1.1.0
 */
export const statModRecorder = (
  pokemon?: CalcdexPokemon,
): CalcdexStatModRecorder => {
  const hasTransform = 'transform' in (pokemon?.volatiles || {});

  const serverStats: Showdown.StatsTable = {
    ...(!hasTransform && pokemon.serverStats),
    hp: pokemon.serverStats?.hp,
  };

  if (!serverStats.hp) {
    delete serverStats.hp;
  }

  const table: CalcdexStatModRecording = {
    hp: [],
    atk: [],
    def: [],
    spa: [],
    spd: [],
    spe: [],

    stats: {
      ...PokemonInitialStats,
      ...pokemon.baseStats,
      ...(hasTransform && pokemon?.transformedBaseStats),
      ...serverStats,

      // this recalculates based on changes in the UI, so should be last!
      ...pokemon.spreadStats,
    },
  };

  const buildStats: CalcdexStatModRecorder['stats'] = () => {
    // update (2024/07/30): who knew speed was this precise
    const { spe: speedValue, ...otherStats } = table.stats;
    const speedMods = [...table.spe];
    const { spe: initialSpeed } = pokemon.spreadStats;

    const parIndex = speedMods.findIndex((m) => m?.dict === 'nonvolatiles' && m.label === 'Paralysis');
    const parMod = parIndex > -1 ? speedMods.splice(parIndex, 1)[0] : null;
    const speedModValues = speedMods.map((m) => Math.floor((m?.modifier || 1) * 4096)).filter(Boolean);

    let spe = OF32(pokeRound((initialSpeed * chainMods(speedModValues, 410, 131172)) / 4096));

    if (parMod?.modifier) {
      spe = Math.floor(OF32(spe * (parMod.modifier * 100)) / 100);
    }

    /*
    return {
      ...otherStats,
      spe: speedValue % 1 > 0.5 ? Math.ceil(speedValue) : Math.floor(speedValue),
    };
    */

    return { ...otherStats, spe };
  };

  const apply: CalcdexStatModRecorder['apply'] = (
    stat,
    modifier,
    dict,
    label,
  ) => {
    const prev = table.stats[stat] || 0;
    const raw = prev * modifier;
    const value = Math.floor(raw);

    table[stat].push({
      label: label?.trim(),
      dict,
      modifier,
      prev,
      value,
    });

    table.stats[stat] = stat === 'spe' ? raw : value;
  };

  const cap: CalcdexStatModRecorder['cap'] = (
    max = 999,
  ) => Object.entries(table.stats)
    .filter(([, value]) => value > max)
    .forEach(([stat]) => { table.stats[stat] = max; });

  const swap: CalcdexStatModRecorder['swap'] = (
    statA,
    statB,
    dict,
    label,
  ) => {
    const valueA = table.stats[statA];
    const valueB = table.stats[statB];

    table[statA].push({
      label,
      dict,
      modifier: null,
      swapped: [statA, statB],
      prev: valueA,
      value: valueB,
    });

    table[statB].push({
      label,
      dict,
      modifier: null,
      swapped: [statB, statA],
      prev: valueB,
      value: valueA,
    });

    table.stats[statA] = valueB;
    table.stats[statB] = valueA;
  };

  return {
    // export: () => table,
    // stats: () => table.stats,
    export: () => ({ ...table, stats: buildStats() }),
    stats: buildStats,
    apply,
    cap,
    swap,
  };
};
