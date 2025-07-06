package com.kuchlu.assistivetouch;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.app.AlertDialog;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

@CapacitorPlugin(name = "AssistiveTouch")
public class AssistiveTouchPlugin extends Plugin {
    public static AssistiveTouchPlugin instance;
    private static final int OVERLAY_REQUEST_CODE = 9001;
    private PluginCall permissionCall;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        Context ctx = getContext();
        boolean granted = Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(ctx);

        if (granted) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }

        SharedPreferences prefs = ctx.getSharedPreferences("assistive_prefs", Context.MODE_PRIVATE);
        boolean requestedBefore = prefs.getBoolean("overlay_requested", false);

        if (!requestedBefore) {
            prefs.edit().putBoolean("overlay_requested", true).apply();
            openOverlaySettings(call);
        } else {
            new AlertDialog.Builder(getActivity())
                .setTitle("Permission Required")
                .setMessage("Assistive Touch needs overlay permission to work. Please enable it in Settings.")
                .setPositiveButton("Go to Settings", (dialog, which) -> openOverlaySettings(call))
                .setNegativeButton("Cancel", (dialog, which) -> {
                    JSObject ret = new JSObject();
                    ret.put("granted", false);
                    call.resolve(ret);
                })
                .show();
        }
    }

    private void openOverlaySettings(PluginCall call) {
        this.permissionCall = call;
        Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:" + getContext().getPackageName()));
        startActivityForResult(call, intent, OVERLAY_REQUEST_CODE);
    }

    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == OVERLAY_REQUEST_CODE && permissionCall != null) {
            boolean granted = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
                    Settings.canDrawOverlays(getContext());
            JSObject ret = new JSObject();
            ret.put("granted", granted);
            permissionCall.resolve(ret);
            permissionCall = null;
        }
    }

    @PluginMethod
    public void show(PluginCall call) {
        Context ctx = getContext();
        String authToken = call.getString("authToken", null);

        Intent svc = new Intent(ctx, AssistiveTouchService.class);
        if (authToken != null) {
            AssistiveTouchService.setStaticAuthToken(authToken);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(svc);
        } else {
            ctx.startService(svc);
        }

        call.resolve();
    }

    @PluginMethod
    public void hide(PluginCall call) {
        Context ctx = getContext();
        Intent svc = new Intent(ctx, AssistiveTouchService.class);
        ctx.stopService(svc);
        call.resolve();
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        Context ctx = getContext();
        SharedPreferences prefs = ctx.getSharedPreferences("assistive_prefs", Context.MODE_PRIVATE);
        boolean isEnabled = prefs.getBoolean("assistive_enabled", false);
        
        JSObject ret = new JSObject();
        ret.put("isEnabled", isEnabled);
        call.resolve(ret);
    }

    public void sendEvent(String event, JSObject data) {
        notifyListeners(event, data);
    }
}
