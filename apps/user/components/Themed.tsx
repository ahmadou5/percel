import { Text as DefaultText, View as DefaultView } from 'react-native';
import { useAppPalette } from '@/lib/theme';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & DefaultText['props'];
export type ViewProps = ThemeProps & DefaultView['props'];

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const palette = useAppPalette();
  return <DefaultText style={[{ color: palette.text }, style]} {...otherProps} />;
}

export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const palette = useAppPalette();
  return <DefaultView style={[{ backgroundColor: palette.bg }, style]} {...otherProps} />;
}
