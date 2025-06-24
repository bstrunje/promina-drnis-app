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

## Rješavanje problema

### Problem: Poslane poruke običnog člana se ne prikazuju ispravno

**Simptomi:**
Kada se običan član (ne-administrator) prijavi i ode na stranicu s poslanim porukama, poruke se prikazuju bez teksta i vremena slanja. Podaci s backenda stižu ispravno, ali se gube na frontendu.

**Uzrok:**
Problem je bio u komponenti `frontend/src/features/messages/MemberMessageList.tsx`. Ova komponenta se prikazuje isključivo običnim članovima i imala je nekoliko problema:

1.  Sadržavala je internu, lokalnu funkciju za konverziju API odgovora u format poruke (`convertApiMessagesToMessages`) koja je bila namijenjena samo za poruke koje prima član, a ne za one koje šalje.
2.  Ta pogrešna funkcija se koristila i za dohvaćanje poslanih poruka, što je uzrokovalo gubitak polja `message_text` i `created_at` jer API za poslane poruke vraća drugačiju strukturu (`content` i `timestamp`).
3.  Kasnije je otkrivena i pogrešna putanja za uvoz modula `messageConverters` (`../../utils/` umjesto `./utils/`), što je uzrokovalo TypeScript greške.

**Rješenje (koraci za reprodukciju):**

1.  **Identificirati pravu komponentu:** Prepoznati da se za članove učitava `MemberMessageList.tsx`, a ne `SentMessages.tsx` (koja je za administratore).

2.  **Centralizirati logiku konverzije:** U datoteci `frontend/src/features/messages/utils/messageConverters.ts` osigurati postojanje dvije odvojene funkcije:
    *   `convertApiMessagesToMessages`: Za konverziju primljenih poruka.
    *   `convertMemberApiMessageToMessage`: Nova funkcija, specifično za konverziju poslanih poruka člana, koja ispravno mapira `content` -> `message_text` i `timestamp` -> `created_at`.

3.  **Očistiti `MemberMessageList.tsx`:**
    *   Obrisati sve lokalne, pomoćne funkcije za konverziju poruka unutar komponente.
    *   Ispraviti putanju za uvoz `messageConverters` modula na:
        ```typescript
        import { convertApiMessagesToMessages, convertMemberApiMessageToMessage } from './utils/messageConverters';
        ```

4.  **Primijeniti ispravne konvertere:** Unutar `MemberMessageList.tsx`, osigurati da se koriste ispravne funkcije na pravim mjestima:
    *   U funkciji `fetchMessages` (za primljene poruke) koristiti `convertApiMessagesToMessages`.
    *   U funkciji `fetchSentMessages` (za poslane poruke) koristiti `apiData.map(convertMemberApiMessageToMessage)`.

Ovim koracima osigurava se da se za svaku vrstu poruke (primljena/poslana) koristi ispravna logika konverzije, čime se problem rješava, a kod ostaje čist i centraliziran.

## Poboljšanja korisničkog iskustva i ispravci logike (Lipanj 2025)

#### 1. Pošiljatelj više ne prima vlastitu poruku

*   **Problem:** Kada bi administrator ili superuser poslao poruku grupi članova ili svim članovima, i sam bi primao tu istu poruku u svoj sandučić "Nepročitane". To je bilo suvišno jer se sve poslane poruke već nalaze u odjeljku "Poslane poruke".
*   **Rješenje:** Problem je riješen na backendu, u repozitoriju `backend/src/repositories/member.message.repository.ts`.
    *   Unutar funkcije `createAdminMessage`, uklonjen je blok koda koji je eksplicitno dodavao `senderId` natrag na listu primatelja (`finalRecipientIds`).
    *   Za grupne poruke (`recipientType === 'group'`), dodan je `.filter(id => id !== senderId)` kako bi se osiguralo da pošiljatelj nikada nije na listi primatelja.
    *   Za poruke svima (`recipientType === 'all'`), provjereno je da funkcija `findAllActiveMemberIds` već ispravno izuzima pošiljatelja.

#### 2. Poboljšan prikaz poruka za članove

*   **Problem:** Stranica s porukama za članove (`MemberMessageList.tsx`) je po zadanom prikazivala filter "Sve poruke". Bilo je poželjno da se inicijalno prikazuju "Nepročitane" poruke, jer su one najrelevantnije korisniku.
*   **Rješenje:** Problem je riješen na frontendu, u komponenti `frontend/src/features/messages/MemberMessageList.tsx`.
    *   Inicijalno stanje za filter promijenjeno je iz `'all'` u `'unread'`: `const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('unread');`
    *   Redoslijed gumba za filtriranje je promijenjen u JSX-u kako bi vizualno pratio logiku: "Nepročitane", "Pročitane", pa "Sve poruke".

## Testiranje

Sustav poruka je pokriven testovima:

- **message.service.test.ts** - Testovi za servis poruka
- **member.message.repository.test.ts** - Testovi za repozitorij poruka

## Napomene za razvoj

1. **Prisma tipovi** - Koristimo Prisma-generirane tipove umjesto ručno definiranih sučelja
2. **TransformedMessage** - Koristimo `TransformedMessage` sučelje za predstavljanje poruka u aplikaciji
3. **Status poruke** - Status poruke je sada vezan za primatelja, a ne za samu poruku
4. **Pošiljatelj kao primatelj** - Pošiljatelj je uvijek dodan kao primatelj poruke kako bi mogao vidjeti svoje poruke
