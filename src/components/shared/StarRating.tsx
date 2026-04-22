import React from 'react';
import { IonIcon } from '@ionic/react';
import { star, starOutline } from 'ionicons/icons';
import { Rating } from '../../types';

interface StarRatingProps {
  value: Rating;
  onChange?: (value: Rating) => void;
  readonly?: boolean;
  size?: number;
}

const StarRating: React.FC<StarRatingProps> = ({ value, onChange, readonly = false, size = 24 }) => {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
        <IonIcon
          key={n}
          icon={value !== null && n <= value ? star : starOutline}
          style={{
            fontSize: size,
            color: 'var(--ion-color-warning)',
            cursor: readonly ? 'default' : 'pointer',
          }}
          onClick={() => {
            if (!readonly && onChange) {
              onChange(n === value ? null : (n as Rating));
            }
          }}
        />
      ))}
    </div>
  );
};

export default StarRating;
