export function mapProductFromApi(item) {
  return {
    id: item.id,
    name: item.Name,
    stock: item.quantity,
    price: item.price,
    cat: item.category || '-',
    size: item.size || '-',
    sku: item.sku || '-',
    bpc: item.bpc,
    reorder: item.reorder,
  };
}

export function mapProductToApi(form) {
  return {
    Name: form.name.trim(),
    quantity: parseFloat(form.stock) || 0,
    price: parseFloat(form.price) || 0,
    sku: form.sku.trim(),
    category: form.cat,
    size: form.size.trim(),
    bpc: parseFloat(form.bpc) || 24,
    reorder: parseFloat(form.reorder) || 10,
  };
}

export function productLabel(p) {
  return `${p.name} (${p.size || '—'})`;
}
