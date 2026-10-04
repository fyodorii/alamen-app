// Native (iOS app) notifications: the salawat reminder is a local repeating
// notification, so it needs no server. New-topic alerts are shown in-app only.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SALAWAT, SALAWAT_TITLE } from './salawat';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const pushSupported = () => true;
export const isIOS = () => Platform.OS === 'ios';
export const isStandalone = () => true;
export const registerServiceWorker = () => Promise.resolve(null);
export const onNotificationOpen = () => () => {};
export const initialThreadId = () => null;

export async function getPushState() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return false;
  return (await Notifications.getAllScheduledNotificationsAsync()).length > 0;
}

async function schedule(topics) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!topics.salawat) return;
  await Notifications.scheduleNotificationAsync({
    content: { title: SALAWAT_TITLE, body: SALAWAT[0] },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 15 * 60, repeats: true },
  });
}

export async function enablePush(topics) {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') throw new Error('DENIED');
  await schedule(topics);
  return true;
}

export async function updatePushTopics(topics) {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') await schedule(topics);
}

export async function disablePush() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
