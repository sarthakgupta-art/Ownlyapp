import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '@/theme/tokens';

/**
 * A small hand-rolled icon set.
 *
 * Bundling an icon font for eleven glyphs is not worth the size or the extra
 * font-loading step, and these stay crisp at any scale.
 */

export type IconName =
  | 'home'
  | 'grid'
  | 'sparkle'
  | 'heart'
  | 'heart-filled'
  | 'user'
  | 'bag'
  | 'search'
  | 'chevron-right'
  | 'chevron-left'
  | 'close'
  | 'filter'
  | 'check'
  | 'share'
  | 'minus'
  | 'plus'
  | 'trash'
  | 'bell'
  | 'external';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const PATHS: Record<IconName, { d: string; fill?: boolean }[]> = {
  home: [{ d: 'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5' }],
  grid: [{ d: 'M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z' }],
  sparkle: [{ d: 'M12 3l1.9 5.6L19.5 10.5 13.9 12.4 12 18l-1.9-5.6L4.5 10.5l5.6-1.9zM18.5 3.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z' }],
  heart: [{ d: 'M12 20s-7.5-4.6-7.5-9.7A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.9C19.5 15.4 12 20 12 20z' }],
  'heart-filled': [{ d: 'M12 20s-7.5-4.6-7.5-9.7A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.9C19.5 15.4 12 20 12 20z', fill: true }],
  user: [{ d: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6' }],
  bag: [{ d: 'M5 7.5h14l-1 12.5H6zM8.5 7.5V6a3.5 3.5 0 0 1 7 0v1.5' }],
  search: [{ d: 'M20.5 20.5l-4.6-4.6M17.5 11a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z' }],
  'chevron-right': [{ d: 'M9 5l7 7-7 7' }],
  'chevron-left': [{ d: 'M15 5l-7 7 7 7' }],
  close: [{ d: 'M6 6l12 12M18 6L6 18' }],
  filter: [{ d: 'M3.5 6.5h17M6.5 12h11M10 17.5h4' }],
  check: [{ d: 'M4.5 12.5l5 5 10-11' }],
  share: [{ d: 'M12 15.5V4m0 0L8 8m4-4l4 4M5 14v5.5h14V14' }],
  minus: [{ d: 'M5 12h14' }],
  plus: [{ d: 'M12 5v14M5 12h14' }],
  trash: [{ d: 'M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6' }],
  bell: [{ d: 'M6 9a6 6 0 1 1 12 0c0 5 1.5 6.5 1.5 6.5h-15S6 14 6 9zM10 19a2 2 0 0 0 4 0' }],
  external: [{ d: 'M14 4h6v6M20 4l-9 9M18 14v5.5H4.5V6H10' }],
};

export function Icon({ name, size = 22, color = colors.text, strokeWidth = 1.6 }: IconProps) {
  const paths = PATHS[name];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {paths.map((path, index) => (
        <Path
          key={index}
          d={path.d}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={path.fill ? color : 'none'}
        />
      ))}
    </Svg>
  );
}

/** Small filled dot used for the cart badge and unread markers. */
export function Dot({ size = 8, color = colors.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 8 8">
      <Circle cx={4} cy={4} r={4} fill={color} />
    </Svg>
  );
}
