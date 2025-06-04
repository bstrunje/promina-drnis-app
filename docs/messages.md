# Sustav poruka u Promina-Drnis aplikaciji

## Pregled

Sustav poruka omogućuje komunikaciju između članova udruge i administratora. Implementiran je kroz nekoliko slojeva:

1. **Backend**
   - Repozitorij poruka (`member.message.repository.ts`)
   - Servis poruka (`message.service.ts`)
   - Kontroleri poruka (`member.message.controller.ts`, `member.controller.ts`)

2. **Frontend**
   - React komponente za prikaz i upravljanje porukama (`features/messages`)
   - API klijent za komunikaciju s backendom

## Struktura podataka

### Baza podataka

Poruke su implementirane kroz nekoliko tablica u bazi podataka:

- **member_messages** - Sadrži osnovne podatke o poruci
  - `message_id` - Jedinstveni identifikator poruke
  - `member_id` - ID člana koji je poslao poruku (legacy polje)
  - `message_text` - Tekst poruke
  - `created_at` - Datum i vrijeme kreiranja poruke
  - `sender_id` - ID pošiljatelja
  - `recipient_id` - ID primatelja (koristi se samo za direktne poruke)
  - `recipient_type` - Tip primatelja ('member', 'group', 'all')
  - `sender_type` - Tip pošiljatelja ('member', 'member_administrator', 'member_superuser')

- **message_recipient_status** - Sadrži podatke o statusu poruke za svakog primatelja
  - `message_id` - ID poruke
  - `recipient_member_id` - ID primatelja
  - `status` - Status poruke ('unread', 'read', 'archived')
  - `read_at` - Datum i vrijeme kada je poruka pročitana
  - `created_at` - Datum i vrijeme kreiranja zapisa
  - `updated_at` - Datum i vrijeme zadnje promjene statusa

### TypeScript tipovi

Poruke su predstavljene kroz nekoliko tipova:

- **PrismaMemberMessage** - Tip generiran iz Prisma sheme, predstavlja zapis u `member_messages` tablici
- **TransformedMessage** - Tip koji se koristi u aplikaciji, sadrži podatke iz `member_messages` tablice i dodatne podatke iz relacija
  ```typescript
  interface TransformedMessage {
      message_id: number;
      member_id: number | null;
      message_text: string;
      created_at: Date;
      sender_id: number | null;
      recipient_id: number | null;
      recipient_type: PrismaMemberMessage['recipient_type'];
      sender_type: PrismaMemberMessage['sender_type'];
      currentUserStatus?: 'unread' | 'read' | 'archived';
      currentUserReadAt?: Date | null;
      sender?: {
          member_id: number;
          first_name: string | null;
          last_name: string | null;
          full_name: string | null;
      } | null;
  }
  ```

## Backend implementacija

### Repozitorij poruka

Repozitorij poruka (`member.message.repository.ts`) sadrži metode za rad s porukama:

- **create** - Kreira novu poruku koju član šalje administratorima
- **createAdminMessage** - Kreira novu poruku koju administrator šalje članovima
- **getByMemberId** - Dohvaća poruke za određenog člana
- **getAllForAdmin** - Dohvaća sve poruke za administratora
- **getMessagesSentByAdmin** - Dohvaća poruke koje je poslao određeni administrator
- **getAdHocGroupMessagesForMember** - Dohvaća grupne poruke za određenog člana
- **getMessagesForAllMembers** - Dohvaća poruke za sve članove
- **markAsRead** - Označava poruku kao pročitanu
- **archiveMessage** - Arhivira poruku
- **deleteMessage** - Briše poruku
- **deleteAllMessages** - Briše sve poruke

### Servis poruka

Servis poruka (`message.service.ts`) koristi repozitorij poruka i pruža metode za rad s porukama:

- **createMessage** - Kreira novu poruku
- **createAdminMessage** - Kreira novu poruku koju administrator šalje članovima
- **getMemberMessages** - Dohvaća poruke za određenog člana
- **getAdminMessages** - Dohvaća poruke za administratora
- **getMessagesSentByAdmin** - Dohvaća poruke koje je poslao određeni administrator
- **getAdHocGroupMessagesForMember** - Dohvaća grupne poruke za određenog člana
- **getMessagesForAllMembers** - Dohvaća poruke za sve članove
- **markMessageAsRead** - Označava poruku kao pročitanu
- **archiveMessage** - Arhivira poruku
- **deleteMessage** - Briše poruku
- **deleteAllMessages** - Briše sve poruke

### Kontroleri poruka

Kontroleri poruka (`member.message.controller.ts`, `member.controller.ts`) izlažu REST API za rad s porukama:

- **GET /api/members/messages** - Dohvaća poruke za trenutnog člana
- **POST /api/members/messages** - Kreira novu poruku
- **PUT /api/members/messages/:id/read** - Označava poruku kao pročitanu
- **PUT /api/members/messages/:id/archive** - Arhivira poruku
- **DELETE /api/members/messages/:id** - Briše poruku

## Frontend implementacija

Frontend implementacija koristi React komponente za prikaz i upravljanje porukama:

- **MessageList** - Prikazuje listu poruka
- **MessageDetail** - Prikazuje detalje poruke
- **MessageForm** - Forma za slanje nove poruke
- **MessageActions** - Akcije za upravljanje porukama (označavanje kao pročitano, arhiviranje, brisanje)

## Tokovi poruka

### Član šalje poruku administratorima

1. Član ispunjava formu za slanje poruke
2. Frontend poziva API endpoint za kreiranje poruke
3. Backend kreira novu poruku u bazi podataka
4. Backend kreira zapise u `message_recipient_status` tablici za sve administratore
5. Poruka je vidljiva administratorima u njihovom inboxu

### Administrator šalje poruku članu

1. Administrator ispunjava formu za slanje poruke
2. Frontend poziva API endpoint za kreiranje poruke
3. Backend kreira novu poruku u bazi podataka
4. Backend kreira zapis u `message_recipient_status` tablici za člana
5. Poruka je vidljiva članu u njegovom inboxu

### Administrator šalje poruku svim članovima

1. Administrator ispunjava formu za slanje poruke
2. Frontend poziva API endpoint za kreiranje poruke
3. Backend kreira novu poruku u bazi podataka
4. Backend kreira zapise u `message_recipient_status` tablici za sve članove
5. Poruka je vidljiva svim članovima u njihovom inboxu

## Testiranje

Sustav poruka je pokriven testovima:

- **message.service.test.ts** - Testovi za servis poruka
- **member.message.repository.test.ts** - Testovi za repozitorij poruka

## Napomene za razvoj

1. **Prisma tipovi** - Koristimo Prisma-generirane tipove umjesto ručno definiranih sučelja
2. **TransformedMessage** - Koristimo `TransformedMessage` sučelje za predstavljanje poruka u aplikaciji
3. **Status poruke** - Status poruke je sada vezan za primatelja, a ne za samu poruku
4. **Pošiljatelj kao primatelj** - Pošiljatelj je uvijek dodan kao primatelj poruke kako bi mogao vidjeti svoje poruke
