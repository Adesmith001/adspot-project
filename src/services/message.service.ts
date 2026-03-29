import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";
import { uploadFiles } from "./cloudinary.service";
import type { Conversation, Message } from "@/types/billboard.types";
import { createNotification } from "./notification.service";
import { getUserProfile } from "./user.service";
import { stripUndefinedDeep } from "@/utils/firestore.utils";

const CONVERSATIONS_COLLECTION = "conversations";
const MESSAGES_COLLECTION = "messages";

/**
 * Start a new conversation or get existing one
 */
export const startConversation = async (
  senderId: string,
  receiverId: string,
  initialMessage?: string,
): Promise<string> => {
  try {
    // Check if conversation already exists
    // Note: detailed query might be needed for perfect match,
    // but for now we search for conversations containing sender
    const q = query(
      collection(db, CONVERSATIONS_COLLECTION),
      where("participants", "array-contains", senderId),
    );
    const snapshot = await getDocs(q);
    const existing = snapshot.docs.find((doc) => {
      const data = doc.data();
      return data.participants.includes(receiverId);
    });

    if (existing) {
      if (initialMessage) {
        await sendMessage(existing.id, senderId, initialMessage);
      }
      return existing.id;
    }

    // Get user details for participant info
    const sender = await getUserProfile(senderId);
    const receiver = await getUserProfile(receiverId);

    const senderName = sender?.displayName || "User";
    const receiverName = receiver?.displayName || "User";

    // Create new conversation
    const conversationData = stripUndefinedDeep({
      participants: [senderId, receiverId],
      participantDetails: {
        [senderId]: {
          name: senderName,
          photo: sender?.photoURL,
          role: sender?.role || "advertiser",
        },
        [receiverId]: {
          name: receiverName,
          photo: receiver?.photoURL,
          role: receiver?.role || "owner",
        },
      },
      lastMessage: initialMessage || "",
      lastMessageSenderId: senderId,
      lastMessageAt: serverTimestamp(),
      unreadCount: {
        [senderId]: 0,
        [receiverId]: initialMessage ? 1 : 0,
      },
      createdAt: serverTimestamp(),
    });

    const docRef = await addDoc(
      collection(db, CONVERSATIONS_COLLECTION),
      conversationData,
    );

    // Add initial message to subcollection
    if (initialMessage) {
      await addDoc(
        collection(
          db,
          CONVERSATIONS_COLLECTION,
          docRef.id,
          MESSAGES_COLLECTION,
        ),
        {
          conversationId: docRef.id,
          senderId,
          senderName,
          text: initialMessage,
          read: false,
          createdAt: serverTimestamp(),
        },
      );

      // Notify receiver with dynamic path based on their role
      const receiverProfile = await getUserProfile(receiverId);
      const receiverRole = receiverProfile?.role || 'owner';
      const messagesPath = `/dashboard/${receiverRole}/messages?conversation=${docRef.id}`;
      
      await createNotification(
        receiverId,
        "new_message",
        "New Message",
        `${senderName} sent you a message`,
        { conversationId: docRef.id },
        messagesPath,
      );
    }

    return docRef.id;
  } catch (error) {
    console.error("Error starting conversation:", error);
    throw error;
  }
};

/**
 * Send a message
 */
export const sendMessage = async (
  conversationId: string,
  senderId: string,
  text: string,
  attachments?: string[],
): Promise<void> => {
  try {
    const sender = await getUserProfile(senderId);
    const senderName = sender?.displayName || "User";
    const trimmedText = text.trim();
    const attachmentUrls = attachments?.filter(Boolean) || [];
    const hasAttachments = attachmentUrls.length > 0;

    if (!trimmedText && !hasAttachments) {
      throw new Error("Message content is required.");
    }

    // 1. Add message
    const messagePayload = {
      conversationId,
      senderId,
      senderName,
      text: trimmedText,
      ...(hasAttachments ? { attachments: attachmentUrls } : {}),
      read: false,
      createdAt: serverTimestamp(),
    };

    await addDoc(
      collection(
        db,
        CONVERSATIONS_COLLECTION,
        conversationId,
        MESSAGES_COLLECTION,
      ),
      messagePayload,
    );

    // 2. Update conversation metadata
    const convRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    const convSnap = await getDoc(convRef);
    const convData = convSnap.data() as Conversation;

    if (!convData) return;

    // Calculate new unread counts
    const otherUserId = convData.participants.find((id) => id !== senderId);
    const unreadCount = { ...convData.unreadCount };
    const lastMessagePreview = trimmedText || `Sent ${attachmentUrls.length} file${attachmentUrls.length === 1 ? "" : "s"}`;
    if (otherUserId) {
      unreadCount[otherUserId] = (unreadCount[otherUserId] || 0) + 1;
    }

    await updateDoc(convRef, {
      lastMessage: lastMessagePreview,
      lastMessageSenderId: senderId,
      lastMessageAt: serverTimestamp(),
      unreadCount,
    });

    // 3. Notify receiver with dynamic path based on their role
    if (otherUserId) {
      const receiverProfile = await getUserProfile(otherUserId);
      const receiverRole = receiverProfile?.role || 'owner';
      const messagesPath = `/dashboard/${receiverRole}/messages?conversation=${conversationId}`;
      
      await createNotification(
        otherUserId,
        "new_message",
        "New Message",
        `${senderName}: ${lastMessagePreview}`,
        { conversationId },
        messagesPath,
      );
    }
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

export const sendMessageWithUploads = async (
  conversationId: string,
  senderId: string,
  text: string,
  files: File[],
): Promise<string[]> => {
  const uploadedUrls = await uploadFiles(files);
  await sendMessage(conversationId, senderId, text, uploadedUrls);
  return uploadedUrls;
};

/**
 * Subscribe to conversations list
 */
export const subscribeToConversations = (
  userId: string,
  callback: (conversations: Conversation[]) => void,
) => {
  const q = query(
    collection(db, CONVERSATIONS_COLLECTION),
    where("participants", "array-contains", userId),
    orderBy("lastMessageAt", "desc"),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const conversations = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        lastMessageAt: doc.data().lastMessageAt?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Conversation[];
      callback(conversations);
    },
    (error) => {
      console.error("Error subscribing to conversations:", error);
    },
  );
};

/**
 * Subscribe to messages in a conversation
 */
export const subscribeToMessages = (
  conversationId: string,
  callback: (messages: Message[]) => void,
) => {
  const q = query(
    collection(
      db,
      CONVERSATIONS_COLLECTION,
      conversationId,
      MESSAGES_COLLECTION,
    ),
    orderBy("createdAt", "asc"),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Message[];
      callback(messages);
    },
    (error) => {
      console.error("Error subscribing to messages:", error);
    },
  );
};

/**
 * Mark conversation as read
 */
export const markConversationAsRead = async (
  conversationId: string,
  userId: string,
): Promise<void> => {
  try {
    const convRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);

    // We need to use updateDoc with dot notation for nested fields if we want atomic
    // but since unreadCount is a map, we might need to read first or use specific key update
    // Firestore map update: "unreadCount.userId": 0

    await updateDoc(convRef, {
      [`unreadCount.${userId}`]: 0,
    });
  } catch (error) {
    console.error("Error marking conversation as read:", error);
  }
};
