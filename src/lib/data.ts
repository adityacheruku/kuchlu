import type { User, Chat } from './types';

export const users: User[] = [
  { id: 'user1', name: 'You', avatar: 'https://placehold.co/100x100.png', online: true },
  { id: 'user2', name: 'Alice', avatar: 'https://placehold.co/100x100.png', online: true },
  { id: 'user3', name: 'Bob', avatar: 'https://placehold.co/100x100.png', online: false },
  { id: 'user4', name: 'Charlie', avatar: 'https://placehold.co/100x100.png', online: true },
  { id: 'user5', name: 'Diana', avatar: 'https://placehold.co/100x100.png', online: false },
];

export const chats: Chat[] = [
  {
    id: 'chat1',
    userIds: ['user1', 'user2'],
    messages: [
      { id: 'msg1', text: 'Hey Alice, how are you?', senderId: 'user1', timestamp: Date.now() - 1000 * 60 * 5 },
      { id: 'msg2', text: "I'm good, thanks! Just working on the new project. How about you?", senderId: 'user2', timestamp: Date.now() - 1000 * 60 * 4 },
      { id: 'msg3', text: 'Same here. It is going well. Did you see the latest designs?', senderId: 'user1', timestamp: Date.now() - 1000 * 60 * 3 },
      { id: 'msg4', text: 'Not yet, I will check them out now.', senderId: 'user2', timestamp: Date.now() - 1000 * 60 * 2 },
    ],
  },
  {
    id: 'chat2',
    userIds: ['user1', 'user3'],
    messages: [
      { id: 'msg5', text: 'Hi Bob, are you free for a call tomorrow?', senderId: 'user1', timestamp: Date.now() - 1000 * 60 * 20 },
      { id: 'msg6', text: 'Hey! Sure, what time works for you?', senderId: 'user3', timestamp: Date.now() - 1000 * 60 * 19 },
    ],
  },
  {
    id: 'chat3',
    userIds: ['user1', 'user4'],
    messages: [
      { id: 'msg7', text: 'Morning Charlie!', senderId: 'user1', timestamp: Date.now() - 1000 * 60 * 60 * 24 },
    ],
  },
  {
    id: 'chat4',
    userIds: ['user1', 'user5'],
    messages: [],
  },
];
