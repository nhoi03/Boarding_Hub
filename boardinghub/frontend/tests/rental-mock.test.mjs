import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const temporary = await mkdtemp(join(tmpdir(), 'boardinghub-mock-test-'));
after(() => rm(temporary, { recursive: true, force: true }));
for (const name of ['types', 'mock']) {
  const source = await readFile(new URL(`../src/rental/${name}.ts`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText.replaceAll("'./types'", "'./types.mjs'");
  await writeFile(join(temporary, `${name}.mjs`), compiled);
}
const { mockApi } = await import(pathToFileURL(join(temporary, 'mock.mjs')).href);
const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const previous = new Date(`${today}T00:00:00+07:00`); previous.setDate(1); previous.setMonth(previous.getMonth() - 1);
const period = `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}`;
async function prepare(api) {
  const room = await api.execute('rooms', { propertyName: 'Nhà A', roomNumber: '101', capacity: 2 });
  const person = await api.execute('persons', { fullName: 'Test', phone: '0901234567', accountEmail: 'tenant@example.com' });
  const contract = await api.execute('contracts', { roomId: room.id, personId: person.id, startDate: '2020-01-01', endDate: '2099-12-31', rent: 1000000, deposit: 5000000, electricityPrice: 3500, waterPrice: 15000, servicePrice: 100000 });
  await api.execute(`contracts/${contract.id}/deposit`, { amount: 5000000, reference: 'DEPOSIT', date: today });
  await api.execute(`contracts/${contract.id}/check-in`, { electricity: 100, water: 10, notes: 'Bàn giao' });
  await api.execute(`contracts/${contract.id}/activate`);
  return contract.id;
}
test('demo adapter completes the same financial lifecycle without double settlement', async () => {
  const api = mockApi(1), contract = await prepare(api);
  const monthly = await api.execute(`contracts/${contract}/periods`, { period, dueDate: today });
  await api.execute(`periods/${monthly.id}/readings`, { electricity: 110, water: 12 });
  const invoice = await api.execute(`periods/${monthly.id}/draft-invoice`);
  assert.equal((await api.state()).invoices[0].total_amount, 1165000);
  await api.execute(`invoices/${invoice.id}/issue`);
  await api.execute('payments', { invoiceId: invoice.id, amount: 165000, reference: 'PAYMENT', date: today });
  await api.execute(`periods/${monthly.id}/lock`);
  const checkout = await api.execute(`contracts/${contract}/checkout`, { date: today, electricity: 115, water: 13, finalRent: 1000000, finalService: 100000, notes: 'Trả phòng' });
  const deduction = await api.execute(`checkouts/${checkout.id}/deductions`, { description: 'Sửa khóa', amount: 100000 });
  await api.execute(`deductions/${deduction.id}/approve`);
  await api.execute(`deductions/${deduction.id}/approve`);
  const last = (await api.state()).invoices.find(invoice => invoice.kind === 'CHECKOUT');
  await api.execute(`invoices/${last.id}/issue`);
  await api.execute(`checkouts/${checkout.id}/finalize`);
  await api.execute(`checkouts/${checkout.id}/finalize`);
  const state = await api.state();
  assert.equal(state.checkouts[0].applied_amount, 2232500);
  assert.equal(state.checkouts[0].refund_amount, 2767500);
  assert.equal(state.contracts[0].status, 'TERMINATED');
  assert.equal(state.rooms[0].status, 'VACANT');
  assert.equal(state.deposit_transactions.length, 3);
  assert.ok(state.invoices.every(invoice => invoice.balance === 0));
});
test('failed command leaves persisted demo state unchanged', async () => {
  const api = mockApi(2), contract = await prepare(api);
  const monthly = await api.execute(`contracts/${contract}/periods`, { period, dueDate: today });
  const before = await api.state();
  await assert.rejects(api.execute(`periods/${monthly.id}/readings`, { electricity: 110, water: 9 }));
  assert.deepEqual(await api.state(), before);
});
test('demo data is isolated by authenticated account id', async () => {
  assert.equal((await mockApi(3).state()).contracts.length, 0);
  assert.equal((await mockApi(2).state()).contracts.length, 1);
});
