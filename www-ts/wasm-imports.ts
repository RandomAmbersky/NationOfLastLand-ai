// Mock WASM imports for TypeScript version
// These should be replaced with actual WASM bindings in production

export async function init (): Promise<string> {
  return JSON.stringify({ time: 0, entities_count: 0, alerts_count: 0, entities: [] })
}

export function create_vehicle (type: string, x: number, y: number): string {
  return JSON.stringify({ id: Math.floor(Math.random() * 1000), entity_type: 'vehicle', subtype: type, fraction: 'Player', position: { x, y } })
}

export function update (dt: number): string {
  return JSON.stringify({ time: dt, entities_count: 0, alerts_count: 0, entities: [], removed_entities: [] })
}

export function select_entity (id: number): void {
  console.log('Select entity:', id)
}

export function deselect_entity (id: number): void {
  console.log('Deselect entity:', id)
}

export function clear_selection (): void {
  console.log('Clear selection')
}

export function set_group_target (x: number, y: number): void {
  console.log('Set group target:', { x, y })
}

export function handle_entity_selection (x: number, y: number): void {
  console.log('Handle entity selection:', { x, y })
}

export function create_base (x: number, y: number): string {
  return JSON.stringify({ id: Math.floor(Math.random() * 1000), entity_type: 'base', fraction: 'Player', position: { x, y } })
}

export function build_floor (baseId: number, floorType: string): string {
  return JSON.stringify({ id: baseId, floors_count: 1, max_floors: 10 })
}

export function get_entity_info (id: number): string {
  return JSON.stringify({ id, entity_type: 'vehicle', subtype: 'scout', fraction: 'Player', position: { x: 0, y: 0 } })
}

export function create_random_alert (): string {
  return JSON.stringify({ id: Math.floor(Math.random() * 1000), entity_type: 'alert', subtype: 'alert_hostile', position: { x: Math.random() * 800, y: Math.random() * 600 } })
}

export async function get_entities_data (): Promise<string> {
  return JSON.stringify([])
}
