import type { WarehouseMode } from './types'

/** Как FlowerFlow MERGED_WAREHOUSE_MODES (basic + variety). */
export function usesMergedWarehouseCards(mode: WarehouseMode | string | undefined): boolean {
  return mode === 'basic' || mode === 'variety'
}
