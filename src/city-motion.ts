/** Source-scaled travel: noticeable in seconds while the camera stays still. */
export const cityMotion = { cloudSpeed: 6.4, aircraftSpeed: 10 } as const;

/** Stagger whole rooms so short visits include visible, smooth changes. */
export function residentialLightCycle(index: number) {
  return { phase: 2 + index * 1.75, period: 12 + index * 1.5 };
}
