import { ChatLayout } from '@/components/chat/chat-layout';
import { users, chats } from '@/lib/data';

export default function Home() {
  const currentUser = users[0];
  const otherUsers = users.slice(1);

  return (
    <main className="h-dvh bg-background">
      <ChatLayout
        defaultUser={currentUser}
        users={otherUsers}
        chats={chats}
      />
    </main>
  );
}
