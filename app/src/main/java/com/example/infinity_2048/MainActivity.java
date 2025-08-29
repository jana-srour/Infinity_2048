package com.example.infinity_2048;

import android.os.Bundle;
import android.os.Handler;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;

import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.rewarded.RewardItem;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;

public class MainActivity extends AppCompatActivity {

    WebView webView;
    AdView adView;

    // Rewarded ad
    private RewardedAd mRewardedAd;

    // Interstitial ad
    private InterstitialAd mInterstitialAd;
    private final Handler handler = new Handler();
    private final int INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_main);

        // Init Ads
        MobileAds.initialize(this, initializationStatus -> {});

        // Banner ad
        adView = findViewById(R.id.adView);
        AdRequest adRequest = new AdRequest.Builder().build();
        adView.loadAd(adRequest);

        // Load rewarded ad
        loadRewardedAd();

        // Load interstitial ad
        loadInterstitialAd();
        startAdTimer();

        // Init WebView
        webView = findViewById(R.id.webview);
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        webSettings.setAllowFileAccessFromFileURLs(true);
        webSettings.setAllowUniversalAccessFromFileURLs(true);
        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl("file:///android_asset/index.html");

        // JS bridge for rewarded ads
        webView.addJavascriptInterface(new Object() {
            @android.webkit.JavascriptInterface
            public void showRewardedAd(String powerupName) {
                runOnUiThread(() -> {
                    if (mRewardedAd != null) {
                        mRewardedAd.show(MainActivity.this, rewardItem -> {
                            // JS callback when reward is granted
                            webView.evaluateJavascript("onPowerupRewarded('" + powerupName + "');", null);
                            Toast.makeText(MainActivity.this, powerupName + " restored!", Toast.LENGTH_SHORT).show();
                            loadRewardedAd(); // load next rewarded ad
                        });
                    } else {
                        Toast.makeText(MainActivity.this, "Ad not ready yet!", Toast.LENGTH_SHORT).show();
                    }
                });
            }
        }, "AndroidReward");

    }

    private void loadRewardedAd() {
        AdRequest adRequest = new AdRequest.Builder().build();
        RewardedAd.load(this,
                "ca-app-pub-9050356805984869/8381778587",
                adRequest,
                new RewardedAdLoadCallback() {
                    @Override
                    public void onAdLoaded(RewardedAd rewardedAd) {
                        mRewardedAd = rewardedAd;
                    }

                    @Override
                    public void onAdFailedToLoad(LoadAdError adError) {
                        mRewardedAd = null;
                    }
                });
    }

    public void showRewardedAd() {
        if (mRewardedAd != null) {
            mRewardedAd.show(MainActivity.this, rewardItem -> {
                // Grant reward in your game via JS
                webView.evaluateJavascript("activatePowerup();", null);
                Toast.makeText(this, "Powerup restored!", Toast.LENGTH_SHORT).show();
                // reload for next use
                loadRewardedAd();
            });
        } else {
            Toast.makeText(this, "Ad not ready yet!", Toast.LENGTH_SHORT).show();
        }
    }

    private void loadInterstitialAd() {
        AdRequest adRequest = new AdRequest.Builder().build();
        InterstitialAd.load(this,
                "ca-app-pub-9050356805984869/2901101636",
                adRequest,
                new InterstitialAdLoadCallback() {
                    @Override
                    public void onAdLoaded(InterstitialAd interstitialAd) {
                        mInterstitialAd = interstitialAd;
                    }

                    @Override
                    public void onAdFailedToLoad(LoadAdError adError) {
                        mInterstitialAd = null;
                    }
                });
    }

    private void startAdTimer() {
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (mInterstitialAd != null) {
                    mInterstitialAd.show(MainActivity.this);
                    loadInterstitialAd(); // preload next ad
                }
                handler.postDelayed(this, INTERVAL_MS); // repeat
            }
        }, INTERVAL_MS);
    }

    @Override
    protected void onPause() {
        super.onPause();

        if (webView != null) {
            // Save the current game state before the app goes to background or is killed
            webView.evaluateJavascript("persistLevelState();", null);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();

        if (webView != null) {
            // Reload the last saved state
            webView.evaluateJavascript("initGame();", null);
        }
    }


}
