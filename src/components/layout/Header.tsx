import { useState, useEffect } from 'react'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { apiClient } from '../../services/apiClient'
import { useNavigate } from 'react-router-dom'

export default function Header() {
    const { logout } = useAuth()
    const navigate = useNavigate()
    const [notifications, setNotifications] = useState<any[]>([])
    const [showNotifications, setShowNotifications] = useState(false)

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const res = await apiClient.get('/notifications/')
                setNotifications(res.data)
            } catch (e) {
                console.error(e)
            }
        }
        fetchNotifications()
        const intval = setInterval(fetchNotifications, 15000)
        return () => clearInterval(intval)
    }, [])

    const unreadCount = notifications.filter(n => !n.is_read).length

    const handleRead = async (notif: any) => {
        try {
            if (!notif.is_read) {
                await apiClient.patch(`/notifications/${notif.id}/read`)
                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
            }
            if (notif.target_path) {
                navigate(notif.target_path)
            }
            setShowNotifications(false)
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <header className="h-[64px] fixed top-0 right-0 left-[264px] bg-white/90 backdrop-blur-xl border-b border-slate-200/80 flex items-center justify-between px-8 z-10 shadow-[0_1px_8px_-4px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-4 w-1/2">
                {/* <div className="relative w-full max-w-md group">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xl transition-colors group-focus-within:text-primary">search</span>
                    <input
                        className="w-full pl-11 pr-4 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/15 focus:border-primary/50 outline-none transition-all placeholder:text-slate-400 placeholder:font-medium"
                        placeholder="Search candidates, assessments..."
                        type="text"
                    />
                </div> */}
            </div>

            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 border-r border-slate-200/80 pr-4 mr-1">
                    <div className="relative">
                        <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all relative">
                            <span className="material-symbols-outlined text-[20px]">notifications</span>
                            {unreadCount > 0 && <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />}
                        </button>
                        {showNotifications && (
                            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                                <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                    <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
                                    <span className="text-xs text-slate-500">{unreadCount} unread</span>
                                </div>
                                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                    {notifications.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-slate-500">No notifications</div>
                                    ) : (
                                        notifications.map(n => (
                                            <div key={n.id} onClick={() => handleRead(n)} className={`p-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}>
                                                <p className={`text-xs ${!n.is_read ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>{n.message}</p>
                                                <p className="text-[10px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all">
                        <span className="material-symbols-outlined text-[20px]">help</span>
                    </button>
                </div>

                <button
                    onClick={() => logout()}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-semibold rounded-xl transition-all text-xs border border-slate-200 hover:border-rose-200 active:scale-95"
                >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Sign Out
                </button>
            </div>
        </header>
    )
}
