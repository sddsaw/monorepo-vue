export type DataPath = (string | number)[]
export type PinKind = 'individualPins' | 'pinGroups'
export interface PinDraft {
  groupName: string
  pinName: string
  type: string
  comment: string
}
export interface PinRow extends PinDraft {
  key: string
  number: number
  path: DataPath
  mapKey?: string
  cells: Record<string, unknown>
}
