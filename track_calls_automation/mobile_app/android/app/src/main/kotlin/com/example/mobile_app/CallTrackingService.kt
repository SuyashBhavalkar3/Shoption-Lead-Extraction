package com.example.mobile_app

import android.app.Service
import android.content.pm.ServiceInfo
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Handler
import android.app.NotificationManager
import android.app.NotificationChannel
import android.app.PendingIntent
import android.content.Context
import android.content.SharedPreferences
import android.database.ContentObserver
import android.provider.CallLog
import android.util.Log
import androidx.core.app.NotificationCompat

class CallTrackingService : Service() {
    private val tag = "CallTrackingService"

    companion object {
        var isTracking = false
        private const val NOTIFICATION_ID = 1
        private const val CHANNEL_ID = "call_tracking_channel"
        private const val PREFS_NAME = "call_tracker_prefs"
        private const val KEY_TRACKING_ENABLED = "tracking_enabled"
    }

    private lateinit var callReceiver: CallReceiver
    private var receiverRegistered = false
    private var callLogObserver: ContentObserver? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        isTracking = isTrackingPersisted()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        try {
            when (intent?.action) {
                "START_TRACKING" -> {
                    val started = startTracking()
                    Log.d(tag, "START_TRACKING requested started=$started")
                    if (!started) {
                        return START_NOT_STICKY
                    }
                }
                "STOP_TRACKING" -> {
                    stopTracking()
                }
            }
        } catch (e: Exception) {
            Log.e(tag, "Service start failed", e)
            isTracking = false
            persistTrackingState(false)
            stopSelf()
            return START_NOT_STICKY
        }
        return START_STICKY
    }

    private fun startTracking(): Boolean {
        // Must enter foreground immediately after startForegroundService() to avoid timeout kill.
        try {
            val notification = buildNotification()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                )
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (e: Exception) {
            Log.e(tag, "startForeground failed", e)
            isTracking = false
            persistTrackingState(false)
            stopSelf()
            return false
        }

        if (!isTracking) {
            isTracking = true
            persistTrackingState(true)
        }
        Log.d(tag, "tracking active; ensuring receiver + observer are registered")

        if (!receiverRegistered) {
            callReceiver = CallReceiver()
            val filter = IntentFilter().apply {
                addAction(android.telephony.TelephonyManager.ACTION_PHONE_STATE_CHANGED)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(callReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                registerReceiver(callReceiver, filter)
            }
            receiverRegistered = true
        }

        registerCallLogObserver()
        CallLogSync.syncLatest(this)
        Log.d(tag, "initial sync triggered")
        return true
    }

    private fun stopTracking() {
        if (!isTracking) return

        isTracking = false
        persistTrackingState(false)
        Log.d(tag, "tracking disabled")
        try {
            if (receiverRegistered) {
                unregisterReceiver(callReceiver)
                receiverRegistered = false
            }
        } catch (e: Exception) {
            // Receiver was not registered
        }
        unregisterCallLogObserver()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun buildNotification(): android.app.Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Call Tracking Active")
            .setContentText("Call Tracker is running")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Call Tracking",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun prefs(): SharedPreferences {
        return getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    private fun persistTrackingState(enabled: Boolean) {
        prefs().edit().putBoolean(KEY_TRACKING_ENABLED, enabled).apply()
    }

    private fun isTrackingPersisted(): Boolean {
        return prefs().getBoolean(KEY_TRACKING_ENABLED, false)
    }

    private fun registerCallLogObserver() {
        if (callLogObserver != null) return
        callLogObserver = object : ContentObserver(Handler(mainLooper)) {
            override fun onChange(selfChange: Boolean) {
                super.onChange(selfChange)
                CallLogSync.syncLatest(this@CallTrackingService)
            }
        }
        contentResolver.registerContentObserver(
            CallLog.Calls.CONTENT_URI,
            true,
            callLogObserver as ContentObserver
        )
    }

    private fun unregisterCallLogObserver() {
        callLogObserver?.let {
            contentResolver.unregisterContentObserver(it)
        }
        callLogObserver = null
    }

    override fun onBind(intent: Intent?) = null
}
