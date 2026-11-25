export const tables = ['rooms','persons','contracts','rent_rates','contract_services','service_prices','occupancies','handovers','billing_periods','meter_readings','invoices','invoice_items','payments','payment_allocations','checkouts','checkout_deductions','deposit_transactions','deposit_allocations'] as const;
export type TableName = typeof tables[number];
export type RentalRow = {id:number;owner_id:number;[key:string]:string|number|null};
export type RentalState = Record<TableName,RentalRow[]>;
export type CommandData = Record<string,string|number>;
export interface BoardingHubApi {
  state():Promise<RentalState>;
  execute(path:string,data?:CommandData):Promise<{id?:number}>;
}
export const blankState = ():RentalState => Object.fromEntries(tables.map(name=>[name,[]])) as unknown as RentalState;
export const n = (row:RentalRow|undefined,key:string) => Number(row?.[key] ?? 0);
export const s = (row:RentalRow|undefined,key:string) => String(row?.[key] ?? '');
