declare module '@wrack/react-native-tour-guide' {
  import React from 'react';
  import { StyleProp, ViewStyle } from 'react-native';

  export interface TourStep {
    name?: string;
    order?: number;
    target?: any;
    wrapper?: any;
    text?: string;
    title?: string;
  }

  export interface TourGuideProviderProps {
    children: React.ReactNode;
    tooltipComponent?: React.ComponentType<any>;
    tooltipStyle?: StyleProp<ViewStyle>;
    borderRadius?: number;
    dismissOnPress?: boolean;
    androidStatusBarVisible?: boolean;
    backdropColor?: string;
    labels?: {
      skip?: string;
      previous?: string;
      next?: string;
      finish?: string;
    };
    [key: string]: any;
  }

  export const TourGuideProvider: React.FC<TourGuideProviderProps>;

  export interface TourGuideZoneProps {
    zone: number;
    children: React.ReactNode;
    title?: string;
    text?: string;
    shape?: 'rectangle' | 'circle' | 'pill';
    borderRadius?: number;
    style?: StyleProp<ViewStyle>;
    keepTooltipPosition?: boolean;
    tooltipBottomOffset?: number;
    [key: string]: any;
  }

  export const TourGuideZone: React.FC<TourGuideZoneProps>;

  export interface TourGuideController {
    start: (step?: number) => void;
    stop: () => void;
    eventEmitter: any;
    canStart: boolean;
    isTourActive: boolean;
    currentStep?: TourStep;
    [key: string]: any;
  }

  export function useTourGuideController(group?: string): TourGuideController;
}
