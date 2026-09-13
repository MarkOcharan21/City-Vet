import { useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { getSimulatedOffline, setSimulatedOffline } from '../../utils/offlineSim';

// Dev-only floating toggle (rendered only when import.meta.env.DEV) that lets
// you force the app into the "offline" state to demo the offline-draft flow
// without touching your real network. Hidden in production builds entirely.
export default function SimulateOfflineToggle() {
  const [offline, setOffline] = useState(getSimulatedOffline);

  const toggle = () => {
    const next = !offline;
    setOffline(next);
    setSimulatedOffline(next);
    toast(next
      ? 'You are offline. Your changes are saved as a draft and will appear in Draft Registration.'
      : "You're back online.");
  };

  return (
    <button
      type="button"
      className={`sim-offline-toggle${offline ? ' sim-offline-toggle--off' : ''}`}
      onClick={toggle}
      title={offline ? 'Simulated offline: click to go back online' : 'Simulate offline (dev only)'}
      aria-pressed={offline}
    >
      {offline ? <WifiOff size={14} /> : <Wifi size={14} />}
      {offline ? 'Offline' : 'Online'}
    </button>
  );
}