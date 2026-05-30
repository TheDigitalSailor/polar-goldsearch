declare module 'react-simple-maps' {
  import type { ComponentType, ReactNode, SVGProps } from 'react'

  export interface GeographyShape {
    rsmKey: string
    properties: Record<string, unknown>
    [key: string]: unknown
  }

  export const ComposableMap: ComponentType<{
    projection?: string
    projectionConfig?: Record<string, unknown>
    width?: number
    height?: number
    className?: string
    style?: Record<string, unknown>
    children?: ReactNode
  }>

  export const Geographies: ComponentType<{
    geography: string | Record<string, unknown>
    children: (args: { geographies: GeographyShape[] }) => ReactNode
  }>

  export const Geography: ComponentType<
    Omit<SVGProps<SVGPathElement>, 'style'> & {
      geography: GeographyShape
      style?: Record<string, Record<string, unknown>>
    }
  >
}
