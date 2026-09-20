package com.fhm.translate

import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.PixelFormat
import android.graphics.Point
import android.graphics.Rect
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.provider.Settings
import android.speech.tts.TextToSpeech
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.view.animation.DecelerateInterpolator
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import java.util.Locale

/**
 * FHM Translate - Native Android Floating Screen Translator Service
 * Hi Translate Reference Architecture
 * Developer: Fakhrul Islam
 */
class FloatingTranslatorService : Service() {

    private var windowManager: WindowManager? = null
    private var floatingView: View? = null
    private var floatingResultView: View? = null
    private var params: WindowManager.LayoutParams? = null
    private var resultParams: WindowManager.LayoutParams? = null

    private val CHANNEL_ID = "FHM_FLOATING_CHANNEL"
    private val NOTIFICATION_ID = 2001

    private val serviceScope = CoroutineScope(Dispatchers.Main + Job())
    private var textToSpeech: TextToSpeech? = null
    private var vibrator: Vibrator? = null

    // State & Timers
    private val handler = Handler(Looper.getMainLooper())
    private var isSemiHidden = false
    private var isDragging = false
    private var isMenuOpen = false
    private var screenWidth = 1080
    private var screenHeight = 1920
    private var dockSide: String = "left" // "left" or "right"
    private var targetLangCode = "bn"

    private val autoIdleRunnable = Runnable {
        if (!isMenuOpen) {
            dockToEdgeHandle()
        }
    }

    private val autoDismissResultRunnable = Runnable {
        removeResultOverlay()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    @SuppressLint("InflateParams", "ClickableViewAccessibility")
    override fun onCreate() {
        super.onCreate()
        
        try {
            createNotificationChannel()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                ServiceCompat.startForeground(
                    this,
                    NOTIFICATION_ID,
                    createNotification(),
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
                )
            } else {
                startForeground(NOTIFICATION_ID, createNotification())
            }
        } catch (e: Exception) {
            Log.e("FHM_FLOAT", "Safe startForeground catch", e)
            try {
                startForeground(NOTIFICATION_ID, createNotification())
            } catch (e2: Exception) {
                Log.e("FHM_FLOAT", "startForeground failed completely", e2)
            }
        }

        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        updateScreenDimensions()

        // Init Text to Speech for instant voice reading
        try {
            textToSpeech = TextToSpeech(applicationContext) { status ->
                if (status == TextToSpeech.SUCCESS) {
                    textToSpeech?.language = Locale.forLanguageTag(targetLangCode)
                }
            }
        } catch (e: Exception) {
            Log.e("FHM_FLOAT", "TTS init error", e)
        }

        // Verify overlay permission before adding view to prevent WindowManager BadTokenException crash
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            Log.w("FHM_FLOAT", "Overlay permission not granted. Stopping service cleanly.")
            stopSelf()
            return
        }

