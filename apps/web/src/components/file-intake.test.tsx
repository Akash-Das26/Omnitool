import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FileIntake } from './file-intake';

function file(name: string, type: string) {
  return new File(['hello'], name, { type });
}

describe('FileIntake', () => {
  it('exposes iOS-friendly extensions in the accept attribute', () => {
    const { container } = render(<FileIntake accept={['image/*']} onFiles={() => {}} />);
    const input = container.querySelector('input[type="file"]');
    expect(input?.getAttribute('accept')).toContain('image/*');
    expect(input?.getAttribute('accept')).toContain('.png');
  });

  it('passes picked files to the callback', () => {
    const onFiles = vi.fn();
    const { container } = render(<FileIntake accept={['image/*']} onFiles={onFiles} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const png = file('photo.png', 'image/png');

    fireEvent.change(input, { target: { files: [png] } });

    expect(onFiles).toHaveBeenCalledWith([png]);
  });

  it('accepts files by drag and drop', () => {
    const onFiles = vi.fn();
    render(<FileIntake accept={['image/*']} onFiles={onFiles} label="Drop zone" />);
    const zone = screen.getByRole('group', { name: 'Drop zone' });
    const png = file('photo.png', 'image/png');

    fireEvent.drop(zone, { dataTransfer: { files: [png] } });

    expect(onFiles).toHaveBeenCalledWith([png]);
  });

  it('accepts pasted files', () => {
    const onFiles = vi.fn();
    render(<FileIntake accept={['image/*']} onFiles={onFiles} label="Paste zone" />);
    const zone = screen.getByRole('group', { name: 'Paste zone' });
    const png = file('clip.png', 'image/png');

    fireEvent.paste(zone, { clipboardData: { files: [png] } });

    expect(onFiles).toHaveBeenCalledWith([png]);
  });

  it('explains a rejected file', () => {
    const onFiles = vi.fn();
    render(<FileIntake accept={['image/*']} onFiles={onFiles} label="Image zone" />);
    const zone = screen.getByRole('group', { name: 'Image zone' });

    fireEvent.drop(zone, { dataTransfer: { files: [file('doc.pdf', 'application/pdf')] } });

    expect(onFiles).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('not supported');
  });
});
