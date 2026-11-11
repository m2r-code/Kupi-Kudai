import { useState } from 'react';
import { Utensils } from 'lucide-react';

interface MenuImageProps {
  src: string;
  alt: string;
  className?: string;
  variant?: 'dish' | 'venue';
}

export function MenuImage({ src, alt, className = '', variant = 'dish' }: MenuImageProps) {
  const [hasError, setHasError] = useState(false);

  // Dynamically resolve image paths to work on GitHub Pages subpaths, custom domains, and local dev
  const resolveSrc = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    const clean = url.replace(/^\.?\//, '');
    const base = import.meta.env.BASE_URL || './';
    return `${base.replace(/\/$/, '')}/${clean}`;
  };

  if (hasError || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-[#E9E6D3] p-4 text-center text-[#525F55] ${className}`}
      >
        <Utensils className="h-6 w-6 text-[#1E4D31]/60" aria-hidden="true" />
        <span className="line-clamp-2 text-xs font-medium text-[#1A241C]/75">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={resolveSrc(src)}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={`${
        variant === 'dish' ? 'bg-[#E9E6D3] object-contain' : 'bg-[#EDE9DF] object-cover'
      } ${className}`}
      loading="lazy"
    />
  );
}
