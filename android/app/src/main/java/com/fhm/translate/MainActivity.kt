package com.fhm.translate

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private val OVERLAY_PERMISSION_REQUEST_CODE = 1001
    private val SCREEN_CAPTURE_REQUEST_CODE = 1002

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        val webSettings: WebSettings = webView.settings
        webSettings.javaScriptEnabled = true
        webSettings.domStorageEnabled = true
        webSettings.databaseEnabled = true
        webSettings.mediaPlaybackRequiresUserGesture = false
        webSettings.allowFileAccess = true

        webView.webViewClient = WebViewClient()
        webView.webChromeClient = WebChromeClient()

        // Register the native bridge interface
        val bridge = AndroidBridge(this, webView)
        webView.addJavascriptInterface(bridge, "AndroidBridge")

        // Load FHM Translate Web bundle / local assets
        webView.loadUrl("file:///android_asset/dist/index.html")
    }

    fun requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:$packageName")
            )
            startActivityForResult(intent, OVERLAY_PERMISSION_REQUEST_CODE)
        } else {
            notifyBridge("onOverlayPermissionGranted()")
        }
    }

    fun requestScreenCapture() {
        val mediaProjectionManager =
            getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        startActivityForResult(
            mediaProjectionManager.createScreenCaptureIntent(),
            SCREEN_CAPTURE_REQUEST_CODE
        )
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == OVERLAY_PERMISSION_REQUEST_CODE) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Settings.canDrawOverlays(this)) {
                notifyBridge("onOverlayPermissionGranted()")
            } else {
                Toast.makeText(this, "Overlay permission is required for the floating translator", Toast.LENGTH_SHORT).show()
                notifyBridge("onOverlayPermissionDenied()")
            }
        } else if (requestCode == SCREEN_CAPTURE_REQUEST_CODE) {
            if (resultCode == Activity.RESULT_OK && data != null) {
                // Start screen capture foreground service with intent data
                val serviceIntent = Intent(this, ScreenCaptureService::class.java).apply {
                    putExtra("RESULT_CODE", resultCode)
                    putExtra("DATA_INTENT", data)
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(serviceIntent)
                } else {
                    startService(serviceIntent)
                }
                notifyBridge("onScreenCaptureStarted()")
            } else {
                notifyBridge("onScreenCaptureDenied()")
            }
        }
    }

    private fun notifyBridge(jsScript: String) {
        webView.post {
            webView.evaluateJavascript("window.$jsScript", null)
        }
    }
}
