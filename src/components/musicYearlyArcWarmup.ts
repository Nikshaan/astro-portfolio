import { prefetchYearlyArcPayload } from '../utils/yearlyArcClient';

let started = false;

export function scheduleMusicYearlyArcWarmup() {
    if (started) return;
    started = true;
    const kick = () => prefetchYearlyArcPayload();
    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(kick, { timeout: 2800 });
    } else {
        setTimeout(kick, 0);
    }
}
