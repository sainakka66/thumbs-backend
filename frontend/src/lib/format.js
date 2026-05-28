export const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
export const fmtNum = (n) => Number(n || 0).toLocaleString('en-IN');
export const today = () => new Date().toISOString().slice(0, 10);
