import { Component, ErrorInfo, ReactNode } from 'react';
import { APP_VERSION, metrics } from '../../services/metricsService';

interface Props {
  children: ReactNode;
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

export class WebGLErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('WebGL/Three.js render error caught by Boundary:', error, errorInfo);
    // 2D 대체 기록 (specs/026 AC-12, AC-13)
    metrics.pack3d({ mode: '2d', readyMs: null, avgFps: null, frames: 0 });
    metrics.error('react', error?.message || 'WebGL error', APP_VERSION);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
