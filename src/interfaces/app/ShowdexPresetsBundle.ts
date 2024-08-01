import { type GenerationNum } from '@smogon/calc';
import { type ShowdexAssetBundle } from './ShowdexAssetBundle';

/**
 * Particular extended metadata about a particular loadable collection of presets bundled with this particular build of Showdex.
 *
 * @since 1.2.1
 */
export interface ShowdexPresetsBundle extends ShowdexAssetBundle {
  ntt: 'presets';

  /**
   * Gen number of these bundled presets.
   *
   * @example
   * ```ts
   * 10
   * ```
   * @since 1.2.1
   */
  gen: GenerationNum;

  /**
   * Genless format of these bundled presets.
   *
   * @example
   * ```ts
   * 'vgc2026'
   * ```
   * @since 1.2.1
   */
  format: string;
}
