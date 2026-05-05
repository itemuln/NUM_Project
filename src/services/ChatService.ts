import type { CommunityChatMessage } from "@/types";

interface SendMessageInput {
  senderId: string;
  communityId: string;
  content: string;
}

type MessageListener = (message: CommunityChatMessage) => void;

class CommunitySocket {
  private listeners = new Map<string, Set<MessageListener>>();

  subscribe(communityId: string, listener: MessageListener) {
    const listeners = this.listeners.get(communityId) ?? new Set<MessageListener>();
    listeners.add(listener);
    this.listeners.set(communityId, listeners);

    return () => {
      listeners.delete(listener);

      if (listeners.size === 0) {
        this.listeners.delete(communityId);
      }
    };
  }

  publish(message: CommunityChatMessage) {
    const listeners = this.listeners.get(message.community_id);
    if (!listeners) return;

    listeners.forEach((listener) => listener(message));
  }
}

const makeMessageId = () => {
  if ("crypto" in window && "randomUUID" in window.crypto) {
    return `community-message-${window.crypto.randomUUID()}`;
  }

  return `community-message-${Date.now()}`;
};

export class ChatService {
  private socket = new CommunitySocket();

  private messagesByCommunity = new Map<string, CommunityChatMessage[]>();

  constructor(initialMessages: CommunityChatMessage[] = []) {
    initialMessages.forEach((message) => {
      const messages = this.messagesByCommunity.get(message.community_id) ?? [];
      messages.push(message);
      this.messagesByCommunity.set(message.community_id, messages);
    });
  }

  listMessages(communityId: string) {
    return [...(this.messagesByCommunity.get(communityId) ?? [])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  getAllMessages() {
    return Object.fromEntries(
      Array.from(this.messagesByCommunity.entries()).map(([communityId, messages]) => [
        communityId,
        [...messages]
      ])
    );
  }

  sendMessage(input: SendMessageInput) {
    const content = input.content.trim();
    if (!content) return null;

    const message: CommunityChatMessage = {
      id: makeMessageId(),
      sender_id: input.senderId,
      community_id: input.communityId,
      content,
      created_at: new Date().toISOString()
    };

    const messages = this.messagesByCommunity.get(input.communityId) ?? [];
    messages.push(message);
    this.messagesByCommunity.set(input.communityId, messages);
    window.setTimeout(() => this.socket.publish(message), 0);

    return message;
  }

  subscribe(communityId: string, listener: MessageListener) {
    return this.socket.subscribe(communityId, listener);
  }
}
