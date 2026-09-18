package com.fhm.translate

import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.graphics.Point
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.view.animation.DecelerateInterpolator
import android.widget.ImageView
import android.widget.TextView
import androidx.core.app.NotificationCompat

/**
 * FHM Translate - Native Android Edge-Docked Floating Screen Translator Service
 * Real Android Native WindowManager Overlay
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

    // State & Timers
    private val handler = Handler(Looper.getMainLooper())
    private var isSemiHidden = false
    private var isDragging = false
    private var screenWidth = 1080
    private var screenHeight = 1920
    private var dockSide: String = "left" // "left" or "right"
    private val BUBBLE_SIZE_PX = 160 // approx 56dp
    private val VISIBLE_EDGE_TAB_PX = 50 // approx 18dp visible tab when tucked

    private val autoInactivityRunnable = Runnable {
        slideIntoEdge()
    }

    private val autoDismissResultRunnable = Runnable {
        removeResultOverlay()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    @SuppressLint("InflateParams", "ClickableViewAccessibility")
    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, createNotification())

        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        updateScreenDimensions()

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
            x = 16
            y = screenHeight / 4
        }

        floatingView = LayoutInflater.from(this).inflate(R.layout.layout_floating_bubble, null)
        windowManager?.addView(floatingView, params)

        setupTouchGestureListener()
        resetInactivityTimer()
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
                when (event?.action) {
                    MotionEvent.ACTION_DOWN -> {
                        handler.removeCallbacks(autoInactivityRunnable)
                        initialX = params?.x ?: 0
                        initialY = params?.y ?: 0
                        initialTouchX = event.rawX
                        initialTouchY = event.rawY
                        hasMoved = false
                        isDragging = true

                        // Step 11: If semi-hidden at edge, smoothly pull the complete circular bubble back
                        if (isSemiHidden) {
                            pullOutFromEdge()
                        }
                        return true
                    }

                    MotionEvent.ACTION_MOVE -> {
                        val dx = (event.rawX - initialTouchX).toInt()
                        val dy = (event.rawY - initialTouchY).toInt()

                        if (Math.abs(dx) > 12 || Math.abs(dy) > 12) {
                            hasMoved = true
                        }

                        params?.x = initialX + dx
                        params?.y = Math.max(60, Math.min(screenHeight - 200, initialY + dy))
                        try {
                            windowManager?.updateViewLayout(floatingView, params)
                        } catch (e: Exception) {
                            // View layout exception safety
                        }
                        return true
                    }

                    MotionEvent.ACTION_UP -> {
                        isDragging = false
                        val dropX = event.rawX.toInt()
                        val dropY = event.rawY.toInt()

                        if (hasMoved) {
                            // Step 4: Released over target area -> single-shot OCR & localized screen translation
                            performDropTranslation(dropX, dropY)
                        } else {
                            // Single tap -> open floating options panel
                            openFloatingControls()
                        }

                        // Step 5: Automatically snap bubble toward nearest screen edge
                        snapToNearestEdge(dropX, params?.y ?: initialY)
                        return true
                    }
                }
                return false
            }
        })
    }

    /**
     * Step 5 & 6: Smoothly animate bubble to the nearest edge and keep circular initially
     */
    private fun snapToNearestEdge(currentX: Int, targetY: Int) {
        val targetX = if (currentX < screenWidth / 2) {
            dockSide = "left"
            16
        } else {
            dockSide = "right"
            screenWidth - BUBBLE_SIZE_PX - 16
        }

        val startX = params?.x ?: currentX
        val animator = ValueAnimator.ofInt(startX, targetX)
        animator.duration = 250
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
        resetInactivityTimer()
    }

    /**
     * Step 7, 8 & 9: Auto slide deeper toward edge, keeping a small visible tab (DO NOT remove completely)
     */
    private fun slideIntoEdge() {
        if (isDragging || isSemiHidden) return
        isSemiHidden = true

        val startX = params?.x ?: 16
        val targetX = if (dockSide == "left") {
            - (BUBBLE_SIZE_PX - VISIBLE_EDGE_TAB_PX)
        } else {
            screenWidth - VISIBLE_EDGE_TAB_PX
        }

        val animator = ValueAnimator.ofInt(startX, targetX)
        animator.duration = 300
        animator.interpolator = DecelerateInterpolator()
        animator.addUpdateListener { anim ->
            params?.x = anim.animatedValue as Int
            try {
                windowManager?.updateViewLayout(floatingView, params)
            } catch (e: Exception) {
                // Ignore
            }
        }
        animator.start()
    }

    /**
     * Step 11: Smoothly pull complete circular bubble back onto the screen
     */
    private fun pullOutFromEdge() {
        isSemiHidden = false
        val targetX = if (dockSide == "left") 16 else screenWidth - BUBBLE_SIZE_PX - 16
        params?.x = targetX
        try {
            windowManager?.updateViewLayout(floatingView, params)
        } catch (e: Exception) {
            // Ignore
        }
    }

    private fun resetInactivityTimer() {
        handler.removeCallbacks(autoInactivityRunnable)
        handler.postDelayed(autoInactivityRunnable, 3500) // 3.5 seconds
    }

    /**
     * Step 4: Perform single drop translation with explicit consent
     */
    private fun performDropTranslation(dropX: Int, dropY: Int) {
        val intent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            putExtra("ACTION", "SCREEN_DROP_TRANSLATE")
            putExtra("DROP_X", dropX)
            putExtra("DROP_Y", dropY)
        }
        showFloatingResultOverlay(dropX, dropY, "Detecting & translating text...")
    }

    @SuppressLint("InflateParams")
    private fun showFloatingResultOverlay(x: Int, y: Int, text: String) {
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
            this.x = Math.max(20, Math.min(screenWidth - 450, x - 100))
            this.y = Math.max(80, Math.min(screenHeight - 350, y + 50))
        }

        floatingResultView = LayoutInflater.from(this).inflate(R.layout.layout_floating_result_card, null)
        val tvText = floatingResultView?.findViewById<TextView>(R.id.tvResultText)
        val btnClose = floatingResultView?.findViewById<View>(R.id.btnCloseResult)

        tvText?.text = text
        btnClose?.setOnClickListener {
            removeResultOverlay()
        }

        windowManager?.addView(floatingResultView, resultParams)

        handler.removeCallbacks(autoDismissResultRunnable)
        handler.postDelayed(autoDismissResultRunnable, 10000)
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

    private fun openFloatingControls() {
        val openIntent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            putExtra("TRIGGER_ACTION", "OPEN_FLOAT_PANEL")
        }
        startActivity(openIntent)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == "UPDATE_RESULT_TEXT") {
            val translatedText = intent.getStringExtra("TRANSLATED_TEXT") ?: ""
            val dropX = intent.getIntExtra("DROP_X", screenWidth / 2)
            val dropY = intent.getIntExtra("DROP_Y", screenHeight / 2)
            showFloatingResultOverlay(dropX, dropY, translatedText)
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
            .setContentTitle("FHM Translate")
            .setContentText("Drag 🔵 FHM bubble over screen text to translate.")
            .setSmallIcon(R.drawable.ic_fhm_logo)
            .setOngoing(true)
            .setContentIntent(pendingOpenIntent)
            .addAction(R.drawable.ic_open, "Open App", pendingOpenIntent)
            .addAction(R.drawable.ic_close, "Stop", pendingStopIntent)
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
                description = "Shows active status for FHM Translate edge-docked floating overlay."
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacks(autoInactivityRunnable)
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
    }
}
