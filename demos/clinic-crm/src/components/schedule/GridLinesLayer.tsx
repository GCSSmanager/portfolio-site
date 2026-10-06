import { lineStyle } from "../../lib/schedule/coordinates";
import { gridLineClass } from "./scheduleStyles";

interface Props {
  slots: number[];
  rangeStart: number;
}

export function GridLinesLayer({ slots, rangeStart }: Props) {
  return (
    <>
      {slots.map((min) => (
        <div key={min} className={gridLineClass(min % 60 === 0)} style={lineStyle(min, rangeStart)} />
      ))}
    </>
  );
}
