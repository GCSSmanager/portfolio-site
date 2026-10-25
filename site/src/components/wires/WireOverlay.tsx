type WireOverlayProps = {
  className: string
  groupClassName?: string
  markerId: string
  width: number
  height: number
  paths: string[]
}

export function WireOverlay({
  className,
  groupClassName,
  markerId,
  width,
  height,
  paths,
}: WireOverlayProps) {
  if (!width || !height) {
    return (
      <svg className={className} aria-hidden="true">
        <defs>
          <marker
            id={markerId}
            viewBox="0 0 10 10"
            refX="9.6"
            refY="5"
            markerWidth="7.5"
            markerHeight="7.5"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M0 0 L10 5 L0 10 Z" />
          </marker>
        </defs>
        <g className={groupClassName} />
      </svg>
    )
  }

  return (
    <svg className={className} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="9.6"
          refY="5"
          markerWidth="7.5"
          markerHeight="7.5"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M0 0 L10 5 L0 10 Z" />
        </marker>
      </defs>
      <g className={groupClassName}>
        {paths.map((d, index) => (
          <path key={index} d={d} markerEnd={`url(#${markerId})`} />
        ))}
      </g>
    </svg>
  )
}
