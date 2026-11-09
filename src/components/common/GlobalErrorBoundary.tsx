/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { recordSanitizedError } from '../../services/errorLogService';
import { StartupRecoveryScreen } from './StartupRecoveryScreen';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isSafeMode: boolean;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isSafeMode: false
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isSafeMode: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const componentStack = errorInfo?.componentStack || '';
    recordSanitizedError('react_boundary', error, {
      name: error?.name || 'ReactRenderError',
      componentStack,
      route: typeof window !== 'undefined' ? (window.location.pathname + window.location.search) : '/'
    });
    console.error('TFIVE PRO Global Error Boundary caught error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleEnterSafeMode = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('safemode', '1');
    window.location.href = url.toString();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <StartupRecoveryScreen
          errorMessage={this.state.error?.message || 'Falha de renderização na interface'}
          onRetry={this.handleRetry}
          onEnterSafeMode={this.handleEnterSafeMode}
        />
      );
    }

    return this.props.children;
  }
}

