package com.kuchlu.plugin; // Corrected package name

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
import android.view.GestureDetector;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
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
    private String apiUrl;
    private Vibrator vibrator;
    private GestureDetector gestureDetector;
    private static final String TAG = "AssistiveTouchService";
    private static final String PREFS = "assistive_prefs";
    private static final String KEY_ENABLED = "assistive_enabled";

    private int lastAction;
    private int initialX;
    private int initialY;
    private float initialTouchX;
    private float initialTouchY;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        wm = (WindowManager) getSystemService(WINDOW_SERVICE);
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        
        setupFloatingButton();
        setupGestureDetector();
        setupHiddenWebView();

        getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean(KEY_ENABLED, true).apply();
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            this.authToken = intent.getStringExtra("authToken");
            this.apiUrl = intent.getStringExtra("apiUrl");

            if (this.hiddenWebView != null) {
                injectJsVariables();
            }
        }
        startForeground(1, buildNotification());
        return START_STICKY;
    }

    private void injectJsVariables() {
        if (authToken != null) {
            hiddenWebView.evaluateJavascript("javascript:setAuthToken('" + authToken + "');", null);
        }
        if (apiUrl != null) {
            hiddenWebView.evaluateJavascript("javascript:setApiUrl('" + apiUrl + "');", null);
        }
    }

    private void setupGestureDetector() {
        gestureDetector = new GestureDetector(this, new GestureDetector.SimpleOnGestureListener() {
            @Override
            public boolean onSingleTapConfirmed(MotionEvent e) {
                if (AssistiveTouchPlugin.instance != null) {
                    AssistiveTouchPlugin.instance.sendEvent("singleTap", new JSObject());
                }
                return true;
            }

            @Override
            public void onLongPress(MotionEvent e) {
                if (AssistiveTouchPlugin.instance != null) {
                    AssistiveTouchPlugin.instance.sendEvent("longPress", new JSObject());
                }
                vibrate(new long[]{0, 100});
            }

            @Override
            public boolean onDoubleTap(MotionEvent e) {
                 if (AssistiveTouchPlugin.instance != null) {
                    AssistiveTouchPlugin.instance.sendEvent("doubleTap", new JSObject());
                }
                vibrate(new long[]{0, 40, 50, 40});
                return true;
            }
        });
    }

    private void setupFloatingButton() {
        buttonView = LayoutInflater.from(this).inflate(R.layout.floating_button, null);
        int layoutFlag = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;

        params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                layoutFlag,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 100;
        params.y = 300;

        buttonView.setOnTouchListener((v, event) -> {
            gestureDetector.onTouchEvent(event);
            switch (event.getAction()) {
                case MotionEvent.ACTION_DOWN:
                    lastAction = MotionEvent.ACTION_DOWN;
                    initialX = params.x;
                    initialY = params.y;
                    initialTouchX = event.getRawX();
                    initialTouchY = event.getRawY();
                    return true;
                case MotionEvent.ACTION_MOVE:
                    params.x = initialX + (int) (event.getRawX() - initialTouchX);
                    params.y = initialY + (int) (event.getRawY() - initialTouchY);
                    wm.updateViewLayout(buttonView, params);
                    lastAction = MotionEvent.ACTION_MOVE;
                    return true;
            }
            return false;
        });

        wm.addView(buttonView, params);
    }

    private void setupHiddenWebView() {
        Handler mainHandler = new Handler(Looper.getMainLooper());
        mainHandler.post(() -> {
            hiddenWebView = new WebView(this);
            hiddenWebView.getSettings().setJavaScriptEnabled(true);
            hiddenWebView.getSettings().setCacheMode(WebSettings.LOAD_NO_CACHE);
            hiddenWebView.addJavascriptInterface(new JSBridge(), "Android");
            hiddenWebView.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageFinished(WebView view, String url) {
                    super.onPageFinished(view, url);
                    injectJsVariables();
                }
            });
            hiddenWebView.loadUrl("file:///android_asset/background.html");
        });
    }

    private Notification buildNotification() {
        String channelId = "assistivetouch";
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel chan = new NotificationChannel(
                    channelId, "Kuchlu", NotificationManager.IMPORTANCE_LOW
            );
            nm.createNotificationChannel(chan);
        }
        return new NotificationCompat.Builder(this, channelId)
                .setContentTitle("Kuchlu is active")
                .setContentText("Tap to manage settings.")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setOngoing(true)
                .build();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (buttonView != null) wm.removeView(buttonView);
        if (hiddenWebView != null) {
            hiddenWebView.removeJavascriptInterface("Android");
            hiddenWebView.destroy();
        }
        getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean(KEY_ENABLED, false).apply();
    }

    private void vibrate(long[] pattern) {
        if (vibrator == null || !vibrator.hasVibrator()) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
        } else {
            vibrator.vibrate(pattern, -1);
        }
    }

    private class JSBridge {
        private void sendPluginEvent(String eventName, String jsonData) {
             Handler mainHandler = new Handler(Looper.getMainLooper());
             mainHandler.post(() -> {
                try {
                    JSObject data = new JSObject(jsonData);
                    if (AssistiveTouchPlugin.instance != null) {
                        AssistiveTouchPlugin.instance.sendEvent(eventName, data);
                    }
                } catch (JSONException e) {
                    Log.e(TAG, "Error parsing JSON in " + eventName + ": " + jsonData, e);
                }
             });
        }
        
        @JavascriptInterface
        public void onMoodUpdate(String jsonData) {
             sendPluginEvent("moodUpdate", jsonData);
        }
        
        @JavascriptInterface
        public void onPresenceUpdate(String jsonData) {
             sendPluginEvent("presenceUpdate", jsonData);
        }
        
        @JavascriptInterface
        public void onMoodSelected(String moodId) {
             Handler mainHandler = new Handler(Looper.getMainLooper());
             mainHandler.post(() -> {
                JSObject data = new JSObject();
                data.put("moodId", moodId);
                 if (AssistiveTouchPlugin.instance != null) {
                    AssistiveTouchPlugin.instance.sendEvent("moodSelected", data);
                }
             });
        }
    }
}
