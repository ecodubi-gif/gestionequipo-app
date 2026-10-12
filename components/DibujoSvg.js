import React from 'react';
import Svg, { Rect, Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';

// Pinta la lista de formas que calcula data/formas.js.
export default function DibujoSvg({ res }) {
  return (
    <Svg width={res.ancho} height={res.alto} viewBox={`0 0 ${res.ancho} ${res.alto}`}>
      {res.formas.map((f, i) => {
        const dash = f.dash || undefined;
        if (f.k === 'rect') {
          return <Rect key={i} x={f.x} y={f.y} width={Math.max(0, f.w)} height={Math.max(0, f.h)} rx={f.rx} fill={f.fill} stroke={f.stroke} strokeWidth={f.sw} strokeDasharray={dash} opacity={f.op} />;
        }
        if (f.k === 'circle') {
          return <Circle key={i} cx={f.cx} cy={f.cy} r={f.r} fill={f.fill} stroke={f.stroke} strokeWidth={f.sw} strokeDasharray={dash} opacity={f.op} />;
        }
        if (f.k === 'line') {
          return <Line key={i} x1={f.x1} y1={f.y1} x2={f.x2} y2={f.y2} stroke={f.stroke} strokeWidth={f.sw} strokeDasharray={dash} opacity={f.op} />;
        }
        if (f.k === 'poly') {
          return <Polygon key={i} points={f.pts.map((p) => p.join(',')).join(' ')} fill={f.fill} stroke={f.stroke} strokeWidth={f.sw} />;
        }
        if (f.k === 'text') {
          return (
            <SvgText key={i} x={f.x} y={f.y} fontSize={f.size} fill={f.fill} textAnchor={f.anchor} fontWeight={f.bold ? '700' : '400'}>
              {f.t}
            </SvgText>
          );
        }
        return null;
      })}
    </Svg>
  );
}
