interface CombatPowerDeltaProps {
  delta: number;
  className?: string;
}

export default function CombatPowerDelta({ delta, className = '' }: CombatPowerDeltaProps) {
  if (delta === 0) {
    return (
      <span className={`bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
        ➖ 변동없음
      </span>
    );
  }

  const isPositive = delta > 0;
  const bgColor = isPositive ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600';
  const icon = isPositive ? '↗️' : '↘️';
  const sign = isPositive ? '+' : '';

  return (
    <span className={`${bgColor} px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {icon} {sign}{delta.toLocaleString()}
    </span>
  );
}
