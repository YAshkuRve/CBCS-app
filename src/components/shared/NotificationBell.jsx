import React, { useState, useEffect, useRef } from "react";
import { db, auth } from "../../firebase/config";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { Bell } from "lucide-react";
import "./NotificationBell.css";

function NotificationBell({ role }) {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!auth.currentUser || !role) return;
    
    // Listen to notifications for this user OR this role broadly
    const q1 = query(
      collection(db, "notifications"),
      where("to", "in", [auth.currentUser.uid, role]),
      // Cannot order easily due to "in" clause requiring composite index
      // Using client-side sort for smaller sets or omitting orderBy
    );

    const unsubscribe = onSnapshot(q1, (snap) => {
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort by newest first
      data.sort((a,b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
      setNotifications(data);
    });

    return () => unsubscribe();
  }, [role, auth.currentUser]);

  // Handle clicking outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const markAsRead = async (id) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch(err) {
       console.error("Failed to mark read");
    }
  };

  const markAllRead = () => {
    notifications.filter(n => !n.read).forEach(n => {
      markAsRead(n.id);
    });
  }

  return (
    <div className="notif-wrapper" ref={dropdownRef}>
      <button className="btn btn-ghost btn-icon notif-bell-btn" onClick={toggleDropdown} title="Notifications">
        <Bell size={18} />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {showDropdown && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button className="btn-mark-all" onClick={markAllRead}>Mark all read</button>
            )}
          </div>
          <div className="notif-body">
            {notifications.length === 0 ? (
              <div className="notif-empty">No new notifications</div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`notif-item ${!n.read ? "notif-unread" : ""}`}
                  onClick={() => markAsRead(n.id)}
                >
                  <div className="notif-msg">{n.message}</div>
                  <div className="notif-time">
                     {n.createdAt ? new Date(n.createdAt.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
export default NotificationBell;
