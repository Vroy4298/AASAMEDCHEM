/* components/StatusBadge.jsx */
export default function StatusBadge({ status }) {
  const map = {
    pending:   { label: 'Pending',   cls: 'badge-pending' },
    confirmed: { label: 'Confirmed', cls: 'badge-confirmed' },
    rejected:  { label: 'Rejected',  cls: 'badge-rejected' },
    fulfilled: { label: 'Fulfilled', cls: 'badge-fulfilled' },
  };
  const { label, cls } = map[status] || { label: status, cls: '' };
  return <span className={`status-badge ${cls}`}>{label}</span>;
}
