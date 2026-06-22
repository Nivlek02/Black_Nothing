import { useMemo } from 'react';
import { getWheelData, getWheelAverage, getBalanceIndex, getWeakestArea } from '@/data/life-wheel';
import type { WheelState } from '@/data/life-wheel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LifeWheelChartProps {
  state: WheelState;
  onAreaClick?: (areaId: string) => void;
  selectedArea?: string | null;
}

export default function LifeWheelChart({ state, onAreaClick, selectedArea }: LifeWheelChartProps) {
  const data = useMemo(() => getWheelData(state), [state]);
  const average = useMemo(() => getWheelAverage(state), [state]);
  const balance = useMemo(() => getBalanceIndex(state), [state]);
  const weakest = useMemo(() => getWeakestArea(state), [state]);

  const SIZE = 300;
  const CENTER = SIZE / 2;
  const RADIUS = CENTER - 20;
  const INNER_RADIUS = RADIUS * 0.35;
  const SLICE = (2 * Math.PI) / data.length;

  // Generate SVG arc path
  const arcPath = (
    cx: number,
    cy: number,
    r: number,
    startAngle: number,
    endAngle: number
  ): string => {
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  const slices = data.map((d, i) => {
    const startAngle = -Math.PI / 2 + i * SLICE - SLICE / 2;
    const endAngle = startAngle + SLICE;
    const scoreRadius = INNER_RADIUS + (RADIUS - INNER_RADIUS) * (d.score / 10);
    const midAngle = startAngle + SLICE / 2;
    const labelRadius = RADIUS + 18;

    return {
      ...d,
      startAngle,
      endAngle,
      midAngle,
      scoreRadius,
      bgPath: arcPath(CENTER, CENTER, RADIUS, startAngle, endAngle),
      scorePath: arcPath(CENTER, CENTER, scoreRadius, startAngle, endAngle),
      labelX: CENTER + labelRadius * Math.cos(midAngle),
      labelY: CENTER + labelRadius * Math.sin(midAngle),
      scoreX: CENTER + (INNER_RADIUS + 12) * Math.cos(midAngle),
      scoreY: CENTER + (INNER_RADIUS + 12) * Math.sin(midAngle),
    };
  });

  const isSelected = (areaId: string) => selectedArea === areaId;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Wheel */}
      <Card className="card-metallic lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            Rueda de la Vida
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <svg
            width={SIZE + 60}
            height={SIZE + 60}
            viewBox={`0 0 ${SIZE + 60} ${SIZE + 60}`}
            className="max-w-full h-auto"
          >
            <g transform={`translate(30, 30)`}>
              {/* Grid circles */}
              {[2, 4, 6, 8, 10].map((v) => {
                const r = INNER_RADIUS + (RADIUS - INNER_RADIUS) * (v / 10);
                return (
                  <circle
                    key={v}
                    cx={CENTER}
                    cy={CENTER}
                    r={r}
                    fill="none"
                    stroke="hsl(var(--border))"
                    strokeWidth={0.5}
                    strokeDasharray="3 3"
                    opacity={0.5}
                  />
                );
              })}

              {/* Slice backgrounds */}
              {slices.map((s) => (
                <path
                  key={s.areaId}
                  d={s.bgPath}
                  fill={s.color}
                  opacity={isSelected(s.areaId) ? 0.35 : 0.18}
                  stroke={isSelected(s.areaId) ? s.color : 'transparent'}
                  strokeWidth={isSelected(s.areaId) ? 2 : 0}
                  className="transition-all duration-300 cursor-pointer hover:opacity-30"
                  onClick={() => onAreaClick?.(s.areaId)}
                />
              ))}

              {/* Score fills */}
              {slices.map((s) => (
                <path
                  key={`score-${s.areaId}`}
                  d={s.scorePath}
                  fill={s.color}
                  opacity={0.7}
                  className="transition-all duration-500"
                />
              ))}

              {/* Score labels */}
              {slices.map((s) => (
                <text
                  key={`label-${s.areaId}`}
                  x={s.scoreX}
                  y={s.scoreY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#fff"
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="'JetBrains Mono', monospace"
                >
                  {s.score}
                </text>
              ))}

              {/* Area name labels */}
              {slices.map((s) => {
                const adjustedX = CENTER + (RADIUS + 24) * Math.cos(s.midAngle);
                const adjustedY = CENTER + (RADIUS + 24) * Math.sin(s.midAngle);
                return (
                  <text
                    key={`name-${s.areaId}`}
                    x={adjustedX}
                    y={adjustedY}
                    textAnchor={
                      s.midAngle > -Math.PI / 2 && s.midAngle < Math.PI / 2
                        ? 'start'
                        : 'end'
                    }
                    dominantBaseline="middle"
                    fill={isSelected(s.areaId) ? s.color : 'hsl(var(--muted-foreground))'}
                    fontSize="12"
                    fontWeight={isSelected(s.areaId) ? '600' : '400'}
                    fontFamily="'Inter', sans-serif"
                    className="cursor-pointer transition-colors"
                    onClick={() => onAreaClick?.(s.areaId)}
                  >
                    {s.name}
                  </text>
                );
              })}

              {/* Center text */}
              <text
                x={CENTER}
                y={CENTER - 4}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="hsl(var(--foreground))"
                fontSize="22"
                fontWeight="bold"
                fontFamily="'JetBrains Mono', monospace"
              >
                {average.toFixed(1)}
              </text>
              <text
                x={CENTER}
                y={CENTER + 14}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="hsl(var(--muted-foreground))"
                fontSize="9"
                fontFamily="'Inter', sans-serif"
              >
                promedio
              </text>
            </g>
          </svg>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="space-y-3">
        <Card className="card-metallic">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Promedio General</p>
            <p className="text-2xl font-bold font-mono-data text-primary">
              {average.toFixed(1)}
              <span className="text-xs text-muted-foreground font-normal ml-1">/10</span>
            </p>
          </CardContent>
        </Card>

        <Card className="card-metallic">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Equilibrio</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${balance * 100}%`,
                    background: balance > 0.6
                      ? 'hsl(var(--primary))'
                      : balance > 0.3
                        ? 'hsl(var(--warning))'
                        : 'hsl(var(--destructive))',
                  }}
                />
              </div>
              <span className="text-sm font-bold font-mono-data">
                {(balance * 100).toFixed(0)}%
              </span>
            </div>
          </CardContent>
        </Card>

        {weakest && (
          <Card className="card-metallic border-warning/20">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Área más débil</p>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: weakest.color }}
                />
                <span className="text-sm font-medium">{weakest.name}</span>
                <span className="text-sm font-mono-data text-warning ml-auto">
                  {weakest.score}/10
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leyenda: scores por área */}
        <Card className="card-metallic">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs text-muted-foreground mb-1">Calificaciones</p>
            {data.map((d) => (
              <button
                key={d.areaId}
                onClick={() => onAreaClick?.(d.areaId)}
                className={`w-full flex items-center gap-2 p-1.5 rounded text-left transition-colors hover:bg-secondary/50 ${
                  isSelected(d.areaId) ? 'bg-secondary' : ''
                }`}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-xs flex-1 text-muted-foreground">{d.name}</span>
                <span className="text-xs font-mono-data font-semibold">{d.score}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
