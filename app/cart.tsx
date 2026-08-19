import { Redirect } from 'expo-router';

/** Deep links point at `/cart`; the bag itself lives in the tab bar. */
export default function CartRedirect() {
  return <Redirect href="/(tabs)/bag" />;
}
