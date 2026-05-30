import { Redirect } from 'expo-router';

export default function BillsScreen() {
  return <Redirect href={'/wallet/tv' as never} />;
}
