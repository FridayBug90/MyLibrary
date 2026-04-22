import React from 'react';
import { IonList, IonText } from '@ionic/react';
import BlurayItem from './BlurayItem';
import { Bluray } from '../../types';

interface BlurayListProps {
  blurays: Bluray[];
  onEdit: (bluray: Bluray) => void;
  onDelete: (id: number) => void;
  onDetail: (bluray: Bluray) => void;
}

const BlurayList = React.forwardRef<HTMLIonListElement, BlurayListProps>(
  ({ blurays, onEdit, onDelete, onDetail }, ref) => {
    if (blurays.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <IonText color="medium">
            <p>Nessun Blu-ray trovato.</p>
            <p>Tocca + per aggiungerne uno.</p>
          </IonText>
        </div>
      );
    }

    return (
      <IonList ref={ref} style={{ background: 'transparent', padding: '4px 0 8px' }}>
        {blurays.map(b => (
          <BlurayItem key={b.id} bluray={b} onEdit={onEdit} onDelete={onDelete} onDetail={onDetail} />
        ))}
      </IonList>
    );
  }
);

BlurayList.displayName = 'BlurayList';

export default BlurayList;
