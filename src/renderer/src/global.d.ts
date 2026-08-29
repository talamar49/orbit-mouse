import type { OrbitBridge } from '../../shared/device'

declare global {
  interface Window {
    orbit?: OrbitBridge
  }
}

export {}
