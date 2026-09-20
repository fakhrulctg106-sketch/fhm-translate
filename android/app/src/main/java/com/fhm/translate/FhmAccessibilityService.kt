package com.fhm.translate

import android.accessibilityservice.AccessibilityService
import android.graphics.Rect
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * FHM Translate - Accessibility Service for 100% Real-Time Screen Text Reading
 * Same architecture used by Hi Translate & U-Dictionary
 * Allows reading text at (x, y) coordinates from any Android application (WhatsApp, Messenger, Chrome, etc.)
 */
class FhmAccessibilityService : AccessibilityService() {

    companion object {
        var instance: FhmAccessibilityService? = null
            private set

        fun isServiceRunning(): Boolean = instance != null
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        Log.d("FHM_ACCESSIBILITY", "FHM Accessibility Service successfully connected and active.")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Passive listening for screen changes
    }

    override fun onInterrupt() {
        Log.w("FHM_ACCESSIBILITY", "FHM Accessibility Service interrupted")
    }

    override fun onDestroy() {
        super.onDestroy()
        if (instance == this) {
            instance = null
        }
        Log.d("FHM_ACCESSIBILITY", "FHM Accessibility Service destroyed")
    }

    /**
     * Extract text at specific screen coordinates (dropX, dropY)
     * Matches the exact point where user released or pointed the floating lens
     */
    fun extractTextAt(dropX: Int, dropY: Int): String? {
        val root = rootInActiveWindow ?: return null
        val bestNode = findBestNode(root, dropX, dropY)
        val text = bestNode?.text?.toString() ?: bestNode?.contentDescription?.toString()
        if (!text.isNullOrBlank()) {
            return text.trim()
        }

        // If exact point didn't hit text, look at all active window nodes in the vicinity
        val nearbyNode = findNearbyNode(root, dropX, dropY)
        val nearbyText = nearbyNode?.text?.toString() ?: nearbyNode?.contentDescription?.toString()
        return nearbyText?.trim()
    }

    /**
     * Recursive search for the deepest leaf node containing (x, y)
     */
    private fun findBestNode(node: AccessibilityNodeInfo?, x: Int, y: Int): AccessibilityNodeInfo? {
        if (node == null) return null

        val bounds = Rect()
        node.getBoundsInScreen(bounds)

        // Expand bounds slightly to account for touch precision
        val paddedBounds = Rect(bounds.left - 20, bounds.top - 20, bounds.right + 20, bounds.bottom + 20)
        if (!paddedBounds.contains(x, y)) {
            return null
        }

        // Check children first to get the most specific inner element (e.g. TextView inside a LinearLayout)
        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            val leaf = findBestNode(child, x, y)
            if (leaf != null) {
                val leafText = leaf.text?.toString() ?: leaf.contentDescription?.toString()
                if (!leafText.isNullOrBlank()) {
                    return leaf
                }
            }
        }

        val selfText = node.text?.toString() ?: node.contentDescription?.toString()
        if (!selfText.isNullOrBlank()) {
            return node
        }

        return null
    }

    /**
     * Fallback search: find the closest text element within 80dp radius
     */
    private fun findNearbyNode(node: AccessibilityNodeInfo?, x: Int, y: Int): AccessibilityNodeInfo? {
        if (node == null) return null

        val bounds = Rect()
        node.getBoundsInScreen(bounds)

        val selfText = node.text?.toString() ?: node.contentDescription?.toString()
        if (!selfText.isNullOrBlank()) {
            val dist = Math.hypot((bounds.centerX() - x).toDouble(), (bounds.centerY() - y).toDouble())
            if (dist < 200) {
                return node
            }
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            val found = findNearbyNode(child, x, y)
            if (found != null) return found
        }

        return null
    }

    /**
     * Extract all visible text blocks on screen for Full Screen Translation
     */
    fun extractAllScreenTexts(): List<String> {
        val root = rootInActiveWindow ?: return emptyList()
        val results = mutableListOf<String>()
        collectAllTexts(root, results)
        return results
    }

    private fun collectAllTexts(node: AccessibilityNodeInfo?, list: MutableList<String>) {
        if (node == null) return
        val text = node.text?.toString() ?: node.contentDescription?.toString()
        if (!text.isNullOrBlank() && text.length > 1 && !list.contains(text.trim())) {
            list.add(text.trim())
        }
        for (i in 0 until node.childCount) {
            collectAllTexts(node.getChild(i), list)
        }
    }
}
