package com.kuchlu.assistivetouch; // Assuming this was a typo and should match your plugin's package

import com.kuchlu.plugin.assistivetouch.R; // Correct if R is in this package
import com.kuchlu.plugin.assistivetouch.R; // If R is in com.kuchlu.plugin.assistivetouch
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;
import android.util.Log;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.app.NotificationCompat;
import com.getcapacitor.JSObject;
import org.json.JSONException;
import org.json.JSONObject;

public class AssistiveTouchService extends Service {
    private WindowManager wm;
    private View buttonView;
    private WindowManager.LayoutParams params;
    private WebView hiddenWebView;
    private String authToken;
    public static String staticAuthToken = null;
    private Vibrator vibrator;
    private static final String TAG = "AssistiveTouchService";
    private static final String PREFS = "assistive_prefs";
    private static final String KEY_ENABLED = "assistive_enabled";
    private long[] patternSingle = {0, 50};
    private long[] patternDouble = {0, 40, 50, 40};
    private long[] patternLong   = {0, 100};
    private View moodSelectorView;
    private Handler longPressHandler = new Handler(Looper.getMainLooper());
    private Runnable longPressRunnable = new Runnable() {
        @Override
        public void run() {
            showMoodSelectorUI();
        }
    };

    public static void setStaticAuthToken(String token) {
        staticAuthToken = token;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        this.authToken = staticAuthToken;
        staticAuthToken = null;
        wm = (WindowManager) getSystemService(WINDOW_SERVICE);
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);

        // Crash handling
        Thread.setDefaultUncaughtExceptionHandler((thread, ex) -> {
            Log.e(TAG, "Uncaught in " + thread.getName(), ex);
            restartService();
        });

        // Save enabled state
        getSharedPreferences(PREFS, MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_ENABLED, true)
            .apply();

        setupFloatingButton();
        setupHiddenWebView();
        startForeground(1, buildNotification());
    }

    private void setupFloatingButton() {
        buttonView = LayoutInflater.from(this).inflate(R.layout.floating_button, null);
        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;

        params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 100;
        params.y = 300;

        buttonView.setOnTouchListener((v, event) -> {
            switch (event.getAction()) {
                case android.view.MotionEvent.ACTION_DOWN:
                    lastX = (int) event.getRawX();
                    lastY = (int) event.getRawY();
                    initialX = params.x;
                    initialY = params.y;
                    dragging = false;
                    vibrate(patternSingle);
                    longPressHandler.postDelayed(longPressRunnable, 500); // 500ms for long press
                    return true;
                case android.view.MotionEvent.ACTION_MOVE:
                    int dx = (int) event.getRawX() - lastX;
                    int dy = (int) event.getRawY() - lastY;
                    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragging = true;
                    params.x = initialX + dx;
                    params.y = initialY + dy;
                    wm.updateViewLayout(buttonView, params);
                    longPressHandler.removeCallbacks(longPressRunnable);
                    return true;
                case android.view.MotionEvent.ACTION_UP:
                    longPressHandler.removeCallbacks(longPressRunnable);
                    if (!dragging) v.performClick();
                    return true;
            }
            return false;
        });

        wm.addView(buttonView, params);
    }

    private int lastX, lastY, initialX, initialY;
    private boolean dragging = false;

    private void setupHiddenWebView() {
        hiddenWebView = new WebView(this);
        hiddenWebView.getSettings().setJavaScriptEnabled(true);
        hiddenWebView.getSettings().setCacheMode(WebSettings.LOAD_NO_CACHE);
        hiddenWebView.addJavascriptInterface(new JSBridge(), "Android");
        hiddenWebView.loadUrl("file:///android_asset/background.html");
    }

    private Notification buildNotification() {
        String channelId = "assistivetouch";
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel chan = new NotificationChannel(
                    channelId, "ChirpChat", NotificationManager.IMPORTANCE_LOW
            );
            nm.createNotificationChannel(chan);
        }
        return new NotificationCompat.Builder(this, channelId)
                .setContentTitle("ChirpChat is active")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setOngoing(true)
                .build();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (buttonView != null) wm.removeView(buttonView);
        if (hiddenWebView != null) hiddenWebView.destroy();
        getSharedPreferences(PREFS, MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_ENABLED, false)
            .apply();
    }

    private void vibrate(long[] pattern) {
        if (vibrator == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
        } else {
            vibrator.vibrate(pattern, -1);
        }
    }

    private void restartService() {
        Intent svc = new Intent(this, AssistiveTouchService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(svc);
        } else {
            startService(svc);
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private class JSBridge {
        @JavascriptInterface
        public void onMoodUpdate(String jsonData) {
            runOnUiThread(() -> {
                try {
                    JSObject data = new JSObject();
                    data.put("mood", new JSObject(jsonData));
                    if (AssistiveTouchPlugin.instance != null) {
                        AssistiveTouchPlugin.instance.sendEvent("moodUpdate", data);
                    } else {
                        Log.w(TAG, "AssistiveTouchPlugin.instance is null in onMoodUpdate");
                    }
                } catch (JSONException e) {
                    Log.e(TAG, "Error parsing JSON in onMoodUpdate: " + jsonData, e);
                }
            });
        }

        @JavascriptInterface
        public void onPresenceUpdate(String jsonData) {
            runOnUiThread(() -> {
                try {
                    JSObject data = new JSObject();
                    data.put("presence", new JSObject(jsonData));
                    if (AssistiveTouchPlugin.instance != null) {
                        AssistiveTouchPlugin.instance.sendEvent("presenceUpdate", data);
                    } else {
                        Log.w(TAG, "AssistiveTouchPlugin.instance is null in onPresenceUpdate");
                    }
                } catch (JSONException e) {
                    Log.e(TAG, "Error parsing JSON in onPresenceUpdate: " + jsonData, e);
                }
            });
        }
    }

    private void runOnUiThread(Runnable r) {
        Handler handler = new Handler(Looper.getMainLooper());
        handler.post(r);
    }

    private void showMoodSelectorUI() {
        if (moodSelectorView != null) return;
        moodSelectorView = LayoutInflater.from(this).inflate(R.layout.mood_selector, null);
        WindowManager.LayoutParams moodParams = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                params.type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT
        );
        moodParams.gravity = Gravity.TOP | Gravity.START;
        moodParams.x = params.x;
        moodParams.y = params.y + buttonView.getHeight();
        wm.addView(moodSelectorView, moodParams);

        moodSelectorView.findViewById(R.id.mood_happy).setOnClickListener(v -> onMoodIconTapped("happy"));
        moodSelectorView.findViewById(R.id.mood_sad).setOnClickListener(v -> onMoodIconTapped("sad"));
        moodSelectorView.findViewById(R.id.mood_think).setOnClickListener(v -> onMoodIconTapped("think"));
    }

    private void hideMoodSelectorUI() {
        if (moodSelectorView != null) {
            wm.removeView(moodSelectorView);
            moodSelectorView = null;
        }
    }

    private void onMoodIconTapped(String mood) {
        hideMoodSelectorUI();
        // Call the plugin's sendMoodUpdate method via a broadcast or static reference
        // For now, just log and TODO: implement actual call
        Log.i(TAG, "Mood selected: " + mood);
        // Optionally, trigger haptic feedback
        vibrate(patternSingle);
        // TODO: Actually call the plugin's sendMoodUpdate or make the HTTP request here
    }

    // Add a method to update the bubble appearance
    public void updateBubbleAppearance(String mood) {
        // TODO: Change the bubble's background or icon based on mood
        Log.i(TAG, "Updating bubble appearance for mood: " + mood);
        // Example: change icon or background
    }
}
