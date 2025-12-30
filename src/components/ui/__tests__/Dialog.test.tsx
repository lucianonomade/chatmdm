import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../dialog';
import { Button } from '../button';

describe('Dialog Component', () => {
  it('should render trigger button', () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Description for trigger test</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByRole('button', { name: /open dialog/i })).toBeInTheDocument();
  });

  it('should open dialog when trigger is clicked', async () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog description text</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

    fireEvent.click(screen.getByRole('button', { name: /open dialog/i }));

    await waitFor(() => {
      expect(screen.getByText('Dialog Title')).toBeInTheDocument();
      expect(screen.getByText('Dialog description text')).toBeInTheDocument();
    });
  });

  it('should render controlled dialog', () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Controlled Dialog</DialogTitle>
            <DialogDescription>Controlled description</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByText('Controlled Dialog')).toBeInTheDocument();
  });

  it('should call onOpenChange when dialog state changes', async () => {
    const handleOpenChange = vi.fn();

    render(
      <Dialog onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button>Open</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test</DialogTitle>
            <DialogDescription>Test description</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

    fireEvent.click(screen.getByRole('button', { name: /open/i }));

    await waitFor(() => {
      expect(handleOpenChange).toHaveBeenCalledWith(true);
    });
  });

  it('should render dialog with footer', async () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>With Footer</DialogTitle>
            <DialogDescription>Footer test description</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button>Cancel</Button>
            <Button>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
  });

  it('should close dialog with DialogClose', async () => {
    const handleOpenChange = vi.fn();

    render(
      <Dialog open={true} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Closeable</DialogTitle>
            <DialogDescription>Close test description</DialogDescription>
          </DialogHeader>
          <DialogClose asChild>
            <Button>Close</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    );

    // Use getAllByRole and pick the last button (the one in our test content)
    // to avoid ambiguity with the Dialog's built-in X button
    const closeButtons = screen.getAllByRole('button', { name: /close/i });
    fireEvent.click(closeButtons[closeButtons.length - 1]);

    await waitFor(() => {
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
