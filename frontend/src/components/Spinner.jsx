/**
 * Simple reusable loading indicator for async states across the dashboard.
 */
function Spinner({ label }) {
  return (
    <div className="spinner" role="status" aria-live="polite">
      <div className="spinner__circle" />
      {label && <span>{label}</span>}
    </div>
  );
}

export default Spinner;
