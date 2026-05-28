export function mapCustomerFromApi(c) {
  return {
    ...c,
    shop_name: c.shop_name || c.name || '—',
    owner_name: c.owner_name || c.owner || '—',
    area: c.area || c.zone || '—',
    phone: c.phone || '—',
    credit_limit: parseFloat(c.credit_limit) || 0,
    outstanding_balance: parseFloat(c.outstanding_balance) || 0,
  };
}
