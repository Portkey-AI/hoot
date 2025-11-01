import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';

const meta: Meta<typeof Card> = {
    title: 'UI/Card',
    component: Card,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: 'select',
            options: ['default', 'outlined', 'elevated'],
        },
        padding: {
            control: 'select',
            options: ['none', 'sm', 'md', 'lg'],
        },
    },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
    render: () => (
        <Card style={{ maxWidth: '400px' }}>
            <CardHeader>
                <CardTitle>Card Title</CardTitle>
                <CardDescription>This is a card description that provides more context.</CardDescription>
            </CardHeader>
            <CardContent>
                <p style={{ margin: 0, color: 'var(--text-primary)' }}>
                    Card content goes here. This is the main body of the card.
                </p>
            </CardContent>
        </Card>
    ),
};

export const Outlined: Story = {
    render: () => (
        <Card variant="outlined" style={{ maxWidth: '400px' }}>
            <CardHeader>
                <CardTitle>Outlined Card</CardTitle>
                <CardDescription>This card uses the outlined variant.</CardDescription>
            </CardHeader>
            <CardContent>
                <p style={{ margin: 0, color: 'var(--text-primary)' }}>
                    Perfect for content that needs to stand out with a border.
                </p>
            </CardContent>
        </Card>
    ),
};

export const Elevated: Story = {
    render: () => (
        <Card variant="elevated" style={{ maxWidth: '400px' }}>
            <CardHeader>
                <CardTitle>Elevated Card</CardTitle>
                <CardDescription>This card has a shadow for elevation.</CardDescription>
            </CardHeader>
            <CardContent>
                <p style={{ margin: 0, color: 'var(--text-primary)' }}>
                    Hover over this card to see the shadow effect change.
                </p>
            </CardContent>
        </Card>
    ),
};

export const WithFooter: Story = {
    render: () => (
        <Card style={{ maxWidth: '400px' }}>
            <CardHeader>
                <CardTitle>Server Configuration</CardTitle>
                <CardDescription>Configure your MCP server settings.</CardDescription>
            </CardHeader>
            <CardContent>
                <p style={{ margin: 0, color: 'var(--text-primary)' }}>
                    Make changes to your server configuration and save them.
                </p>
            </CardContent>
            <CardFooter>
                <Button variant="ghost">Cancel</Button>
                <Button variant="primary">Save Changes</Button>
            </CardFooter>
        </Card>
    ),
};

export const ServerCard: Story = {
    render: () => (
        <Card variant="elevated" style={{ maxWidth: '350px' }}>
            <CardHeader>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <CardTitle>Weather Service</CardTitle>
                    <Badge variant="success">Connected</Badge>
                </div>
                <CardDescription>Real-time weather data and forecasts</CardDescription>
            </CardHeader>
            <CardContent>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                        <span>Transport:</span>
                        <Badge variant="secondary" size="sm">HTTP</Badge>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                        <span>Tools:</span>
                        <Badge variant="primary" size="sm">5</Badge>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button variant="ghost" size="sm">Edit</Button>
                <Button variant="danger" size="sm">Delete</Button>
            </CardFooter>
        </Card>
    ),
};

export const NoPadding: Story = {
    render: () => (
        <Card padding="none" style={{ maxWidth: '400px' }}>
            <div style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--border-color)' }}>
                <CardTitle>Custom Padding</CardTitle>
                <CardDescription>This card has no default padding.</CardDescription>
            </div>
            <div style={{ padding: 'var(--spacing-lg)' }}>
                <p style={{ margin: 0, color: 'var(--text-primary)' }}>
                    You can add custom padding to specific sections.
                </p>
            </div>
        </Card>
    ),
};

export const AllVariants: Story = {
    render: () => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            <Card>
                <CardHeader>
                    <CardTitle>Default</CardTitle>
                    <CardDescription>Standard card style</CardDescription>
                </CardHeader>
            </Card>
            <Card variant="outlined">
                <CardHeader>
                    <CardTitle>Outlined</CardTitle>
                    <CardDescription>With border emphasis</CardDescription>
                </CardHeader>
            </Card>
            <Card variant="elevated">
                <CardHeader>
                    <CardTitle>Elevated</CardTitle>
                    <CardDescription>With shadow</CardDescription>
                </CardHeader>
            </Card>
        </div>
    ),
};

