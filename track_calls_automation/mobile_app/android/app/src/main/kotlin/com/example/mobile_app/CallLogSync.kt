package com.example.mobile_app

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.provider.CallLog
import android.text.format.DateFormat
import android.util.Log
import androidx.core.content.ContextCompat
import java.util.Date

object CallLogSync {
    private const val TAG = "CallLogSync"

    fun syncLatest(context: Context) {
        val hasPermission = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.READ_CALL_LOG
        ) == PackageManager.PERMISSION_GRANTED
        if (!hasPermission) {
            Log.w(TAG, "READ_CALL_LOG not granted; skipping sync")
            return
        }
        try {
            val db = CallDatabase(context)
            val projection = arrayOf(
                CallLog.Calls._ID,
                CallLog.Calls.NUMBER,
                CallLog.Calls.TYPE,
                CallLog.Calls.DATE,
                CallLog.Calls.DURATION
            )
            val cursor = context.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                projection,
                null,
                null,
                "${CallLog.Calls.DATE} DESC"
            ) ?: return

            var processed = 0
            var inserted = 0
            cursor.use {
                while (it.moveToNext()) {
                    val systemId = it.getLong(it.getColumnIndexOrThrow(CallLog.Calls._ID)).toString()
                    val number = it.getString(it.getColumnIndexOrThrow(CallLog.Calls.NUMBER)) ?: "Unknown"
                    val type = it.getInt(it.getColumnIndexOrThrow(CallLog.Calls.TYPE))
                    val callType = mapCallType(type) ?: continue
                    val dateMillis = it.getLong(it.getColumnIndexOrThrow(CallLog.Calls.DATE))
                    val duration = it.getLong(it.getColumnIndexOrThrow(CallLog.Calls.DURATION)).toInt()
                    val timestamp = DateFormat.format("dd-MMM-yyyy HH:mm", Date(dateMillis)).toString()

                    val rowId = db.insertCallLogFromSystem(
                        phoneNumber = number,
                        callType = callType,
                        durationSeconds = duration,
                        timestamp = timestamp,
                        systemCallId = systemId
                    )
                    if (rowId != -1L) inserted++
                    processed++
                    if (processed >= 10) break
                }
            }
            Log.d(TAG, "syncLatest processed=$processed inserted=$inserted")
        } catch (e: SecurityException) {
            Log.e(TAG, "READ_CALL_LOG permission denied during sync", e)
        } catch (e: Exception) {
            Log.e(TAG, "Call log sync failed", e)
        }
    }

    private fun mapCallType(type: Int): String? {
        return when (type) {
            CallLog.Calls.OUTGOING_TYPE -> "Outgoing"
            CallLog.Calls.INCOMING_TYPE -> "Incoming"
            CallLog.Calls.MISSED_TYPE -> "Missed"
            CallLog.Calls.REJECTED_TYPE -> "Rejected"
            CallLog.Calls.BLOCKED_TYPE -> "Blocked"
            else -> null
        }
    }
}
