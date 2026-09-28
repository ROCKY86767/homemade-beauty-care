import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  size?: number;
  className?: string;
}

export default function StarRating({ rating, size = 16, className = '' }: StarRatingProps) {
  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          size={size}
          className={
            star <= Math.round(rating)
              ? 'fill-accent text-accent'
              : 'fill-gray-200 text-gray-200'
          }
        />
      ))}
    </div>
  );
}
