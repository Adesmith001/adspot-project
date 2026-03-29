import React, { useState, useEffect } from 'react';
import { MdNotifications, MdNotificationsNone, MdCircle } from 'react-icons/md';
import { Link } from 'react-router-dom';
import type { Notification } from '@/types/billboard.types';
import Card from './ui/Card';
import { useAppSelector } from '@/hooks/useRedux';
import { selectUser } from '@/store/authSlice';
import { subscribeToNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/services/notification.service';

const NotificationBell: React.FC = () => {
    const user = useAppSelector(selectUser);
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            return;
        }

        // Subscribe to real-time notifications
        const unsubscribe = subscribeToNotifications(user.uid, (data) => {
            setNotifications(data);
        });

        return () => unsubscribe();
    }, [user]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();

        // Optimistic update
        setNotifications(prev => prev.map(n =>
            n.id === id ? { ...n, read: true } : n
        ));

        try {
            await markNotificationAsRead(id);
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));

        try {
            if (user) {
                await markAllNotificationsAsRead(user.uid);
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const formatTime = (date: Date) => {
        if (!date) return '';
        const now = new Date();
        const diff = now.getTime() - new Date(date).getTime();

        if (diff < 1000 * 60) return 'Just now';
        if (diff < 1000 * 60 * 60) return `${Math.floor(diff / (1000 * 60))}m`;
        if (diff < 1000 * 60 * 60 * 24) return `${Math.floor(diff / (1000 * 60 * 60))}h`;
        return `${Math.floor(diff / (1000 * 60 * 60 * 24))}d`;
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-neutral-100 transition-colors text-neutral-600 hover:text-neutral-900"
            >
                {unreadCount > 0 ? (
                    <MdNotifications size={24} />
                ) : (
                    <MdNotificationsNone size={24} />
                )}

                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown */}
                    <Card className="fixed left-1/2 top-16 z-50 w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 shadow-xl border border-neutral-200 overflow-hidden flex max-h-[500px] flex-col sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96 sm:translate-x-0">
                        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
                            <h3 className="font-bold text-neutral-900">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>

                        <div className="overflow-y-auto flex-1">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center">
                                    <MdNotificationsNone size={40} className="mx-auto text-neutral-300 mb-2" />
                                    <p className="text-sm text-neutral-500">No notifications yet</p>
                                </div>
                            ) : (
                                <div>
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            onClick={() => handleMarkAsRead(notification.id)}
                                            className={`p-4 border-b border-neutral-100 hover:bg-neutral-50 transition-colors relative cursor-pointer ${!notification.read ? 'bg-primary-50/50' : ''
                                                }`}
                                        >
                                            {/* Unread Indicator */}
                                            {!notification.read && (
                                                <div className="absolute left-2 top-1/2 -translate-y-1/2">
                                                    <MdCircle size={8} className="text-primary-500" />
                                                </div>
                                            )}

                                            <Link
                                                to={notification.actionUrl || '#'}
                                                className="block pl-4"
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevents double marking
                                                    handleMarkAsRead(notification.id);
                                                    setIsOpen(false);
                                                }}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className={`text-sm ${!notification.read ? 'font-semibold text-neutral-900' : 'font-medium text-neutral-700'}`}>
                                                        {notification.title}
                                                    </p>
                                                    <span className="text-xs text-neutral-400 whitespace-nowrap ml-2">
                                                        {formatTime(notification.createdAt)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-neutral-500 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-3 border-t border-neutral-100 text-center bg-neutral-50">
                            <Link
                                to={
                                        user?.role === 'owner'
                                            ? '/dashboard/owner/bookings'
                                            : user?.role === 'advertiser'
                                            ? '/dashboard/advertiser/campaigns'
                                            : '/dashboard/admin'
                                }
                                className="text-xs text-neutral-500 hover:text-neutral-900"
                                onClick={() => setIsOpen(false)}
                            >
                                View All Activity
                            </Link>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
};

export default NotificationBell;
