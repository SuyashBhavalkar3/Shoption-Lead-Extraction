package com.example.mobile_app

import android.Manifest
import android.content.Intent
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity: FlutterActivity() {
    private val CHANNEL = "com.example.calltracker/tracking"
    private val PREFS_NAME = "call_tracker_prefs"
    private val KEY_TRACKING_ENABLED = "tracking_enabled"
    private val REQUEST_CODE_REQUIRED_PERMISSIONS = 4101
    private var pendingPermissionResult: MethodChannel.Result? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "startTracking" -> {
                    val hasPhoneStatePermission = hasPermission(Manifest.permission.READ_PHONE_STATE)
                    val hasCallLogPermission = hasPermission(Manifest.permission.READ_CALL_LOG)
                    if (!hasPhoneStatePermission || !hasCallLogPermission) {
                        result.error(
                            "PERMISSION_DENIED",
                            "Phone and Call Log permissions are required before starting tracking",
                            null
                        )
                        return@setMethodCallHandler
                    }

                    val intent = Intent(this, CallTrackingService::class.java)
                    intent.action = "START_TRACKING"
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(intent)
                    } else {
                        startService(intent)
                    }
                    result.success(null)
                }
                "requestRequiredPermissions" -> {
                    val hasPhoneStatePermission = hasPermission(Manifest.permission.READ_PHONE_STATE)
                    val hasCallLogPermission = hasPermission(Manifest.permission.READ_CALL_LOG)
                    if (hasPhoneStatePermission && hasCallLogPermission) {
                        result.success(true)
                    } else {
                        pendingPermissionResult = result
                        ActivityCompat.requestPermissions(
                            this,
                            arrayOf(
                                Manifest.permission.READ_PHONE_STATE,
                                Manifest.permission.READ_CALL_LOG
                            ),
                            REQUEST_CODE_REQUIRED_PERMISSIONS
                        )
                    }
                }
                "stopTracking" -> {
                    val intent = Intent(this, CallTrackingService::class.java)
                    intent.action = "STOP_TRACKING"
                    stopService(intent)
                    result.success(null)
                }
                "getTrackingStatus" -> {
                    val status = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                        .getBoolean(KEY_TRACKING_ENABLED, false)
                    result.success(status)
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun hasPermission(permission: String): Boolean {
        return ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != REQUEST_CODE_REQUIRED_PERMISSIONS) return

        val allGranted = grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }
        pendingPermissionResult?.success(allGranted)
        pendingPermissionResult = null
    }
}
