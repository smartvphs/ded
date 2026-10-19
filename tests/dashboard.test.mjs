import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
// The application package is CommonJS; load the standalone browser utility as ESM.
const source = await readFile(new URL('../src/dashboard-data.js', import.meta.url), 'utf8');
const {periodQuery, chartRows, monthlyPricing, ordersQuery, number} = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

test('periods use inclusive Saudi calendar days, including the UTC day boundary', () => {
  assert.deepEqual(periodQuery('week', new Date('2026-10-19T22:00:00Z')), {from: '2026-10-14', to: '2026-10-20', groupBy: 'day'});
  assert.deepEqual(periodQuery('month', new Date('2024-03-01T10:00:00Z')), {from: '2024-02-01', to: '2024-03-01', groupBy: 'day'});
  const year = periodQuery('year', new Date('2026-10-20T10:00:00Z'));
  assert.equal((Date.parse(year.to) - Date.parse(year.from)) / 86400000, 364);
  assert.equal(year.groupBy, 'month');
});

test('charts join sales and pricing by date, rather than array position', () => {
  const rows = chartRows({salesTrend: {series: [{period: '2026-10-02', netRevenue: '25.50'}]}, pricingTrend: {series: [{period: '2026-10-01', newRequests: 5}, {period: '2026-10-02', newRequests: 2}]}});
  assert.deepEqual(rows, [{period: '2026-10-01', newRequests: 5}, {period: '2026-10-02', netRevenue: '25.50', newRequests: 2}]);
  assert.deepEqual(chartRows({}), []);
});

test('monthly pricing totals preserve zero and sum the actual daily buckets', () => {
  assert.deepEqual(monthlyPricing([{period: '2026-09-30', newRequests: 2, quotedRequests: 1, confirmedRequests: 0}, {period: '2026-10-01', newRequests: 4, quotedRequests: 2, confirmedRequests: 1}, {period: '2026-10-02', newRequests: 6, quotedRequests: 1, confirmedRequests: 0}]), [{period: '2026-09-01', newRequests: 2, quotedRequests: 1, confirmedRequests: 0}, {period: '2026-10-01', newRequests: 10, quotedRequests: 3, confirmedRequests: 1}]);
});

test('table modes use the documented API filters and pagination', () => {
  assert.deepEqual(ordersQuery('missing', 'oil', 5), {path: '/api/pricing-requests/admin', params: {limit: 5, offset: 5, partType: 'oil', statuses: 'pending_admin_review,products_added'}});
  assert.equal(ordersQuery('suppliers', '').params.statuses, 'open,quoted');
  assert.equal(ordersQuery('confirmed', '').params.hasAccepted, true);
  assert.equal(ordersQuery('confirmed', '').params.status, undefined);
  assert.equal(ordersQuery('latest', 'used_part').path, '/api/orders/all');
  assert.equal(ordersQuery('latest', 'used_part').params.partType, 'used_part');
  assert.equal(ordersQuery('latest', '').params.partType, undefined);
});

test('missing values stay distinct from a real zero', () => {
  assert.equal(number(0), '0');
  assert.equal(number('0.00'), '0');
  assert.equal(number(null), '—');
  assert.equal(number(undefined), '—');
  assert.equal(number('invalid'), '—');
  assert.equal(number('14387.48'), '14,387.48');
});
