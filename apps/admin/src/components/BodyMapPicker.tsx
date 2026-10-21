import { useRef, useState } from 'react';
import figure from '@/assets/body-map.webp';

/**
 * 人體圖座標選取器。
 *
 * <p>
 * 座標是 viewBox **260×560** 內的值，與前台 `apps/web/components/BodyMap.tsx`
 * 同一組。人形插圖也是同一張（這裡是 `assets/body-map.webp`，前台是
 * `public/brand/body-map.webp`）—— 兩份必須一致，否則後台放的位置與訪客看到的
 * 位置會對不上（換圖時兩邊一起換）。
 * </p>
 *
 * <p>
 * 為什麼不是兩組數字輸入框就好：熱區的正確與否是**相對於人形**與
 * **相對於其他方案的熱區**而言的。填 `cy: 395` 沒有人知道那是膝蓋還是小腿，
 * 而兩個方案的膠囊疊在一起，要等整張圖畫出來才看得見。
 * 所以這裡把人形與其他方案的位置一起畫出來，點下去就是那個點。
 * </p>
 *
 * 鍵盤：Tab 進入後用方向鍵微調 1、Shift+方向鍵移動 10。
 */
export type MapPoint = { cx: number; cy: number };
export type MapPosition = { hotspot: MapPoint; chip: MapPoint };

const VB = { w: 260, h: 560 };

/** 其他方案的既有座標，畫成淡色參考點 —— 避免疊在一起 */
export type GhostSpot = { slug: string; name: string; map: MapPosition };

