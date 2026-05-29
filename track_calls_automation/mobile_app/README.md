# Call Tracker - Android App

A minimal Flutter Android application for tracking SIM-based incoming and outgoing calls. The app runs in the background using a foreground service and stores all call records in SQLite.

## Features

- **Automatic Call Tracking**: Detects incoming, outgoing, and missed calls
- **Background Service**: Uses Android Foreground Service to continue tracking when app is minimized
- **Local Storage**: Stores all call records in SQLite database
- **Persistent Notification**: Shows "Call Tracking Active" notification while tracking
- **Simple UI**: Minimal interface with Start/Stop buttons and call history list

## Project Structure

```
mobile_app/
├── lib/
│   └── main.dart              # Flutter UI with call tracking control
├── android/app/src/main/
│   ├── kotlin/com/example/mobile_app/
│   │   ├── MainActivity.kt     # Flutter activity with platform channel
│   │   ├── CallTrackingService.kt  # Foreground service for call detection
│   │   ├── CallReceiver.kt     # BroadcastReceiver for phone state changes
│   │   └── CallDatabase.kt     # SQLite database helper
│   └── AndroidManifest.xml     # Permissions and service declarations
├── pubspec.yaml               # Flutter dependencies
└── README.md                  # This file
```

## Technical Details

### Database Schema

SQLite table: `call_logs`
- `id` (INTEGER PRIMARY KEY)
- `phone_number` (TEXT)
- `call_type` (TEXT) - "Incoming", "Outgoing", or "Missed"
- `timestamp` (TEXT) - Format: "dd-MMM-yyyy HH:mm"
- `duration_seconds` (INTEGER)

### Android Permissions

- `READ_PHONE_STATE` - Monitor phone call state
- `READ_CALL_LOG` - Access call log data
- `FOREGROUND_SERVICE` - Run service in foreground with notification
- `RECEIVE_BOOT_COMPLETED` - Optional: auto-start on device boot
- `POST_NOTIFICATIONS` - Show persistent notification

### Platform Channel

The app uses a MethodChannel (`com.example.calltracker/tracking`) for communication between Flutter and Kotlin:

**Methods:**
- `startTracking()` - Start the call tracking service
- `stopTracking()` - Stop the call tracking service
- `getTrackingStatus()` - Get current tracking status

## Setup Instructions

### Prerequisites

- Flutter SDK (latest stable)
- Android SDK (API level 21+)
- Kotlin enabled in project
- A physical Android device (recommended for testing)

### Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd mobile_app
   ```

2. **Get Flutter dependencies:**
   ```bash
   flutter pub get
   ```

3. **Update app package name (if needed):**
   - Edit `android/app/build.gradle.kts`:
     - Change `applicationId` to your desired package name
   - Update `android/app/src/main/AndroidManifest.xml`:
     - Change package attribute
   - Update Kotlin files package declarations

4. **Build and run:**
   ```bash
   flutter run
   ```

### First Run Setup

1. **Grant Permissions**: When you first tap "Start Tracking", the app will request permissions:
   - Grant "Receive call notifications" (READ_PHONE_STATE)
   - Grant "Access call history" (READ_CALL_LOG)
   - Grant "Display over other apps" (for notification)

2. **Test Call Tracking**:
   - Tap "Start Tracking" button
   - Make a test call (incoming or outgoing)
   - Return to the app
   - Call records should appear in the list below

## Usage

### Basic Flow

1. **Start Tracking**
   - Tap "Start Tracking" button
   - Foreground service starts
   - Persistent notification appears
   - Service monitors all incoming and outgoing calls

2. **End Tracking**
   - Tap "Stop Tracking" button
   - Service stops
   - Notification disappears
   - Previously recorded calls remain in database

3. **View Call Records**
   - All calls are displayed in the list below the buttons
   - Pull down to refresh the list
   - Each record shows:
     - Phone number
     - Call type (Incoming/Outgoing)
     - Duration in seconds
     - Timestamp

### Call Types

- **Incoming**: Received calls (regardless of whether answered)
- **Outgoing**: Initiated calls
- **Missed**: Calls that weren't answered (tracked as Incoming with 0 duration)

## Troubleshooting

### Calls Not Being Tracked

1. **Check if tracking is enabled**
   - Verify status shows "Tracking Enabled"
   - Check that persistent notification is visible

2. **Verify permissions are granted**
   - Go to Settings > Apps > Call Tracker > Permissions
   - Ensure READ_PHONE_STATE and READ_CALL_LOG are enabled

3. **Restart the service**
   - Tap "Stop Tracking"
   - Tap "Start Tracking" again

### No Call Records After Making a Call

1. Ensure you waited for call to complete
2. Refresh the list (pull down)
3. Check logcat for errors:
   ```bash
   adb logcat | grep CallTracker
   ```

### Notification Not Showing

1. Ensure POST_NOTIFICATIONS permission is granted
2. Check system notification settings for the app
3. Restart the app and tracking service

## Database Access

To view database contents during development:

```bash
adb shell
run-as com.example.mobile_app
cd /data/data/com.example.mobile_app/databases
sqlite3 call_tracker.db
SELECT * FROM call_logs;
```

## Building for Release

```bash
flutter build apk --release
```

The APK will be generated at:
```
build/app/outputs/flutter-apk/app-release.apk
```

## Known Limitations

- Only tracks SIM-based calls (not VoIP calls like WhatsApp/Telegram)
- Foreground service requires persistent notification on Android 8.0+
- Missed call detection relies on call state transitions (not always accurate)
- Database not encrypted (suitable for personal testing only)

## Future Enhancements

- Data export (CSV/JSON)
- Call filtering and search
- Statistics and call duration graphs
- Automatic backup to local storage
- Multi-SIM support

## License

This is a minimal demonstration project. Use as needed for learning and development purposes.
