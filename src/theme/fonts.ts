import {
  CormorantGaramond_300Light,
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
} from '@expo-google-fonts/cormorant-garamond';
import { Jost_400Regular, Jost_500Medium, Jost_600SemiBold } from '@expo-google-fonts/jost';
import { useFonts } from 'expo-font';

/**
 * The typeface pairing is the app's single strongest signal, so the splash is
 * held until both faces are ready. Rendering a frame in the system font and
 * then reflowing into Cormorant is far more noticeable than a few hundred
 * extra milliseconds on a cold start.
 *
 * Fonts are bundled in the binary, not fetched, so this resolves offline.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    CormorantGaramond_300Light,
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
    Jost_400Regular,
    Jost_500Medium,
    Jost_600SemiBold,
  });

  // A font that fails to load must not black-hole the app; falling through to
  // the system face is worse-looking but still usable.
  return loaded || error != null;
}
