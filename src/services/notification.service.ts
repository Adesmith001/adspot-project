import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
  writeBatch,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Notification, NotificationType } from "@/types/billboard.types";
import { stripUndefinedDeep } from "@/utils/firestore.utils";

const NOTIFICATIONS_COLLECTION = "notifications";

/**
 * Create a new notification
 */
export const createNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  metadata?: Notification["metadata"],
  actionUrl?: string,
): Promise<string> => {
  try {
    const notification = stripUndefinedDeep({
      userId,
      type,
      title,
      message,
      read: false,
      metadata,
      actionUrl,
      createdAt: serverTimestamp(),
    });

    const docRef = await addDoc(
      collection(db, NOTIFICATIONS_COLLECTION),
      notification,
    );
    return docRef.id;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

/**
 * Subscribe to notifications (Real-time updates)
 */
export const subscribeToNotifications = (
  userId: string,
  callback: (notifications: Notification[]) => void,
) => {
  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(50),
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Notification[];

      callback(notifications);
    },
    (error) => {
      console.error("Error subscribing to notifications:", error);
    },
  );

  return unsubscribe;
};

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = async (
  notificationId: string,
): Promise<void> => {
  try {
    const docRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(docRef, {
      read: true,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (
  userId: string,
): Promise<void> => {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where("userId", "==", userId),
      where("read", "==", false),
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { read: true });
    });

    await batch.commit();
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
};
