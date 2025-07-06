package com.example.assistivetouchplugin

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.core.content.edit
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.PluginMethod
import okhttp3.*
import java.io.IOException

@CapacitorPlugin(name = "AssistiveTouchPlugin")
class AssistiveTouchPlugin : Plugin() {

    private val PREFS_NAME = "AssistiveTouchPrefs"
    private val AUTH_TOKEN_KEY = "AUTH_TOKEN"
    private val backendUrl = "https://your-production-backend-url.com/api/v1/actions/send-thought"
    private val client = OkHttpClient()

    private val sharedPreferences: SharedPreferences by lazy {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    /**
     * Store the auth token securely in SharedPreferences.
     * In production, consider using Android Keystore or EncryptedSharedPreferences.
     */
    fun setAuthToken(call: PluginCall) {
        val token = call.getString("token")
        if (token.isNullOrEmpty()) {
            call.reject("Auth token must be provided")
            return
        }
        sharedPreferences.edit {
            putString(AUTH_TOKEN_KEY, token)
        }
        call.resolve()
    }

    /**
     * Called when the double-tap gesture is detected.
     * Sends a POST request to the backend with the stored auth token.
     */
    fun onDoubleTap() {
        val authToken = sharedPreferences.getString(AUTH_TOKEN_KEY, null)
        if (authToken.isNullOrEmpty()) {
            Log.w("AssistiveTouchPlugin", "Auth token not found, cannot send thought")
            // Optionally, send a local notification or callback to prompt login
            return
        }

        val request = Request.Builder()
            .url(backendUrl)
            .post(RequestBody.create(null, ByteArray(0))) // Empty body
            .addHeader("Authorization", "Bearer $authToken")
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e("AssistiveTouchPlugin", "Failed to send thought: ${e.message}")
            }

            override fun onResponse(call: Call, response: Response) {
                if (!response.isSuccessful) {
                    Log.e("AssistiveTouchPlugin", "Unexpected response code: ${response.code}")
                } else {
                    Log.i("AssistiveTouchPlugin", "Thought sent successfully")
                }
                response.close()
            }
        })

        // Trigger haptic feedback (medium impact)
        bridge.activity?.runOnUiThread {
            val vibrator = bridge.activity?.getSystemService(Context.VIBRATOR_SERVICE) as? android.os.Vibrator
            vibrator?.let {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    it.vibrate(android.os.VibrationEffect.createOneShot(50, android.os.VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    it.vibrate(50)
                }
            }
        }
    }

    @PluginMethod
    fun updateBubbleAppearance(call: PluginCall) {
        val mood = call.getString("mood")
        // TODO: Call service or update UI to reflect the mood (e.g., via a static method or broadcast)
        // For now, just log and resolve
        Log.i("AssistiveTouchPlugin", "Updating bubble appearance for mood: $mood")
        call.resolve()
    }

    @PluginMethod
    fun sendMoodUpdate(call: PluginCall) {
        val mood = call.getString("mood")
        if (mood.isNullOrEmpty()) {
            call.reject("Mood must be provided")
            return
        }
        val authToken = sharedPreferences.getString(AUTH_TOKEN_KEY, null)
        if (authToken.isNullOrEmpty()) {
            call.reject("Auth token not found")
            return
        }
        val backendUrl = "https://your-production-backend-url.com/api/v1/actions/update-mood"
        val json = "{\"mood\":\"$mood\"}"
        val body = RequestBody.create(MediaType.parse("application/json"), json)
        val request = Request.Builder()
            .url(backendUrl)
            .post(body)
            .addHeader("Authorization", "Bearer $authToken")
            .addHeader("Content-Type", "application/json")
            .build()
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e("AssistiveTouchPlugin", "Failed to send mood: ${e.message}")
            }
            override fun onResponse(call: Call, response: Response) {
                if (!response.isSuccessful) {
                    Log.e("AssistiveTouchPlugin", "Unexpected response code: ${response.code}")
                } else {
                    Log.i("AssistiveTouchPlugin", "Mood sent successfully")
                }
                response.close()
            }
        })
        // Optionally trigger haptic feedback
        bridge.activity?.runOnUiThread {
            val vibrator = bridge.activity?.getSystemService(Context.VIBRATOR_SERVICE) as? android.os.Vibrator
            vibrator?.let {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    it.vibrate(android.os.VibrationEffect.createOneShot(30, android.os.VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    it.vibrate(30)
                }
            }
        }
        call.resolve()
    }
}
