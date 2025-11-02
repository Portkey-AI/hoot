import React, { useState, ReactNode } from 'react';
import './Tabs.css';

export interface Tab {
    value: string;
    label: string;
    icon?: ReactNode;
    disabled?: boolean;
}

export interface TabsProps {
    tabs: Tab[];
    defaultValue?: string;
    value?: string;
    onChange?: (value: string) => void;
    className?: string;
    children?: (activeTab: string) => ReactNode;
}

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
    ({ tabs, defaultValue, value: controlledValue, onChange, className = '', children }, ref) => {
        const [internalValue, setInternalValue] = useState(defaultValue || tabs[0]?.value || '');

        const isControlled = controlledValue !== undefined;
        const activeTab = isControlled ? controlledValue : internalValue;

        const handleTabChange = (tabValue: string) => {
            if (!isControlled) {
                setInternalValue(tabValue);
            }
            onChange?.(tabValue);
        };

        return (
            <div ref={ref} className={`tabs-wrapper ${className}`}>
                <div className="tabs-list" role="tablist">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.value;
                        const isDisabled = tab.disabled;

                        return (
                            <button
                                key={tab.value}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                aria-disabled={isDisabled}
                                className={`tab ${isActive ? 'tab-active' : ''}`}
                                onClick={() => !isDisabled && handleTabChange(tab.value)}
                                disabled={isDisabled}
                            >
                                {tab.icon && <span className="tab-icon">{tab.icon}</span>}
                                <span className="tab-label">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="tabs-content">
                    {children?.(activeTab)}
                </div>
            </div>
        );
    }
);

Tabs.displayName = 'Tabs';

