import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageGallery } from './ImageGallery';

describe('ImageGallery', () => {
  it('renders 3 image tiles when all URLs provided', () => {
    render(
      <ImageGallery
        originalUrl="https://x/o.jpg"
        preprocessedUrl="https://x/p.jpg"
        annotatedUrl="https://x/a.jpg"
      />
    );

    expect(screen.getByTestId('tile-original')).toBeInTheDocument();
    expect(screen.getByTestId('tile-preprocessed')).toBeInTheDocument();
    expect(screen.getByTestId('tile-annotated')).toBeInTheDocument();

    expect(screen.getByAltText(/original/i)).toHaveAttribute(
      'src',
      'https://x/o.jpg'
    );
    expect(screen.getByAltText(/preprocessed/i)).toHaveAttribute(
      'src',
      'https://x/p.jpg'
    );
    expect(screen.getByAltText(/annotated/i)).toHaveAttribute(
      'src',
      'https://x/a.jpg'
    );
  });

  it('shows fallback for missing image', () => {
    render(<ImageGallery originalUrl="https://x/o.jpg" />);
    expect(screen.getByTestId('fallback-preprocessed')).toBeInTheDocument();
    expect(screen.getByTestId('fallback-annotated')).toBeInTheDocument();
  });

  it('invokes onImageClick when image is clicked', () => {
    const onClick = vi.fn();
    render(
      <ImageGallery
        originalUrl="https://x/o.jpg"
        onImageClick={onClick}
      />
    );
    fireEvent.click(screen.getByAltText(/original/i));
    expect(onClick).toHaveBeenCalledWith('original');
  });
});