export function BodyMapPicker({
  value,
  ghosts,
  label,
  onChange,
}: {
  value: MapPosition | null;
  ghosts: GhostSpot[];
  /** 膠囊上顯示的文字，通常是方案名稱 */
  label: string;
  onChange: (next: MapPosition | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [target, setTarget] = useState<'hotspot' | 'chip'>('hotspot');
  const [dragging, setDragging] = useState<'hotspot' | 'chip' | null>(null);

  /** 螢幕座標 → viewBox 座標。用 SVG 自己的矩陣，縮放與 RWD 都不必自己算。 */
  const toViewBox = (e: { clientX: number; clientY: number }): MapPoint | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = svg.getScreenCTM();
    if (!m) return null;
    const p = pt.matrixTransform(m.inverse());
    return { cx: clamp(Math.round(p.x), VB.w), cy: clamp(Math.round(p.y), VB.h) };
  };

  const place = (which: 'hotspot' | 'chip', point: MapPoint) => {
    const base: MapPosition = value ?? {
      hotspot: point,
      // 第一次放點時膠囊預設偏上 —— 疊在熱區上的膠囊會把它整個蓋住
      chip: { cx: point.cx, cy: clamp(point.cy - 60, VB.h) },
    };
    onChange({ ...base, [which]: point });
  };

  const nudge = (which: 'hotspot' | 'chip', dx: number, dy: number) => {
    if (!value) return;
    place(which, {
      cx: clamp(value[which].cx + dx, VB.w),
      cy: clamp(value[which].cy + dy, VB.h),
    });
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="form-label mb-0">人體圖位置</span>

        {value ? (
          <>
            <span className="flex gap-1">
              {(['hotspot', 'chip'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`btn btn-sm ${target === k ? 'btn-primary' : 'btn-secondary'}`}
                  aria-pressed={target === k}
                  onClick={() => setTarget(k)}
                >
                  {k === 'hotspot' ? '熱區' : '膠囊'}
                </button>
              ))}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              style={{ color: 'var(--red)' }}
              onClick={() => onChange(null)}
            >
              清除座標
            </button>
          </>
        ) : (
          <span className="form-hint mb-0">點圖上任一處開始放置。</span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-[16rem_1fr] sm:items-start">
        <div
          className="panel p-3"
          style={{ background: 'linear-gradient(165deg,#fdfefe,#eff7f9)' }}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VB.w} ${VB.h}`}
            className="block h-auto w-full touch-none"
            style={{ cursor: 'crosshair' }}
            onPointerDown={(e) => {
              const p = toViewBox(e);
              if (p) place(target, p);
            }}
            onPointerMove={(e) => {
              if (!dragging) return;
              const p = toViewBox(e);
              if (p) place(dragging, p);
            }}
            onPointerUp={() => setDragging(null)}
            onPointerLeave={() => setDragging(null)}
          >
            <Figure />

            {/* 其他方案 —— 只為了看見「別放在這裡」，所以不可點也不搶注意力 */}
            {ghosts.map((g) => (
              <g key={g.slug} opacity={0.38} pointerEvents="none">
                <line
                  x1={g.map.hotspot.cx}
                  y1={g.map.hotspot.cy}
                  x2={g.map.chip.cx}
                  y2={g.map.chip.cy}
                  stroke="var(--text-muted)"
                  strokeDasharray="3 3"
                />
                <circle cx={g.map.hotspot.cx} cy={g.map.hotspot.cy} r={7} fill="var(--text-muted)" />
                <text
                  x={g.map.chip.cx}
                  y={g.map.chip.cy}
                  textAnchor="middle"
                  fontSize="13"
                  fill="var(--text-secondary)"
                >
                  {g.name}
                </text>
              </g>
            ))}

            {value && (
              <>
                <line
                  x1={value.hotspot.cx}
                  y1={value.hotspot.cy}
                  x2={value.chip.cx}
                  y2={value.chip.cy}
                  stroke="var(--accent)"
                  strokeWidth="1.5"
                />

                <circle
                  cx={value.hotspot.cx}
                  cy={value.hotspot.cy}
                  r={16}
                  fill="var(--accent)"
                  opacity={0.18}
                />
                <circle
                  cx={value.hotspot.cx}
                  cy={value.hotspot.cy}
                  r={8}
                  fill="var(--accent)"
                  stroke="#fff"
                  strokeWidth="2"
                  style={{ cursor: 'grab' }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setTarget('hotspot');
                    setDragging('hotspot');
                  }}
                />

                {/* 膠囊在前台是 HTML，這裡用 SVG 近似 —— 位置對得上就夠了 */}
                <g
                  style={{ cursor: 'grab' }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setTarget('chip');
                    setDragging('chip');
                  }}
                >
                  <rect
                    x={value.chip.cx - 46}
                    y={value.chip.cy - 13}
                    width={92}
                    height={26}
                    rx={13}
                    fill="#fff"
                    stroke="var(--accent)"
                  />
                  <text
                    x={value.chip.cx}
                    y={value.chip.cy + 4}
                    textAnchor="middle"
                    fontSize="13"
                    fill="var(--text-primary)"
                  >
                    {truncate(label)}
                  </text>
                </g>
              </>
            )}
          </svg>
        </div>

        <div>
          <p className="form-hint mb-3">
            熱區是圖上那顆點，膠囊是它旁邊的名稱標籤。兩者分開放 ——
            疊在一起的話膠囊會把熱區蓋住。淡色的是其他方案已經佔用的位置。
          </p>

          {value && (
            <div className="grid gap-3 sm:grid-cols-2">
              {(['hotspot', 'chip'] as const).map((k) => (
                <fieldset
                  key={k}
                  className="panel p-3"
                  style={{ borderColor: target === k ? 'var(--accent)' : undefined }}
                  onFocus={() => setTarget(k)}
                  onKeyDown={(e) => {
                    const step = e.shiftKey ? 10 : 1;
                    const moves: Record<string, [number, number]> = {
                      ArrowLeft: [-step, 0],
                      ArrowRight: [step, 0],
                      ArrowUp: [0, -step],
                      ArrowDown: [0, step],
                    };
                    const move = moves[e.key];
                    if (!move) return;
                    e.preventDefault();
                    nudge(k, move[0], move[1]);
                  }}
                >
                  <legend className="form-label mb-0">{k === 'hotspot' ? '熱區' : '膠囊'}</legend>
                  <div className="flex items-center gap-2">
                    {(['cx', 'cy'] as const).map((axis) => (
                      <label key={axis} className="flex items-center gap-1">
                        <span className="mono text-[0.75rem]" style={{ color: 'var(--text-muted)' }}>
                          {axis}
                        </span>
                        <input
                          type="number"
                          className="form-control mono w-20"
                          value={value[k][axis]}
                          onChange={(e) =>
                            place(k, {
                              ...value[k],
                              [axis]: clamp(Number(e.target.value), axis === 'cx' ? VB.w : VB.h),
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <p className="form-hint mt-2 mb-0">方向鍵微調 1，Shift 加方向鍵移動 10。</p>
                </fieldset>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function clamp(n: number, max: number) {
  return Math.min(Math.max(Number.isFinite(n) ? n : 0, 0), max);
}

function truncate(s: string) {
  return s.length > 12 ? `${s.slice(0, 11)}…` : s;
}

/**
 * 人形。**與 `apps/web/components/BodyMap.tsx` 的 `Figure` 必須是同一張圖** ——
 * 它是版型素材，不是內容。白底用 multiply 吃進外框漸層。
 */
function Figure() {
  return (
    <image
      href={figure}
      x={0}
      y={0}
      width={VB.w}
      height={VB.h}
      preserveAspectRatio="xMidYMid meet"
      pointerEvents="none"
      style={{ mixBlendMode: 'multiply' }}
    />
  );
}
