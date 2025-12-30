import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs';

describe('Tabs Component', () => {
  const renderTabs = (props = {}) => {
    return render(
      <Tabs defaultValue="tab1" {...props}>
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          <TabsTrigger value="tab3">Tab 3</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
        <TabsContent value="tab3">Content 3</TabsContent>
      </Tabs>
    );
  };

  it('should render all tab triggers', () => {
    renderTabs();

    expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tab 2' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tab 3' })).toBeInTheDocument();
  });

  it('should show default tab content', () => {
    renderTabs();

    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });

  it('should switch tab content on click', async () => {
    renderTabs();

    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'Tab 2' }));

    await waitFor(() => {
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });
  });

  it('should mark active tab as selected', () => {
    renderTabs();

    const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
    expect(tab1).toHaveAttribute('data-state', 'active');

    const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
    expect(tab2).toHaveAttribute('data-state', 'inactive');
  });

  it('should call onValueChange when tab changes', async () => {
    const handleChange = vi.fn();
    renderTabs({ onValueChange: handleChange });

    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'Tab 2' }));

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith('tab2');
    });
  });

  it('should support controlled value', () => {
    render(
      <Tabs value="tab2">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    );

    expect(screen.getByText('Content 2')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tab 2' })).toHaveAttribute('data-state', 'active');
  });

  it('should disable tab when disabled prop is true', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2" disabled>Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    );

    const disabledTab = screen.getByRole('tab', { name: 'Tab 2' });
    expect(disabledTab).toBeDisabled();
  });
});
