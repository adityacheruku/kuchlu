export type User = {
  id: string;
  avatar: string;
  name: string;
  online: boolean;
};

export type Message = {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
};

export type Chat = {
  id: string;
  userIds: string[];
  messages: Message[];
};
