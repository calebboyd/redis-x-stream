/**
 * 'entry' mode is default and will iterate over each stream entry in each stream in the result set
 * 'stream' mode will iterate over each XREAD[GROUP] stream result
 * 'batch' mode will iterate over each XREAD[GROUP] call result
 */
export type Mode = 'entry' | 'stream' | 'batch'
