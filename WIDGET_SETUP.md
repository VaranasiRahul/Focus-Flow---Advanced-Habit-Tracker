# FocusFlow Android Widget Setup

## Why this needs EAS Build (not Expo Go)

Android home screen widgets require native Android code (an AppWidgetProvider Java/Kotlin class
registered in AndroidManifest.xml). Expo Go cannot run this — you need a custom native build.

## Steps to get the widget working

### 1. Install dependencies
```bash
npx expo install react-native-android-widget
```

### 2. Build with EAS (one-time setup)
```bash
# Install EAS CLI if you don't have it
npm install -g eas-cli

# Login to Expo account
eas login

# Configure your project
eas build:configure

# Build an APK for Android
eas build --platform android --profile preview
```

### 3. Install the built APK on your phone
Download the APK from the EAS dashboard and install it.

### 4. Add widget to home screen
- Long press your Android home screen
- Tap "Widgets"
- Find "FocusFlow Tasks"
- Drag it to your home screen

## Widget auto-updates
- The widget refreshes every **30 minutes** automatically (Android limit)
- It also updates instantly whenever you save time in the app

## Widget shows
- Your next pending task name
- Time spent on it today  
- Number of pending tasks remaining
- A progress bar
- Tap anywhere to open the app
