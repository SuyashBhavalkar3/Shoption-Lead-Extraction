// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';

import 'package:mobile_app/main.dart';

void main() {
  testWidgets('Call Tracker UI renders', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const CallTrackerApp());

    // Verify that the app title is present.
    expect(find.text('Call Tracker'), findsWidgets);

    // Verify that the status text is present.
    expect(find.text('Status: Tracking Disabled'), findsOneWidget);

    // Verify that the Start/Stop buttons are present.
    expect(find.text('Start Tracking'), findsOneWidget);
    expect(find.text('Stop Tracking'), findsOneWidget);

    // Verify that the call records header is present.
    expect(find.text('Call Records (0)'), findsOneWidget);
  });
}
