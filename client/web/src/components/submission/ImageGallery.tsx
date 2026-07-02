import React from 'react';

export type GalleryImageType = 'original' | 'annotated';

interface ImageGalleryProps {
  originalUrl?: string;
  preprocessedUrl?: string;
  annotatedUrl?: string;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  originalUrl,
  annotatedUrl,
}) => {
  const tiles: Array<{ type: GalleryImageType; url?: string }> = [
    { type: 'original', url: originalUrl },
    { type: 'annotated', url: annotatedUrl },
  ];

  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="image-gallery"
      data-testid="image-gallery"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 16,
      }}
    >
      {tiles.map(({ type, url }) => (
        <div
          key={type}
          className="image-tile"
          data-testid={`tile-${type}`}
        >
          <h4 style={{ margin: '0 0 8px' }}>{type}</h4>
          {url ? (
            <img
              src={url}
              alt={`${type} submission image`}
              onClick={() => openInNewTab(url)}
              style={{
                width: '100%',
                cursor: 'pointer',
              }}
            />
          ) : (
            <div
              data-testid={`fallback-${type}`}
              style={{
                padding: 24,
                background: '#f3f4f6',
                textAlign: 'center',
              }}
            >
              {type} (missing)
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
