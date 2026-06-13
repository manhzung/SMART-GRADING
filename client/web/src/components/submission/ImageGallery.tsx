import React from 'react';

export type GalleryImageType = 'original' | 'preprocessed' | 'annotated';

interface ImageGalleryProps {
  originalUrl?: string;
  preprocessedUrl?: string;
  annotatedUrl?: string;
  onImageClick?: (type: GalleryImageType) => void;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  originalUrl,
  preprocessedUrl,
  annotatedUrl,
  onImageClick,
}) => {
  const tiles: Array<{ type: GalleryImageType; url?: string }> = [
    { type: 'original', url: originalUrl },
    { type: 'preprocessed', url: preprocessedUrl },
    { type: 'annotated', url: annotatedUrl },
  ];

  return (
    <div
      className="image-gallery"
      data-testid="image-gallery"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
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
              onClick={() => onImageClick?.(type)}
              style={{
                width: '100%',
                cursor: onImageClick ? 'pointer' : 'default',
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
