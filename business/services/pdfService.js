const PDFDocument = require('pdfkit');

const BUSINESS_NAME = process.env.BUSINESS_NAME || 'Thumbs Up Distribution';

function sendPdf(res, filename, buildFn) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(res);
  buildFn(doc);
  doc.end();
}

function buildSalesInvoice(doc, sale, customer) {
  doc.fontSize(18).text(BUSINESS_NAME, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(14).text('SALES INVOICE', { align: 'center' });
  doc.moveDown();
  doc.fontSize(10);
  doc.text(`Invoice #: ${sale.id}`);
  doc.text(`Date: ${sale.created_at ? new Date(sale.created_at).toLocaleDateString('en-IN') : '—'}`);
  doc.moveDown();
  doc.text('Bill To:', { underline: true });
  doc.text(customer?.shop_name || 'Walk-in Customer');
  if (customer?.owner_name) doc.text(customer.owner_name);
  if (customer?.phone) doc.text(`Phone: ${customer.phone}`);
  if (customer?.address) doc.text(customer.address);
  doc.moveDown();
  doc.text(`Product: ${sale.product_name || '—'}`);
  doc.text(`Quantity (cases): ${sale.quantity || 0}`);
  doc.text(`Price per case: ₹ ${Number(sale.price_per_case || 0).toFixed(2)}`);
  doc.text(`Total: ₹ ${Number(sale.total_amount || 0).toFixed(2)}`);
  doc.text(`Paid: ₹ ${Number(sale.amount_paid || 0).toFixed(2)}`);
  doc.text(`Payment mode: ${sale.payment_mode || '—'}`);
  if (sale.notes) doc.text(`Notes: ${sale.notes}`);
  doc.moveDown(2);
  doc.fontSize(9).fillColor('#666').text('Thank you for your business.', { align: 'center' });
}

function buildDeliveryChallan(doc, delivery, customer) {
  doc.fontSize(18).text(BUSINESS_NAME, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(14).text('DELIVERY CHALLAN', { align: 'center' });
  doc.moveDown();
  doc.fontSize(10);
  doc.text(`Challan #: ${delivery.id}`);
  doc.text(`Delivery date: ${delivery.delivery_date || '—'}`);
  doc.text(`Status: ${delivery.status || 'Pending'}`);
  doc.moveDown();
  doc.text('Deliver To:', { underline: true });
  doc.text(customer?.shop_name || '—');
  doc.moveDown();
  doc.text(`Product: ${delivery.product_name || '—'}`);
  doc.text(`Quantity: ${delivery.quantity || 0}`);
  doc.text(`Driver: ${delivery.driver_name || '—'}`);
  doc.text(`Vehicle: ${delivery.vehicle_no || '—'}`);
  if (delivery.notes) doc.text(`Notes: ${delivery.notes}`);
}

function buildInventoryReport(doc, rows) {
  doc.fontSize(16).text(`${BUSINESS_NAME} — Inventory Report`, { align: 'center' });
  doc.moveDown();
  doc.fontSize(9);
  rows.slice(0, 80).forEach((r) => {
    doc.text(
      `${r.name || r.Name} | SKU: ${r.sku || '—'} | Stock: ${r.quantity} | ₹ ${r.price} | Reorder: ${r.reorder}`
    );
  });
}

function buildCustomerStatement(doc, customer, sales) {
  doc.fontSize(16).text(`${BUSINESS_NAME} — Customer Statement`, { align: 'center' });
  doc.moveDown();
  doc.fontSize(11).text(customer.shop_name);
  doc.text(`Outstanding: ₹ ${Number(customer.outstanding_balance || 0).toFixed(2)}`);
  doc.moveDown();
  doc.fontSize(9);
  sales.forEach((s) => {
    doc.text(
      `${s.created_at ? new Date(s.created_at).toLocaleDateString('en-IN') : '—'} | ${s.product_name} | ₹ ${s.total_amount}`
    );
  });
}

module.exports = {
  sendPdf,
  buildSalesInvoice,
  buildDeliveryChallan,
  buildInventoryReport,
  buildCustomerStatement,
};
