import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button, Checkbox } from './ui';
import { Wrench, Sparkles, Keyboard, Zap } from 'lucide-react';
import './WelcomeModal.css';

const WELCOME_SEEN_KEY = 'hoot-has-seen-welcome';

interface WelcomeModalProps {
    onClose: () => void;
    onGetStarted?: () => void;
}

export function WelcomeModal({ onClose, onGetStarted }: WelcomeModalProps) {
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const handleClose = () => {
        // Only save the preference if user explicitly checked the box
        if (dontShowAgain) {
            localStorage.setItem(WELCOME_SEEN_KEY, 'true');
        }
        onClose();
    };

    const handleGetStarted = () => {
        // Only save the preference if user explicitly checked the box
        if (dontShowAgain) {
            localStorage.setItem(WELCOME_SEEN_KEY, 'true');
        }
        if (onGetStarted) {
            onGetStarted();
        }
        onClose();
    };

    return (
        <Modal onClose={handleClose}>
            <div className="welcome-modal">
                <div className="welcome-header">
                    <span className="welcome-logo">🦉</span>
                    <h2 className="welcome-title">Welcome to Hoot!</h2>
                    <p className="welcome-subtitle">
                        A beautiful tool to test and explore MCP (Model Context Protocol) servers
                    </p>
                </div>

                <div className="welcome-features">
                    <div className="welcome-feature">
                        <div className="feature-icon">
                            <Wrench size={24} />
                        </div>
                        <div className="feature-content">
                            <h3>Test Tools</h3>
                            <p>Connect to MCP servers and test their tools with an intuitive interface</p>
                        </div>
                    </div>

                    <div className="welcome-feature">
                        <div className="feature-icon">
                            <Sparkles size={24} />
                        </div>
                        <div className="feature-content">
                            <h3>AI-Powered Chat</h3>
                            <p>Chat with AI that can use your MCP tools to accomplish tasks</p>
                        </div>
                    </div>

                    <div className="welcome-feature">
                        <div className="feature-icon">
                            <Keyboard size={24} />
                        </div>
                        <div className="feature-content">
                            <h3>Keyboard Shortcuts</h3>
                            <p>Navigate efficiently with vim-style shortcuts (press <kbd>?</kbd> to view all)</p>
                        </div>
                    </div>

                    <div className="welcome-feature">
                        <div className="feature-icon">
                            <Zap size={24} />
                        </div>
                        <div className="feature-content">
                            <h3>Quick Start</h3>
                            <p>Try public servers instantly or connect your own MCP server</p>
                        </div>
                    </div>
                </div>

                <div className="welcome-footer">
                    <Checkbox
                        label="Don't show this again"
                        checked={dontShowAgain}
                        onChange={(e) => setDontShowAgain(e.target.checked)}
                    />
                    <div className="welcome-actions">
                        <Button variant="secondary" onClick={handleClose}>
                            Skip
                        </Button>
                        <Button variant="primary" onClick={handleGetStarted}>
                            Get Started →
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

/**
 * Check if user has seen the welcome modal
 */
export function hasSeenWelcome(): boolean {
    return localStorage.getItem(WELCOME_SEEN_KEY) === 'true';
}

/**
 * Hook to manage welcome modal visibility
 * 
 * The welcome modal shows when:
 * 1. User visits for the first time (localStorage flag not set)
 * 2. AND user has no servers added
 * 
 * It's dismissed permanently when:
 * - User explicitly checks "Don't show again" and dismisses
 * 
 * It will show again if:
 * - User dismisses without checking the box AND returns with no servers
 */
export function useWelcomeModal() {
    const [showWelcome, setShowWelcome] = useState(false);

    useEffect(() => {
        // Only show welcome if user hasn't seen it
        // Server count check happens in App.tsx: shouldShowWelcome = showWelcome && servers.length === 0
        setShowWelcome(!hasSeenWelcome());
    }, []);

    return {
        showWelcome,
        setShowWelcome,
    };
}

