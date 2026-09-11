export function filterActions<T extends {status: string; due: string; owner?: string}>(actions: T[], view: string, asOf: string): T[];
