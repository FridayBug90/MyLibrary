import React from 'react';
import { IonList, IonText } from '@ionic/react';
import BookItem from './BookItem';
import { Book } from '../../types';

interface BookListProps {
  books: Book[];
  onEdit: (book: Book) => void;
  onDelete: (id: number) => void;
  onDetail: (book: Book) => void;
}

const BookList = React.forwardRef<HTMLIonListElement, BookListProps>(
  ({ books, onEdit, onDelete, onDetail }, ref) => {
    if (books.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <IonText color="medium">
            <p>Nessun libro trovato.</p>
            <p>Tocca + per aggiungerne uno.</p>
          </IonText>
        </div>
      );
    }

    return (
      <IonList ref={ref} style={{ background: 'transparent', padding: '4px 0 8px' }}>
        {books.map(b => (
          <BookItem key={b.id} book={b} onEdit={onEdit} onDelete={onDelete} onDetail={onDetail} />
        ))}
      </IonList>
    );
  }
);

BookList.displayName = 'BookList';

export default BookList;
