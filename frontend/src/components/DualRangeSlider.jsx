export default function DualRangeSlider({
  min,
  max,
  minVal,
  maxVal,
  onMinChange,
  onMaxChange,
  step = 1,
  format = v => v,
}) {
  const range = max - min || 1;
  const safeMin = Math.max(min, Math.min(minVal, maxVal - step));
  const safeMax = Math.min(max, Math.max(maxVal, minVal + step));
  const minPct = ((safeMin - min) / range) * 100;
  const maxPct = ((safeMax - min) / range) * 100;

  return (
    <div className="px-1">
      {/* Track container */}
      <div className="relative" style={{ height: 20 }}>
        {/* Grey track */}
        <div
          className="absolute rounded-full bg-gray-200"
          style={{ top: '50%', left: 0, right: 0, height: 4, transform: 'translateY(-50%)' }}
        />
        {/* Blue fill */}
        <div
          className="absolute rounded-full bg-blue-500 pointer-events-none"
          style={{
            top: '50%',
            transform: 'translateY(-50%)',
            left: `${minPct}%`,
            width: `${maxPct - minPct}%`,
            height: 4,
          }}
        />
        {/* Min thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={safeMin}
          onChange={e => onMinChange(Math.min(Number(e.target.value), safeMax - step))}
          className="dual-range-input"
          style={{ zIndex: safeMin >= max - range * 0.02 ? 5 : 3 }}
        />
        {/* Max thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={safeMax}
          onChange={e => onMaxChange(Math.max(Number(e.target.value), safeMin + step))}
          className="dual-range-input"
          style={{ zIndex: 4 }}
        />
      </div>

      {/* Value labels */}
      <div className="flex justify-between mt-1.5">
        <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
          {format(safeMin)}
        </span>
        <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
          {format(safeMax)}
        </span>
      </div>
    </div>
  );
}
