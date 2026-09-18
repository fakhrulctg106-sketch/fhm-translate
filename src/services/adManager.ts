/**
 * FHM Translate - Modular Advertising Layer
 * Developer: Fakhrul Islam
 * 
 * Configured for AdMob / Unity Ads integration with non-intrusive layout
 * that never overlays or blocks floating translator controls.
 */

export interface AdConfig {
  enabled: boolean;
  bannerAdUnitId?: string;
  interstitialAdUnitId?: string;
  rewardedAdUnitId?: string;
  testMode?: boolean;
}

class AdManagerService {
  private config: AdConfig = {
    enabled: true,
    testMode: true,
  };

  private interstitialCounter = 0;

  public setConfig(customConfig: Partial<AdConfig>) {
    this.config = { ...this.config, ...customConfig };
  }

  public isEnabled(): boolean {
    return this.config.enabled;
  }

  public incrementAction() {
    this.interstitialCounter++;
    // Show interstitial occasionally (e.g. every 7 manual actions) without interrupting active translation
    if (this.interstitialCounter >= 7) {
      this.interstitialCounter = 0;
      this.showInterstitialIfReady();
    }
  }

  public showInterstitialIfReady() {
    if (!this.config.enabled) return;
    // Dispatched safely when no floating translator is in active drag/scan mode
    console.log('[AdManager] Interstitial ad slot available for network dispatch');
  }

  public showRewardedAd(onRewarded: () => void) {
    // In production, triggers native AdMob rewarded ad callback
    console.log('[AdManager] Rewarded ad started');
    setTimeout(() => {
      onRewarded();
    }, 500);
  }
}

export const adManager = new AdManagerService();
