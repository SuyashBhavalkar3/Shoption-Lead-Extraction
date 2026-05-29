package com.example.mobile_app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager
import android.util.Log

class CallReceiver : BroadcastReceiver() {
    private val tag = "CallReceiver"

    companion object {
        private var wasInCallSession = false
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return
        val prefs = context.getSharedPreferences("call_tracker_prefs", Context.MODE_PRIVATE)
        val isTrackingEnabled = prefs.getBoolean("tracking_enabled", false)
        if (!isTrackingEnabled) {
            Log.d(tag, "tracking disabled, ignoring broadcast")
            return
        }

        when (intent.action) {
            TelephonyManager.ACTION_PHONE_STATE_CHANGED -> {
                val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE)
                Log.d(tag, "PHONE_STATE_CHANGED state=$state")

                when (state) {
                    TelephonyManager.EXTRA_STATE_RINGING,
                    TelephonyManager.EXTRA_STATE_OFFHOOK -> wasInCallSession = true
                    TelephonyManager.EXTRA_STATE_IDLE -> {
                        if (wasInCallSession) {
                            Log.d(tag, "call session ended, syncing call logs")
                            CallLogSync.syncLatest(context)
                        }
                        wasInCallSession = false
                    }
                }
            }
        }
    }
}
