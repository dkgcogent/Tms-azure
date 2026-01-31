import React, { useState, useEffect, useContext } from 'react';
import { Modal, Button, Alert, Badge } from 'react-bootstrap';
import { FaBell, FaExclamationTriangle, FaCalendarAlt } from 'react-icons/fa';
import axios from 'axios';

const NotificationContext = React.createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now(),
      timestamp: new Date(),
      read: false,
      ...notification
    };
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
  };

  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
    setUnreadCount(0);
  };

  const removeNotification = (id) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.filter(n => n.id !== id);
    });
  };

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

const NotificationManager = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useNotifications();
  const [showModal, setShowModal] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [currentAlert, setCurrentAlert] = useState(null);

  // Check for expiring documents on component mount and daily
  useEffect(() => {
    checkExpiringDocuments();

    // Set up daily check at 9 AM
    const now = new Date();
    const nextCheck = new Date(now);
    nextCheck.setHours(9, 0, 0, 0);

    if (now > nextCheck) {
      nextCheck.setDate(nextCheck.getDate() + 1);
    }

    const timeUntilNextCheck = nextCheck - now;
    const dailyCheck = setTimeout(() => {
      checkExpiringDocuments();
      // Set up recurring daily check
      setInterval(checkExpiringDocuments, 24 * 60 * 60 * 1000);
    }, timeUntilNextCheck);

    return () => clearTimeout(dailyCheck);
  }, []);

  const checkExpiringDocuments = async () => {
    try {
      const response = await axios.get('/api/customers/expiring-documents');
      const expiringDocs = response.data;

      expiringDocs.forEach(doc => {
        const daysUntilExpiry = Math.ceil(
          (new Date(doc.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
        );

        let priority = 'info';
        let message = '';

        if (daysUntilExpiry <= 0) {
          priority = 'danger';
          message = `${doc.type} for ${doc.customerName} has EXPIRED!`;
        } else if (daysUntilExpiry <= 7) {
          priority = 'warning';
          message = `${doc.type} for ${doc.customerName} expires in ${daysUntilExpiry} days`;
        } else if (daysUntilExpiry <= 30) {
          priority = 'info';
          message = `${doc.type} for ${doc.customerName} expires in ${daysUntilExpiry} days`;
        }

        if (message) {
          addNotification({
            type: 'expiry',
            priority,
            title: 'Document Expiry Alert',
            message,
            customerId: doc.customerId,
            documentType: doc.type,
            expiryDate: doc.expiryDate,
            daysUntilExpiry
          });

          // Show immediate alert for critical expiries
          if (priority === 'danger' || priority === 'warning') {
            setCurrentAlert({
              type: priority,
              message,
              customerId: doc.customerId
            });
            setShowAlert(true);
          }
        }
      });
    } catch (error) {
      console.error('Error checking expiring documents:', error);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'danger': return 'danger';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'secondary';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'danger': return <FaExclamationTriangle />;
      case 'warning': return <FaExclamationTriangle />;
      case 'info': return <FaCalendarAlt />;
      default: return <FaBell />;
    }
  };

  return (
    <>
      {/* Notification Bell Button */}
      <div className="position-relative d-inline-block">
        <Button
          variant="outline-primary"
          onClick={() => setShowModal(true)}
          className="position-relative"
        >
          <FaBell />
          {unreadCount > 0 && (
            <Badge
              pill
              bg="danger"
              className="position-absolute top-0 start-100 translate-middle"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Immediate Alert */}
      {showAlert && currentAlert && (
        <Alert
          variant={currentAlert.type}
          dismissible
          onClose={() => setShowAlert(false)}
          className="position-fixed top-0 end-0 m-3"
          style={{ zIndex: 1050, minWidth: '300px' }}
        >
          <strong>{getPriorityIcon(currentAlert.type)} {currentAlert.message}</strong>
        </Alert>
      )}

      {/* Notifications Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaBell className="me-2" />
            Notifications
            {unreadCount > 0 && (
              <Badge bg="danger" className="ms-2">
                {unreadCount} new
              </Badge>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <div className="text-center text-muted py-4">
              <FaBell size={48} className="mb-3 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="list-group">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`list-group-item list-group-item-action ${
                    !notification.read ? 'bg-light' : ''
                  }`}
                >
                  <div className="d-flex w-100 justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center mb-1">
                        <Badge
                          bg={getPriorityColor(notification.priority)}
                          className="me-2"
                        >
                          {getPriorityIcon(notification.priority)}
                        </Badge>
                        <small className="text-muted">
                          {new Date(notification.timestamp).toLocaleString()}
                        </small>
                      </div>
                      <h6 className="mb-1">{notification.title}</h6>
                      <p className="mb-1">{notification.message}</p>
                      {notification.daysUntilExpiry !== undefined && (
                        <small className="text-muted">
                          Expires: {new Date(notification.expiryDate).toLocaleDateString()}
                          ({notification.daysUntilExpiry} days)
                        </small>
                      )}
                    </div>
                    <div className="d-flex flex-column gap-1">
                      {!notification.read && (
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => markAsRead(notification.id)}
                        >
                          Mark Read
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => removeNotification(notification.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          {unreadCount > 0 && (
            <Button variant="outline-primary" onClick={markAllAsRead}>
              Mark All as Read
            </Button>
          )}
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default NotificationManager;
