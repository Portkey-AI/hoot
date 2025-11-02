import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Tabs } from './Tabs';
import { Settings, User, Bell } from 'lucide-react';

const meta: Meta<typeof Tabs> = {
    title: 'UI/Tabs',
    component: Tabs,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
    args: {
        tabs: [
            { value: 'tab1', label: 'Tab 1' },
            { value: 'tab2', label: 'Tab 2' },
            { value: 'tab3', label: 'Tab 3' },
        ],
        children: (activeTab) => (
            <div style={{ padding: '1rem' }}>
                <p>Content for {activeTab}</p>
            </div>
        ),
    },
};

export const WithIcons: Story = {
    args: {
        tabs: [
            { value: 'profile', label: 'Profile', icon: <User size={16} /> },
            { value: 'settings', label: 'Settings', icon: <Settings size={16} /> },
            { value: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
        ],
        children: (activeTab) => (
            <div style={{ padding: '1rem' }}>
                <p>Content for {activeTab}</p>
            </div>
        ),
    },
};

export const WithDisabledTab: Story = {
    args: {
        tabs: [
            { value: 'tab1', label: 'Enabled Tab' },
            { value: 'tab2', label: 'Disabled Tab', disabled: true },
            { value: 'tab3', label: 'Another Tab' },
        ],
        children: (activeTab) => (
            <div style={{ padding: '1rem' }}>
                <p>Content for {activeTab}</p>
            </div>
        ),
    },
};

export const ConfigurationExample: Story = {
    args: {
        tabs: [
            { value: 'general', label: 'General', icon: <Settings size={16} /> },
            { value: 'profile', label: 'Profile', icon: <User size={16} /> },
        ],
        children: (activeTab) => (
            <div style={{ padding: '1.5rem', maxWidth: '500px' }}>
                {activeTab === 'general' && (
                    <div>
                        <h3 style={{ marginTop: 0 }}>General Settings</h3>
                        <p>Configure your general application settings here.</p>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                            Application Name:
                            <input type="text" style={{ marginLeft: '0.5rem' }} defaultValue="My App" />
                        </label>
                    </div>
                )}
                {activeTab === 'profile' && (
                    <div>
                        <h3 style={{ marginTop: 0 }}>Profile Settings</h3>
                        <p>Manage your user profile information.</p>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                            Username:
                            <input type="text" style={{ marginLeft: '0.5rem' }} defaultValue="johndoe" />
                        </label>
                    </div>
                )}
            </div>
        ),
    },
};

