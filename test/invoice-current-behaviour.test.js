var test = require('node:test');
var assert = require('node:assert/strict');
var pricing = require('../lib/pricing');
var invoice = require('../lib/invoice');
var reports = require('../lib/reports');

test('CURRENT BEHAVIOUR: ledger pricing uses HSN slab and discounts taxable value before GST', function () {
  var items = [{ id: 1, name: 'Rice', hsn: '1006', price: 100, qty: 1 }];
  var totals = pricing.computeTotals(items, '');

  assert.equal(totals.subtotal, 100);
  assert.equal(totals.tax, 5);
  assert.equal(totals.cgst, 2.5);
  assert.equal(totals.sgst, 2.5);
  assert.equal(totals.total, 105);
  assert.deepEqual(totals.lines[0], {
    id: 1,
    name: 'Rice',
    hsn: '1006',
    gstPercent: 5,
    gross: 100,
    discount: 0,
    taxable: 100,
    tax: 5,
    net: 105
  });
});

test('invoice matches the billed HSN tax and total', function () {
  var order = {
    items: [{ name: 'Rice', hsn: '1006', price: 100, qty: 1 }],
    coupon: ''
  };
  var figures = invoice.computeInvoiceFigures(order);

  assert.equal(figures.subtotal, 100);
  assert.equal(figures.tax, 5);
  assert.equal(figures.cgst, 2.5);
  assert.equal(figures.sgst, 2.5);
  assert.equal(figures.total, 105);
  assert.equal(figures.rows[0].gstPercent, 5);
});

test('invoice applies a supplied fractional gstRate as a decimal rate', function () {
  var figures = invoice.computeInvoiceFigures({
    items: [{ name: 'Tea', price: 100, qty: 1, gstRate: 0.05 }],
    coupon: ''
  });

  assert.equal(figures.tax, 5);
  assert.equal(figures.rows[0].gstPercent, 5);
});

test('invoice matches billed discount allocation, tax, and capped coupon total', function () {
  var order = {
    items: [{ name: 'Rice', hsn: '1006', price: 2240, qty: 1 }],
    coupon: 'SAVE10'
  };
  var ledger = pricing.computeTotals(order.items, order.coupon);
  var figures = invoice.computeInvoiceFigures(order);

  assert.equal(ledger.discount, 150);
  assert.equal(ledger.tax, 104.5);
  assert.equal(ledger.total, 2194.5);
  assert.equal(figures.tax, 104.5);
  assert.equal(figures.discount, 150);
  assert.equal(figures.total, 2194.5);
});

test('reconciliation reports an invoice matching billed totals in memory', function () {
  var order = {
    id: 7,
    date: '21/11/2026',
    customer: 'Walk-in',
    status: 'completed',
    items: [{ name: 'Rice', hsn: '1006', price: 100, qty: 1 }],
    coupon: '',
    subtotal: 100,
    discount: 0,
    tax: 5,
    total: 105
  };
  var result = reports.getGstReconciliation({ orders: [order] });

  assert.equal(result.totalChecked, 1);
  assert.equal(result.mismatchCount, 0);
  assert.equal(result.totalDelta, 0);
  assert.equal(result.rows[0].ledgerTax, 5);
  assert.equal(result.rows[0].invoiceTax, 5);
  assert.equal(result.rows[0].ledgerTotal, 105);
  assert.equal(result.rows[0].invoiceTotal, 105);
  assert.equal(result.rows[0].matched, true);
});
