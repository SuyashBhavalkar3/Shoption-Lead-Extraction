package com.example.mobile_app

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class CallDatabase(context: Context) :
    SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

    companion object {
        const val DATABASE_NAME = "call_tracker.db"
        const val DATABASE_VERSION = 2
        const val TABLE_NAME = "call_logs"
        const val COL_ID = "id"
        const val COL_PHONE_NUMBER = "phone_number"
        const val COL_CALL_TYPE = "call_type"
        const val COL_TIMESTAMP = "timestamp"
        const val COL_DURATION = "duration_seconds"
        const val COL_SYSTEM_CALL_ID = "system_call_id"
    }

    override fun onCreate(db: SQLiteDatabase?) {
        db?.execSQL(
            """
            CREATE TABLE $TABLE_NAME (
                $COL_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                $COL_PHONE_NUMBER TEXT,
                $COL_CALL_TYPE TEXT,
                $COL_TIMESTAMP TEXT,
                $COL_DURATION INTEGER,
                $COL_SYSTEM_CALL_ID TEXT UNIQUE
            )
            """.trimIndent()
        )
    }

    override fun onUpgrade(db: SQLiteDatabase?, oldVersion: Int, newVersion: Int) {
        if (db == null) return
        if (oldVersion < 2) {
            db.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN $COL_SYSTEM_CALL_ID TEXT")
            db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS idx_system_call_id ON $TABLE_NAME($COL_SYSTEM_CALL_ID)")
        }
    }

    fun insertCallLog(
        phoneNumber: String,
        callType: String,
        durationSeconds: Int
    ): Long {
        val db = writableDatabase
        val values = ContentValues().apply {
            put(COL_PHONE_NUMBER, phoneNumber)
            put(COL_CALL_TYPE, callType)
            put(COL_TIMESTAMP, SimpleDateFormat("dd-MMM-yyyy HH:mm", Locale.getDefault()).format(Date()))
            put(COL_DURATION, durationSeconds)
        }
        return db.insert(TABLE_NAME, null, values)
    }

    fun insertCallLogFromSystem(
        phoneNumber: String,
        callType: String,
        durationSeconds: Int,
        timestamp: String,
        systemCallId: String
    ): Long {
        val db = writableDatabase
        val values = ContentValues().apply {
            put(COL_PHONE_NUMBER, phoneNumber)
            put(COL_CALL_TYPE, callType)
            put(COL_TIMESTAMP, timestamp)
            put(COL_DURATION, durationSeconds)
            put(COL_SYSTEM_CALL_ID, systemCallId)
        }
        return db.insertWithOnConflict(TABLE_NAME, null, values, SQLiteDatabase.CONFLICT_IGNORE)
    }

    fun getAllCallLogs(): List<Map<String, Any>> {
        val db = readableDatabase
        val cursor = db.query(
            TABLE_NAME,
            null,
            null,
            null,
            null,
            null,
            "$COL_ID DESC"
        )

        val logs = mutableListOf<Map<String, Any>>()
        if (cursor.moveToFirst()) {
            do {
                val log = mapOf<String, Any>(
                    COL_ID to cursor.getInt(cursor.getColumnIndexOrThrow(COL_ID)),
                    COL_PHONE_NUMBER to cursor.getString(cursor.getColumnIndexOrThrow(COL_PHONE_NUMBER)),
                    COL_CALL_TYPE to cursor.getString(cursor.getColumnIndexOrThrow(COL_CALL_TYPE)),
                    COL_TIMESTAMP to cursor.getString(cursor.getColumnIndexOrThrow(COL_TIMESTAMP)),
                    COL_DURATION to cursor.getInt(cursor.getColumnIndexOrThrow(COL_DURATION))
                )
                logs.add(log)
            } while (cursor.moveToNext())
        }
        cursor.close()
        return logs
    }
}
