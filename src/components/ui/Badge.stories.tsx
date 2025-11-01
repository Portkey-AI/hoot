import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
    title: 'UI/Badge',
    component: Badge,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: 'select',
            options: ['default', 'primary', 'secondary', 'success', 'warning', 'danger', 'outline'],
        },
        size: {
            control: 'select',
            options: ['sm', 'md'],
        },
    },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
    args: {
        children: 'Default',
    },
};

export const Primary: Story = {
    args: {
        variant: 'primary',
        children: 'Primary',
    },
};

export const Secondary: Story = {
    args: {
        variant: 'secondary',
        children: 'Secondary',
    },
};

export const Success: Story = {
    args: {
        variant: 'success',
        children: 'Connected',
    },
};

export const Warning: Story = {
    args: {
        variant: 'warning',
        children: 'Warning',
    },
};

export const Danger: Story = {
    args: {
        variant: 'danger',
        children: 'Error',
    },
};

export const Outline: Story = {
    args: {
        variant: 'outline',
        children: 'v0.1.0',
    },
};

export const Small: Story = {
    args: {
        size: 'sm',
        variant: 'primary',
        children: 'HTTP',
    },
};

export const AllVariants: Story = {
    render: () => (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Badge variant="default">Default</Badge>
            <Badge variant="primary">Primary</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="danger">Danger</Badge>
            <Badge variant="outline">Outline</Badge>
        </div>
    ),
};

export const StatusExamples: Story = {
    render: () => (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Badge variant="success">Connected</Badge>
            <Badge variant="danger">Disconnected</Badge>
            <Badge variant="warning">Reconnecting</Badge>
            <Badge variant="primary">5 tools</Badge>
        </div>
    ),
};

export const TransportTypes: Story = {
    render: () => (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Badge variant="secondary" size="sm">HTTP</Badge>
            <Badge variant="secondary" size="sm">SSE</Badge>
            <Badge variant="secondary" size="sm">STDIO</Badge>
        </div>
    ),
};

