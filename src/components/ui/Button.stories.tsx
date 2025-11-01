import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
    title: 'UI/Button',
    component: Button,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: 'select',
            options: ['primary', 'secondary', 'danger', 'ghost', 'outline'],
        },
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
    },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
    args: {
        variant: 'primary',
        children: 'Primary Button',
    },
};

export const Secondary: Story = {
    args: {
        variant: 'secondary',
        children: 'Secondary Button',
    },
};

export const Danger: Story = {
    args: {
        variant: 'danger',
        children: 'Delete',
    },
};

export const Ghost: Story = {
    args: {
        variant: 'ghost',
        children: 'Ghost Button',
    },
};

export const Outline: Story = {
    args: {
        variant: 'outline',
        children: 'Outline Button',
    },
};

export const Small: Story = {
    args: {
        size: 'sm',
        children: 'Small Button',
    },
};

export const Medium: Story = {
    args: {
        size: 'md',
        children: 'Medium Button',
    },
};

export const Large: Story = {
    args: {
        size: 'lg',
        children: 'Large Button',
    },
};

export const Disabled: Story = {
    args: {
        disabled: true,
        children: 'Disabled Button',
    },
};

export const Loading: Story = {
    args: {
        className: 'btn-loading',
        disabled: true,
        children: 'Loading...',
    },
};

export const AllVariants: Story = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="outline">Outline</Button>
        </div>
    ),
};

export const AllSizes: Story = {
    render: () => (
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
        </div>
    ),
};

