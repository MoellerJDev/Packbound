export const RawDebugDetails = ({
  label,
  value
}: {
  readonly label: string;
  readonly value: unknown;
}) => (
  <details className="raw-debug">
    <summary>{label}</summary>
    <pre>{JSON.stringify(value, null, 2)}</pre>
  </details>
);