        val layoutFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutFlag,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 8
            y = screenHeight / 3
        }

        try {
            floatingView = LayoutInflater.from(this).inflate(R.layout.layout_floating_bubble, null)
            windowManager?.addView(floatingView, params)
        } catch (e: Exception) {
            Log.e("FHM_FLOAT", "Failed to add floating view to WindowManager", e)
            stopSelf()
            return
        }

        setupTouchGestureListener()
        setupQuickMenuListeners()
        resetIdleTimer()
    }

    private fun updateScreenDimensions() {
        val wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        val display = wm.defaultDisplay
        val size = Point()
        display.getRealSize(size)
        screenWidth = size.x
        screenHeight = size.y
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun setupTouchGestureListener() {
        floatingView?.setOnTouchListener(object : View.OnTouchListener {
            private var initialX = 0
            private var initialY = 0
            private var initialTouchX = 0f
            private var initialTouchY = 0f
            private var hasMoved = false

            override fun onTouch(v: View?, event: MotionEvent?): Boolean {
                val action = event?.action ?: return false
                val rawX = event.rawX
                val rawY = event.rawY

                // 1. If quick menu is open, let clicks inside quick menu layout pass to child buttons
                if (isMenuOpen) {
                    val menu = floatingView?.findViewById<View>(R.id.quickMenuLayout)
                    if (menu != null && menu.visibility == View.VISIBLE) {
                        val location = IntArray(2)
                        menu.getLocationOnScreen(location)
                        val menuRect = Rect(
                            location[0],
                            location[1],
                            location[0] + menu.width,
                            location[1] + menu.height
                        )
                        if (menuRect.contains(rawX.toInt(), rawY.toInt())) {
                            // Let the child button receive the touch event and execute its OnClickListener!
                            return false
                        }
                    }

                    // Tapped outside the open menu -> close it
                    if (action == MotionEvent.ACTION_DOWN) {
                        closeQuickMenu()
                        resetIdleTimer()
                        return true
                    }
                }

                when (action) {
                    MotionEvent.ACTION_DOWN -> {
                        handler.removeCallbacks(autoIdleRunnable)
                        initialX = params?.x ?: 0
                        initialY = params?.y ?: 0
                        initialTouchX = rawX
                        initialTouchY = rawY
                        hasMoved = false
                        isDragging = true

                        // Pull complete circular button out immediately on touch
                        if (isSemiHidden) {
                            restoreFullCircularButton()
                            initialX = params?.x ?: 0
                        }
                        return true
                    }

                    MotionEvent.ACTION_MOVE -> {
                        val dx = (rawX - initialTouchX).toInt()
                        val dy = (rawY - initialTouchY).toInt()

                        if (Math.abs(dx) > 15 || Math.abs(dy) > 15) {
                            hasMoved = true
                            closeQuickMenu()
                        }

                        params?.x = initialX + dx
                        params?.y = Math.max(50, Math.min(screenHeight - 180, initialY + dy))
                        try {
                            windowManager?.updateViewLayout(floatingView, params)
                        } catch (e: Exception) {
                            Log.e("FHM_FLOAT", "View layout error", e)
                        }
                        return true
                    }

                    MotionEvent.ACTION_UP -> {
                        isDragging = false
                        val dropX = rawX.toInt()
                        val dropY = rawY.toInt()

                        if (hasMoved) {
                            // Released over text -> extract and translate text right here
                            triggerHaptic()
                            performRealScreenTranslation(dropX, dropY)
                            snapToNearestEdge(dropX, params?.y ?: initialY)
                        } else {
                            // Single tap -> toggle quick menu right here, NEVER force-open MainActivity
                            toggleQuickMenu()
                        }
                        return true
                    }
                }
                return false
            }
        })
    }

    private fun setupQuickMenuListeners() {
        val menu = floatingView?.findViewById<View>(R.id.quickMenuLayout) ?: return

        // 1. Global Screen Translate
        menu.findViewById<View>(R.id.menuGlobalTranslate)?.setOnClickListener {
            closeQuickMenu()
            triggerHaptic()
            performGlobalScreenTranslate()
        }

        // 2. Aim & Translate Info
        menu.findViewById<View>(R.id.menuAimTranslate)?.setOnClickListener {
            closeQuickMenu()
            Toast.makeText(
                this,
                "🔍 বাবলটি আঙুল দিয়ে টেনে যেকোনো লেখার ওপর ছেড়ে দিন",
                Toast.LENGTH_LONG
            ).show()
        }

        // 3. Open Main App
        menu.findViewById<View>(R.id.menuOpenMainApp)?.setOnClickListener {
            closeQuickMenu()
            val openIntent = Intent(this, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            }
            startActivity(openIntent)
        }

        // 4. Close Floating Bubble
        menu.findViewById<View>(R.id.menuCloseFloating)?.setOnClickListener {
            closeQuickMenu()
            stopSelf()
        }
    }

    private fun toggleQuickMenu() {
        val menu = floatingView?.findViewById<View>(R.id.quickMenuLayout) ?: return
        if (isMenuOpen) {
            closeQuickMenu()
            resetIdleTimer()
        } else {
            isMenuOpen = true
            menu.visibility = View.VISIBLE
            handler.removeCallbacks(autoIdleRunnable)
        }
    }

    private fun closeQuickMenu() {
        isMenuOpen = false
        val menu = floatingView?.findViewById<View>(R.id.quickMenuLayout)
        menu?.visibility = View.GONE
    }

    /**
     * Perform real translation at (dropX, dropY)
     * Uses FhmAccessibilityService to inspect exact node under finger
     */
    private fun performRealScreenTranslation(dropX: Int, dropY: Int) {
        val accessibility = FhmAccessibilityService.instance

        if (accessibility == null) {
            // Accessibility service is not enabled yet
            showAccessibilityRequiredCard(dropX, dropY)
            return
        }

        // Show immediate loading indicator card
        showFloatingResultOverlay(dropX, dropY, "স্ক্রিন থেকে টেক্সট পড়া হচ্ছে...", "Detecting text under lens...")

        serviceScope.launch {
            val extractedText = accessibility.extractTextAt(dropX, dropY)
            if (extractedText.isNullOrBlank()) {
                showFloatingResultOverlay(
                    dropX, dropY,
                    "কোনো টেক্সট পাওয়া যায়নি। বাবলটি সরাসরি লেখার ওপর টেনে ধরুন।",
                    "No text found at coordinates ($dropX, $dropY)"
                )
                return@launch
            }

            // Real Google Translate call in background
            val result = TranslationHelper.translate(
                text = extractedText,
                targetLang = targetLangCode,
                sourceLang = "auto"
            )

            showFloatingResultOverlay(
                dropX, dropY,
                result.translatedText,
                result.originalText
            )
        }
    }

    /**
     * Global Screen Translation (Translates all visible text nodes on screen)
     */
    private fun performGlobalScreenTranslate() {
        val accessibility = FhmAccessibilityService.instance
        if (accessibility == null) {
            showAccessibilityRequiredCard(screenWidth / 2, screenHeight / 3)
            return
        }

        showFloatingResultOverlay(
            screenWidth / 2, screenHeight / 3,
            "পুরো স্ক্রিনের টেক্সট স্ক্যান ও অনুবাদ করা হচ্ছে...",
            "Scanning all visible text nodes..."
        )

        serviceScope.launch {
            val allTexts = accessibility.extractAllScreenTexts()
            if (allTexts.isEmpty()) {
                showFloatingResultOverlay(
                    screenWidth / 2, screenHeight / 3,
                    "স্ক্রিনে কোনো পাঠযোগ্য লেখা পাওয়া যায়নি।",
                    "No text detected on screen."
                )
                return@launch
            }

            val combinedText = allTexts.take(8).joinToString("\n• ")
            val result = TranslationHelper.translate(
                text = combinedText,
                targetLang = targetLangCode,
                sourceLang = "auto"
            )

            showFloatingResultOverlay(
                screenWidth / 2, screenHeight / 3,
                result.translatedText,
                "অনুবাদকৃত স্ক্রিন টেক্সট:"
            )
        }
    }

    /**
     * Show friendly card guiding user to turn on Accessibility service (Hi Translate requirement)
     */
    private fun showAccessibilityRequiredCard(x: Int, y: Int) {
        showFloatingResultOverlay(
            x, y,
            "অন্যান্য সব অ্যাপের (WhatsApp, Facebook, ইত্যাদি) লেখা পড়তে 'FHM Translate' এর অ্যাক্সেসিবিলিটি সার্ভিস অন করুন।",
            "Accessibility Service Required"
        )

        val btnSpeak = floatingResultView?.findViewById<View>(R.id.btnSpeakResult)
        val tvSpeak = btnSpeak?.findViewById<TextView>(R.id.tvResultText)
        btnSpeak?.setOnClickListener {
            openAccessibilitySettings()
        }
    }

    private fun openAccessibilitySettings() {
        try {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(intent)
            Toast.makeText(
                this,
                "তালিকা থেকে 'FHM Translate' খুঁজে নিয়ে অন (Allow) করুন",
                Toast.LENGTH_LONG
            ).show()
        } catch (e: Exception) {
            Log.e("FHM_FLOAT", "Cannot open accessibility settings", e)
        }
    }

    /**
     * Animate to nearest edge and dock
     */
    private fun snapToNearestEdge(currentX: Int, targetY: Int) {
        val targetX = if (currentX < screenWidth / 2) {
            dockSide = "left"
            0
        } else {
            dockSide = "right"
            screenWidth - (floatingView?.width ?: 150)
        }

        val startX = params?.x ?: currentX
        val animator = ValueAnimator.ofInt(startX, targetX)
        animator.duration = 200
        animator.interpolator = DecelerateInterpolator()
        animator.addUpdateListener { anim ->
            params?.x = anim.animatedValue as Int
            params?.y = targetY
            try {
                windowManager?.updateViewLayout(floatingView, params)
            } catch (e: Exception) {
                // Ignore
            }
        }
        animator.start()

        isSemiHidden = false
        resetIdleTimer()
    }

    private fun dockToEdgeHandle() {
        if (isDragging || isSemiHidden || isMenuOpen) return
        isSemiHidden = true

        val fullBubble = floatingView?.findViewById<View>(R.id.fullBubbleLayout)
        val handleView = floatingView?.findViewById<View>(R.id.collapsedHandle)

        fullBubble?.visibility = View.GONE
        handleView?.visibility = View.VISIBLE

        if (dockSide == "left") {
            params?.x = 0
        } else {
            params?.x = screenWidth - (handleView?.width ?: 45)
        }

        try {
            windowManager?.updateViewLayout(floatingView, params)
        } catch (e: Exception) {
            // Ignore
        }
    }

    private fun restoreFullCircularButton() {
        isSemiHidden = false
        val fullBubble = floatingView?.findViewById<View>(R.id.fullBubbleLayout)
        val handleView = floatingView?.findViewById<View>(R.id.collapsedHandle)

        handleView?.visibility = View.GONE
        fullBubble?.visibility = View.VISIBLE

        if (dockSide == "left") {
            params?.x = 8
        } else {
            params?.x = screenWidth - (fullBubble?.width ?: 150) - 8
        }

        try {
            windowManager?.updateViewLayout(floatingView, params)
        } catch (e: Exception) {
            // Ignore
        }
    }

    private fun resetIdleTimer() {
        handler.removeCallbacks(autoIdleRunnable)
        handler.postDelayed(autoIdleRunnable, 3500)
    }

    @SuppressLint("InflateParams")
    private fun showFloatingResultOverlay(x: Int, y: Int, translatedText: String, originalText: String) {
        removeResultOverlay()

        val layoutFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        resultParams = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutFlag,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            this.x = Math.max(20, Math.min(screenWidth - 340, x - 150))
            this.y = Math.max(80, Math.min(screenHeight - 380, y + 40))
        }

        floatingResultView = LayoutInflater.from(this).inflate(R.layout.layout_floating_result_card, null)
        val tvResult = floatingResultView?.findViewById<TextView>(R.id.tvResultText)
        val tvOriginal = floatingResultView?.findViewById<TextView>(R.id.tvOriginalText)
        val btnClose = floatingResultView?.findViewById<ImageView>(R.id.btnCloseResult)
        val btnSpeak = floatingResultView?.findViewById<View>(R.id.btnSpeakResult)
        val btnCopy = floatingResultView?.findViewById<View>(R.id.btnCopyResult)

        tvResult?.text = translatedText
        tvOriginal?.text = originalText

        btnClose?.setOnClickListener {
            removeResultOverlay()
        }

        btnSpeak?.setOnClickListener {
            triggerHaptic()
            textToSpeech?.speak(translatedText, TextToSpeech.QUEUE_FLUSH, null, "fhm_res_tts")
        }

        btnCopy?.setOnClickListener {
            triggerHaptic()
            val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = ClipData.newPlainText("FHM Translate", translatedText)
            clipboard.setPrimaryClip(clip)
            Toast.makeText(this, "অনুবাদ কপি করা হয়েছে", Toast.LENGTH_SHORT).show()
        }

        try {
            windowManager?.addView(floatingResultView, resultParams)
        } catch (e: Exception) {
            Log.e("FHM_FLOAT", "Failed to add floatingResultView", e)
        }

        handler.removeCallbacks(autoDismissResultRunnable)
        handler.postDelayed(autoDismissResultRunnable, 14000)
    }

    private fun removeResultOverlay() {
        if (floatingResultView != null) {
            try {
                windowManager?.removeView(floatingResultView)
            } catch (e: Exception) {
                // Ignore
            }
            floatingResultView = null
        }
    }

    private fun triggerHaptic() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator?.vibrate(VibrationEffect.createOneShot(30, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            vibrator?.vibrate(30)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == "ACTION_STOP_SERVICE") {
            stopSelf()
            return START_NOT_STICKY
        }
        val target = intent?.getStringExtra("TARGET_LANG")
        if (!target.isNullOrBlank()) {
            targetLangCode = target
            val flagView = floatingView?.findViewById<TextView>(R.id.tvBubbleTargetFlag)
            flagView?.text = "🇧🇩 ${target.uppercase()}"
        }
        return START_STICKY
    }

    private fun createNotification(): Notification {
        val openIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingOpenIntent = PendingIntent.getActivity(
            this, 0, openIntent,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        )

        val stopIntent = Intent(this, FloatingTranslatorService::class.java).apply {
            action = "ACTION_STOP_SERVICE"
        }
        val pendingStopIntent = PendingIntent.getService(
            this, 1, stopIntent,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("FHM Translate (Hi Translate মোড সক্রিয়)")
            .setContentText("স্ক্রিনের পাশের বারটি টেনে যেকোনো লেখার ওপর ধরুন")
            .setSmallIcon(R.drawable.ic_fhm_logo)
            .setOngoing(true)
            .setContentIntent(pendingOpenIntent)
            .addAction(R.drawable.ic_open, "অ্যাপ খুলুন", pendingOpenIntent)
            .addAction(R.drawable.ic_close, "লুকান", pendingStopIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "FHM Floating Translator Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "FHM Translate floating screen translator"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacks(autoIdleRunnable)
        handler.removeCallbacks(autoDismissResultRunnable)
        removeResultOverlay()
        if (floatingView != null) {
            try {
                windowManager?.removeView(floatingView)
            } catch (e: Exception) {
                // Ignore
            }
            floatingView = null
        }
        textToSpeech?.stop()
        textToSpeech?.shutdown()
    }
}
