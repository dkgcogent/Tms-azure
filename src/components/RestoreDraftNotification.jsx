import React from 'react';
import './RestoreDraftNotification.css';

/**
 * A notification banner that appears if a form draft is found.
 * 
 * @param {function} onRestore - Callback when user clicks Restore.
 * @param {function} onClear - Callback when user clicks Discard.
 * @param {boolean} isVisible - Whether the notification is visible.
 * @returns {JSX.Element|null}
 */
const RestoreDraftNotification = ({ onRestore, onClear, isVisible }) => {
    if (!isVisible) return null;

    return (
        <div className="restore-draft-container">
            <div className="restore-draft-banner">
                <div className="restore-draft-content">
                    <div className="restore-draft-icon">
                        <i className="fas fa-file-alt"></i>
                    </div>
                    <div className="restore-draft-info">
                        <span className="restore-draft-title">Unsaved Draft Found</span>
                        <span className="restore-draft-desc">
                            Would you like to restore your progress for this form?
                        </span>
                    </div>
                </div>
                <div className="restore-draft-actions">
                    <button
                        type="button"
                        onClick={onRestore}
                        className="restore-btn restore-btn-primary"
                    >
                        <i className="fas fa-history me-2"></i>
                        Restore Progress
                    </button>
                    <button
                        type="button"
                        onClick={onClear}
                        className="restore-btn restore-btn-secondary"
                    >
                        <i className="fas fa-trash-alt me-2"></i>
                        Discard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RestoreDraftNotification;
