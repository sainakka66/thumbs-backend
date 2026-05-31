/**
 * Build UPI payment URI (static or dynamic amount).
 * @see https://www.npci.org.in/upi URLs
 */
function buildUpiUri({
  vpa,
  payeeName,
  amount = null,
  transactionNote = '',
  transactionRef = '',
}) {
  const params = new URLSearchParams();
  params.set('pa', vpa);
  if (payeeName) params.set('pn', payeeName);
  if (amount != null && amount !== '') params.set('am', String(Number(amount).toFixed(2)));
  if (transactionNote) params.set('tn', transactionNote.slice(0, 80));
  if (transactionRef) params.set('tr', transactionRef.slice(0, 35));
  params.set('cu', 'INR');
  return `upi://pay?${params.toString()}`;
}

function customerOutstandingQr(customer, vpa = process.env.UPI_VPA || 'merchant@upi') {
  const due = Number(customer.outstanding_balance || 0);
  return {
    uri: buildUpiUri({
      vpa,
      payeeName: customer.shop_name || customer.name,
      amount: due > 0 ? due : null,
      transactionNote: `Due ${customer.shop_name || ''}`.trim(),
      transactionRef: `CUST${customer.id}`,
    }),
    static: due <= 0,
    amount: due,
  };
}

module.exports = { buildUpiUri, customerOutstandingQr };
