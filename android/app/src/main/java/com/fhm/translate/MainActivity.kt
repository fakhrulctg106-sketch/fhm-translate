package com.fhm.translate

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.speech.RecognizerIntent
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewAssetLoader
import java.util.Locale

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null

    private val OVERLAY_PERMISSION_REQUEST_CODE = 1001
    private val SCREEN_CAPTURE_REQUEST_CODE = 1002
    private val SPEECH_RECOGNITION_REQUEST_CODE = 1003
    private val FILE_CHOOSER_REQUEST_CODE = 1004
    private val RUNTIME_PERMISSIONS_REQUEST_CODE = 1005

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        webView.setBackgroundColor(Color.parseColor("#0F172A"))

        val webSettings: WebSettings = webView.settings
        webSettings.javaScriptEnabled = true
        webSettings.domStorageEnabled = true
        webSettings.databaseEnabled = true
        webSettings.mediaPlaybackRequiresUserGesture = false
        webSettings.allowFileAccess = true
        webSettings.allowContentAccess = true
        webSettings.allowFileAccessFromFileURLs = true
        webSettings.allowUniversalAccessFromFileURLs = true
        webSettings.loadWithOverviewMode = true
        webSettings.useWideViewPort = true
        webSettings.cacheMode = WebSettings.LOAD_DEFAULT

        val assetLoader = WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .addPathHandler("/res/", WebViewAssetLoader.ResourcesPathHandler(this))
            .build()

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                val url = request?.url ?: return null
                return assetLoader.shouldInterceptRequest(url)
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                Log.e("FHM_WEBVIEW", "WebView error: ${error?.description} on url ${request?.url}")

                // Fallback to local file url if virtual domain fails on older Android versions
                if (request?.isForMainFrame == true && request.url.toString().startsWith("https://appassets.androidplatform.net")) {
                    view?.post {
                        view.loadUrl("file:///android_asset/dist/index.html")
                    }
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                Log.d("FHM_JS_CONSOLE", "${consoleMessage?.message()} -- line ${consoleMessage?.lineNumber()}")
                return super.onConsoleMessage(consoleMessage)
            }

            // Grant WebRTC camera & microphone permissions automatically to the WebView
            override fun onPermissionRequest(request: PermissionRequest?) {
                runOnUiThread {
                    request?.grant(request.resources)
                }
            }

            // Handle file and camera upload prompts
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback

                val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "*/*"
                    addCategory(Intent.CATEGORY_OPENABLE)
                }
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE)
                } catch (e: Exception) {
                    fileUploadCallback = null
                    return false
                }
                return true
            }
        }

        // Register the native bridge interface
        val bridge = AndroidBridge(this, webView)
        webView.addJavascriptInterface(bridge, "AndroidBridge")

        // Request core permissions on startup
        checkAndRequestRuntimePermissions()

        // Load FHM Translate Web bundle through secure local asset loader
        webView.loadUrl("https://appassets.androidplatform.net/assets/dist/index.html")
    }

    fun checkAndRequestRuntimePermissions() {
        val permissions = mutableListOf<String>()
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            permissions.add(Manifest.permission.CAMERA)
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            permissions.add(Manifest.permission.RECORD_AUDIO)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        if (permissions.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, permissions.toTypedArray(), RUNTIME_PERMISSIONS_REQUEST_CODE)
        }
    }

    fun requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                // Show helpful toast for Android 13/14/15 restricted settings
                Toast.makeText(
                    this,
                    "যদি 'Denied/ব্লক' দেখায়: ৩টি ডট (⋮) চেপে 'Allow restricted settings' করুন",
                    Toast.LENGTH_LONG
                ).show()
            }
            try {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:$packageName")
                )
                startActivityForResult(intent, OVERLAY_PERMISSION_REQUEST_CODE)
            } catch (e: Exception) {
                try {
                    val fallbackIntent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION)
                    startActivityForResult(fallbackIntent, OVERLAY_PERMISSION_REQUEST_CODE)
                } catch (e2: Exception) {
                    openAppDetailsSettings()
                }
            }
        } else {
            notifyBridge("onOverlayPermissionGranted")
        }
    }

    fun openAppDetailsSettings() {
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:$packageName")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(intent)
            Toast.makeText(
                this,
                "App info: উপরে ৩টি ডট (⋮) চেপে 'Allow restricted settings' অনুমোদন করুন",
                Toast.LENGTH_LONG
            ).show()
        } catch (e: Exception) {
            try {
                val intent = Intent(Settings.ACTION_SETTINGS)
                startActivity(intent)
            } catch (e2: Exception) {
                Log.e("FHM_SETTINGS", "Cannot open settings", e2)
            }
        }
    }

    override fun onResume() {
        super.onResume()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (Settings.canDrawOverlays(this)) {
                notifyBridge("onOverlayPermissionGranted")
            }
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

    fun startSpeechRecognition(langCode: String) {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, langCode)
            putExtra(RecognizerIntent.EXTRA_PROMPT, "Speak into FHM Translate...")
        }
        try {
            startActivityForResult(intent, SPEECH_RECOGNITION_REQUEST_CODE)
        } catch (e: Exception) {
            Toast.makeText(this, "Voice recognition not supported on this device", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        if (requestCode == OVERLAY_PERMISSION_REQUEST_CODE) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Settings.canDrawOverlays(this)) {
                notifyBridge("onOverlayPermissionGranted")
            } else {
                Toast.makeText(this, "Overlay permission is required for the floating translator", Toast.LENGTH_SHORT).show()
                notifyBridge("onOverlayPermissionDenied")
            }
        } else if (requestCode == SCREEN_CAPTURE_REQUEST_CODE) {
            if (resultCode == Activity.RESULT_OK && data != null) {
                try {
                    val serviceIntent = Intent(this, ScreenCaptureService::class.java).apply {
                        putExtra("RESULT_CODE", resultCode)
                        putExtra("DATA_INTENT", data)
                    }
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(serviceIntent)
                    } else {
                        startService(serviceIntent)
                    }
                    notifyBridge("onScreenCaptureStarted")
                } catch (e: Exception) {
                    Log.e("FHM_MAIN", "Error starting screen capture service", e)
                    notifyBridge("onScreenCaptureDenied")
                }
            } else {
                notifyBridge("onScreenCaptureDenied")
            }
        } else if (requestCode == SPEECH_RECOGNITION_REQUEST_CODE) {
            if (resultCode == Activity.RESULT_OK && data != null) {
                val matches = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
                val spokenText = matches?.firstOrNull() ?: ""
                val cleanText = spokenText.replace("'", "\\'").replace("\n", " ")
                notifyBridge("onAndroidVoiceResult", cleanText)
            }
        } else if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (fileUploadCallback != null) {
                val result = if (resultCode == Activity.RESULT_OK && data != null) {
                    val dataString = data.dataString
                    if (dataString != null) arrayOf(Uri.parse(dataString)) else null
                } else null
                fileUploadCallback?.onReceiveValue(result)
                fileUploadCallback = null
            }
        }
    }

    fun notifyBridge(funcName: String, param: String? = null) {
        webView.post {
            val script = if (param != null) {
                "if (typeof window['$funcName'] === 'function') { try { window['$funcName']('$param'); } catch(e) { console.error(e); } }"
            } else {
                "if (typeof window['$funcName'] === 'function') { try { window['$funcName'](); } catch(e) { console.error(e); } }"
            }
            webView.evaluateJavascript(script, null)
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
