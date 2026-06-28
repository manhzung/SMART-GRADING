import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageGallery } from './ImageGallery';

describe('ImageGallery', () => {
  it('renders only original and annotated tiles (no preprocessed)', () => {
    render(
      <ImageGallery
        originalUrl="https://x/o.jpg"
        preprocessedUrl="https://x/p.jpg"
        annotatedUrl="https://x/a.jpg"
      />
    );

    expect(screen.getByTestId('tile-original')).toBeInTheDocument();
    expect(screen.getByTestId('tile-annotated')).toBeInTheDocument();
    expect(screen.queryByTestId('tile-preprocessed')).not.toBeInTheDocument();
    expect(screen.queryByAltText(/preprocessed/i)).not.toBeInTheDocument();

    expect(screen.getByAltText(/original/i)).toHaveAttribute(
      'src',
      'https://x/o.jpg'
    );
    expect(screen.getByAltText(/annotated/i)).toHaveAttribute(
      'src',
      'https://x/a.jpg'
    );
  });

  it('shows fallback for missing annotated image', () => {
    render(<ImageGallery originalUrl="https://x/o.jpg" />);
    expect(screen.getByTestId('fallback-annotated')).toBeInTheDocument();
    expect(screen.queryByTestId('fallback-preprocessed')).not.toBeInTheDocument();
  });

  it('opens image in new tab when clicked', () => {
    const openSpy = vi
      .spyOn(window, 'open')
      .mockImplementation(() => null);

    render(<ImageGallery originalUrl="https://x/o.jpg" />);
    fireEvent.click(screen.getByAltText(/original/i));

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy.mock.calls[0][0]).toBe('https://x/o.jpg');
    expect(openSpy.mock.calls[0][1]).toBe('_blank');

    openSpy.mockRestore();
  });

  it('opens annotated image in new tab when clicked', () => {
    const openSpy = vi
      .spyOn(window, 'open')
      .mockImplementation(() => null);

    render(<ImageGallery annotatedUrl="https://x/a.jpg" />);
    fireEvent.click(screen.getByAltText(/annotated/i));

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy.mock.calls[0][0]).toBe('https://x/a.jpg');
    expect(openSpy.mock.calls[0][1]).toBe('_blank');

    openSpy.mockRestore();
  });
});
