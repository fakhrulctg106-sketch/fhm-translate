package com.fhm.translate

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.provider.Settings
import android.speech.tts.TextToSpeech
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.Toast
import java.util.Locale

class AndroidBridge(
    private val activity: MainActivity,
    private val webView: WebView
) {
    private var textToSpeech: TextToSpeech? = null

    init {
        textToSpeech = TextToSpeech(activity) { status ->
            if (status == TextToSpeech.SUCCESS) {
                textToSpeech?.language = Locale.getDefault()
            }
        }
    }

    @JavascriptInterface
    fun isNativeAndroid(): Boolean = true

    @JavascriptInterface
    fun checkOverlayPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(activity)
        } else {
            true
        }
    }

    @JavascriptInterface
    fun requestOverlayPermission() {
        activity.runOnUiThread {
            activity.requestOverlayPermission()
        }
    }

    @JavascriptInterface
    fun startFloatingBubbleService(x: Int, y: Int, size: String) {
        val intent = Intent(activity, FloatingTranslatorService::class.java).apply {
            putExtra("INITIAL_X", x)
            putExtra("INITIAL_Y", y)
            putExtra("SIZE", size)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            activity.startForegroundService(intent)
        } else {
            activity.startService(intent)
        }
    }

    @JavascriptInterface
    fun stopFloatingBubbleService() {
        val intent = Intent(activity, FloatingTranslatorService::class.java)
        activity.stopService(intent)
    }

    @JavascriptInterface
    fun updateFloatingPosition(x: Int, y: Int) {
        val intent = Intent(activity, FloatingTranslatorService::class.java).apply {
            action = "UPDATE_POSITION"
            putExtra("POS_X", x)
            putExtra("POS_Y", y)
        }
        activity.startService(intent)
    }

    @JavascriptInterface
    fun startScreenCapture() {
        activity.runOnUiThread {
            activity.requestScreenCapture()
        }
    }

    @JavascriptInterface
    fun startVoiceRecognition(lang: String) {
        activity.runOnUiThread {
            activity.startSpeechRecognition(lang)
        }
    }

    @JavascriptInterface
    fun requestCameraPermission() {
        activity.runOnUiThread {
            activity.checkAndRequestRuntimePermissions()
        }
    }

    @JavascriptInterface
    fun requestAudioPermission() {
        activity.runOnUiThread {
            activity.checkAndRequestRuntimePermissions()
        }
    }

    @JavascriptInterface
    fun speakText(text: String, lang: String, speed: Float) {
        textToSpeech?.let { tts ->
            tts.setSpeechRate(speed)
            val locale = Locale.forLanguageTag(lang)
            tts.language = locale
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "fhm_tts_${System.currentTimeMillis()}")
        }
    }

    @JavascriptInterface
    fun vibrate(durationMs: Long) {
        val vibrator = activity.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createOneShot(durationMs, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(durationMs)
        }
    }

    @JavascriptInterface
    fun showToast(message: String) {
        activity.runOnUiThread {
            Toast.makeText(activity, message, Toast.LENGTH_SHORT).show()
        }
    }
}
