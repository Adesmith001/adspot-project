import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import {
  MdMessage,
  MdSend,
  MdSearch,
  MdPerson,
  MdArrowBack,
  MdPictureAsPdf,
} from "react-icons/md";
import DashboardLayout from "@/components/DashboardLayout";
import NotificationBell from "@/components/NotificationBell";
import EmptyState from "@/components/EmptyState";
import { useAppSelector } from "@/hooks/useRedux";
import { selectUser } from "@/store/authSlice";
import type { Conversation, Message } from "@/types/billboard.types";
import {
  subscribeToConversations,
  subscribeToMessages,
  sendMessage,
  markConversationAsRead,
} from "@/services/message.service";
import { getUserProfile, type UserProfile } from "@/services/user.service";
import { getAssetLabelFromUrl, isPdfUrl } from "@/utils/media.utils";
import toast from "react-hot-toast";

interface MessagesProps {
  userRole: "owner" | "advertiser" | "admin";
}

const Messages: React.FC<MessagesProps> = ({ userRole }) => {
  const user = useAppSelector(selectUser);
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [participantProfiles, setParticipantProfiles] = useState<
    Record<string, UserProfile>
  >({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToConversations(user.uid, (data) => {
      setConversations(data);
      setLoadingConversations(false);
      const otherIds = [
        ...new Set(
          data.flatMap((c) => c.participants.filter((id) => id !== user.uid)),
        ),
      ];
      otherIds.forEach(async (uid) => {
        try {
          const profile = await getUserProfile(uid);
          if (profile)
            setParticipantProfiles((prev) => ({ ...prev, [uid]: profile }));
        } catch {
          /* silent */
        }
      });
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const paramId = searchParams.get("conversation");
    if (paramId) setSelectedConversation(paramId);
  }, [searchParams]);

  useEffect(() => {
    if (!selectedConversation) return;
    const unsubscribe = subscribeToMessages(selectedConversation, (data) => {
      setMessages(data);
      if (user) markConversationAsRead(selectedConversation, user.uid);
    });
    return () => unsubscribe();
  }, [selectedConversation, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;
    const messageText = newMessage;
    setNewMessage("");
    try {
      await sendMessage(selectedConversation, user.uid, messageText);
    } catch {
      toast.error("Failed to send message");
      setNewMessage(messageText);
    }
  };

  const formatTime = (date: Date) =>
    new Date(date).toLocaleTimeString("en-NG", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatDate = (date: Date) => {
    const now = new Date();
    const d = new Date(date);
    const days = Math.floor(
      (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return d.toLocaleDateString("en-NG", { weekday: "long" });
    return d.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
  };

  const filteredConversations = conversations.filter((c) => {
    if (!user) return true;
    const otherId = c.participants.find((id) => id !== user.uid) || "";
    const name = c.participantDetails[otherId]?.name || "User";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getOtherParticipant = (conversation: Conversation) => {
    if (!user) return { name: "User", role: "unknown", photo: undefined };
    const otherId =
      conversation.participants.find((id) => id !== user.uid) || "";
    const live = participantProfiles[otherId];
    const stored = conversation.participantDetails[otherId];
    return {
      name: live?.displayName || stored?.name || "User",
      role: live?.role || stored?.role || "unknown",
      photo: live?.photoURL || stored?.photo || undefined,
    };
  };

  const selectedConvData = conversations.find(
    (c) => c.id === selectedConversation,
  );
  const selectedOtherUser = selectedConvData
    ? getOtherParticipant(selectedConvData)
    : null;

  // ─── Conversation List ────────────────────────────────────────────────────
  const ConversationList = (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-4 border-b border-neutral-100">
        <div className="relative">
          <MdSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={conversations.length === 0}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.map((conversation) => {
          const otherUser = getOtherParticipant(conversation);
          const unread = user ? conversation.unreadCount[user.uid] || 0 : 0;
          return (
            <motion.button
              key={conversation.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedConversation(conversation.id)}
              className={`w-full p-4 flex items-start gap-3 transition-colors border-b border-neutral-100 ${
                selectedConversation === conversation.id
                  ? "bg-primary-50"
                  : "hover:bg-neutral-50"
              }`}
            >
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center text-white font-bold flex-shrink-0">
                {otherUser.photo ? (
                  <img
                    src={otherUser.photo}
                    alt={otherUser.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <MdPerson size={24} />
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-0.5">
                  <p
                    className={`font-semibold truncate text-sm ${
                      unread > 0 ? "text-neutral-900" : "text-neutral-700"
                    }`}
                  >
                    {otherUser.name}
                  </p>
                  <span className="text-[11px] text-neutral-400 ml-2 flex-shrink-0">
                    {formatDate(conversation.lastMessageAt)}
                  </span>
                </div>
                <p
                  className={`text-sm truncate ${
                    unread > 0
                      ? "text-neutral-900 font-medium"
                      : "text-neutral-500"
                  }`}
                >
                  {conversation.lastMessageSenderId === user?.uid && "You: "}
                  {conversation.lastMessage}
                </p>
              </div>
              {unread > 0 && (
                <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-[10px] flex items-center justify-center font-bold flex-shrink-0">
                  {unread}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  // ─── Chat Panel ───────────────────────────────────────────────────────────
  const ChatPanel =
    selectedConversation && selectedOtherUser ? (
      <div className="flex flex-col h-[100dvh] min-h-0">
        {/* Chat Header */}
        <div className="p-4 border-b border-neutral-100 bg-white flex items-center gap-3 shadow-sm">
          {/* Back arrow — mobile only */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setSelectedConversation(null)}
            className="lg:hidden p-2 -ml-1 rounded-xl text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            <MdArrowBack size={22} />
          </motion.button>
          <div className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-white font-bold flex-shrink-0">
            {selectedOtherUser.photo ? (
              <img
                src={selectedOtherUser.photo}
                alt={selectedOtherUser.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <MdPerson size={20} />
            )}
          </div>
          <div>
            <p className="font-bold text-neutral-900 text-sm">
              {selectedOtherUser.name}
            </p>
            <p className="text-xs text-neutral-500 capitalize">
              {selectedOtherUser.role}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-neutral-50">
          {messages.map((message, i) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.15) }}
              className={`flex ${
                message.senderId === user?.uid ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm ${
                  message.senderId === user?.uid
                    ? "bg-neutral-900 text-white rounded-br-sm"
                    : "bg-white text-neutral-900 rounded-bl-sm border border-neutral-200"
                }`}
              >
                {message.text && (
                  <p className="text-sm leading-relaxed">{message.text}</p>
                )}
                {(message.attachments?.length ?? 0) > 0 && (
                  <div
                    className={`grid gap-2 mt-2 ${
                      (message.attachments?.length ?? 0) > 1
                        ? "grid-cols-2"
                        : "grid-cols-1"
                    }`}
                  >
                    {message.attachments?.map((attachment) => (
                      <a
                        key={attachment}
                        href={attachment}
                        target="_blank"
                        rel="noreferrer"
                        className={`block overflow-hidden rounded-xl border ${
                          message.senderId === user?.uid
                            ? "border-white/15 bg-white/10"
                            : "border-neutral-200 bg-neutral-50"
                        }`}
                      >
                        {isPdfUrl(attachment) ? (
                          <div
                            className={`flex h-24 w-full flex-col items-center justify-center px-3 text-center ${
                              message.senderId === user?.uid
                                ? "text-white"
                                : "text-red-700"
                            }`}
                          >
                            <MdPictureAsPdf
                              size={28}
                              className={
                                message.senderId === user?.uid
                                  ? "text-white"
                                  : "text-red-600"
                              }
                            />
                            <span
                              className={`mt-1 line-clamp-2 text-[11px] font-medium ${
                                message.senderId === user?.uid
                                  ? "text-white/80"
                                  : "text-red-700"
                              }`}
                            >
                              {getAssetLabelFromUrl(attachment)}
                            </span>
                          </div>
                        ) : (
                          <img
                            src={attachment}
                            alt="Message attachment"
                            className="h-28 w-full object-cover"
                          />
                        )}
                      </a>
                    ))}
                  </div>
                )}
                <p
                  className={`text-[10px] mt-1 text-right ${
                    message.senderId === user?.uid
                      ? "text-white/60"
                      : "text-neutral-400"
                  }`}
                >
                  {formatTime(message.createdAt)}
                </p>
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 p-3 border-t border-neutral-100 bg-white">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1 px-4 py-3 bg-neutral-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 border border-neutral-200"
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="w-11 h-11 rounded-xl bg-[#d4f34a] text-green-900 flex items-center justify-center disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed shadow-sm disabled:shadow-none flex-shrink-0 hover:bg-[#c5e53a] transition-colors"
            >
              <MdSend size={18} />
            </motion.button>
          </div>
        </div>
      </div>
    ) : (
      // Empty chat state (desktop only)
      <div className="flex-1 flex items-center justify-center bg-neutral-50 rounded-2xl border border-neutral-200">
        <div className="text-center">
          <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <MdMessage size={40} className="text-primary-400" />
          </div>
          <h3 className="text-lg font-bold text-neutral-800 mb-2">
            Your Messages
          </h3>
          <p className="text-sm text-neutral-500">
            Select a conversation to start chatting
          </p>
        </div>
      </div>
    );

  return (
    <DashboardLayout
      userRole={userRole}
      title="Messages"
      subtitle={
        userRole === "admin"
          ? "Chat directly with any owner or advertiser"
          : "Chat with advertisers and billboard owners"
      }
      hideHeader
      hideMobileNav={!!selectedConversation}
      contentClassName={
        selectedConversation ? "p-0 lg:px-6 lg:py-8 lg:pb-8" : undefined
      }
    >
      {conversations.length === 0 && !loadingConversations ? (
        <EmptyState
          icon={<MdMessage />}
          title="No Messages Yet"
          description={
            userRole === "owner"
              ? "When advertisers inquire about your billboards, conversations will appear here."
              : userRole === "admin"
              ? "Start a conversation from the user management page to message an owner or advertiser."
              : "Start a conversation by inquiring about a billboard you're interested in."
          }
          actionLabel={
            userRole === "advertiser" ? "Browse Billboards" : undefined
          }
          actionHref={userRole === "advertiser" ? "/listings" : undefined}
        />
      ) : (
        <div
          className={`${
            selectedConversation
              ? "h-[100dvh] lg:h-[calc(100vh-132px)]"
              : "h-[calc(100vh-112px)] lg:h-[calc(100vh-132px)]"
          } flex flex-col`}
        >
          {!selectedConversation && (
            <div className="flex items-center justify-between px-1 pb-3">
              <h2 className="text-xl lg:text-2xl font-bold text-neutral-900">
                Messages
              </h2>
              <NotificationBell />
            </div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="relative flex-1 flex gap-0 lg:gap-6 overflow-hidden"
          >
            {/* ── Conversation List ── */}
            {/* On mobile: hidden when a chat is open */}
            <AnimatePresence mode="wait">
              {(!selectedConversation || true) && (
                <motion.div
                  key="conv-list"
                  initial={{ x: 0 }}
                  animate={{ x: 0 }}
                  className={`
                                        ${
                                          selectedConversation
                                            ? "hidden lg:flex"
                                            : "flex"
                                        }
                                        flex-col w-full lg:w-80 flex-shrink-0 bg-white lg:rounded-2xl lg:border lg:border-neutral-200 lg:shadow-sm overflow-hidden
                                    `}
                >
                  {ConversationList}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Chat Panel ── */}
            {/* On mobile: full screen when a chat is open */}
            <AnimatePresence>
              {selectedConversation && (
                <motion.div
                  key={selectedConversation}
                  initial={{ x: "100%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "100%", opacity: 0 }}
                  transition={{ type: "spring", damping: 28, stiffness: 280 }}
                  className="flex-1 min-h-0 flex flex-col w-full lg:w-auto absolute lg:relative inset-0 lg:inset-auto bg-white lg:bg-transparent lg:rounded-2xl lg:border lg:border-neutral-200 lg:shadow-sm overflow-hidden z-10 lg:z-auto"
                >
                  {ChatPanel}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Desktop empty state when no convo selected */}
            {!selectedConversation && (
              <div className="hidden lg:flex flex-1 items-center justify-center bg-neutral-50 rounded-2xl border border-neutral-200">
                <div className="text-center">
                  <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MdMessage size={40} className="text-primary-400" />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-800 mb-2">
                    Your Messages
                  </h3>
                  <p className="text-sm text-neutral-500">
                    Select a conversation to start chatting
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Messages;
