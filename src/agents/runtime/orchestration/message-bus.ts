import type { MessageBusEvent } from "../../types/orchestration";

export type MessageBusHandler = (event: MessageBusEvent) => void;

export class AgentMessageBus {
  private handlers = new Map<string, Set<MessageBusHandler>>();

  /**
   * Subscribes a listener to a topic.
   */
  subscribe(topic: string, handler: MessageBusHandler): void {
    const key = topic.toLowerCase().trim();
    if (!this.handlers.has(key)) {
      this.handlers.set(key, new Set<MessageBusHandler>());
    }
    this.handlers.get(key)!.add(handler);
  }

  /**
   * Unsubscribes a listener from a topic.
   */
  unsubscribe(topic: string, handler: MessageBusHandler): void {
    const key = topic.toLowerCase().trim();
    const handlersSet = this.handlers.get(key);
    if (handlersSet) {
      handlersSet.delete(handler);
      if (handlersSet.size === 0) {
        this.handlers.delete(key);
      }
    }
  }

  /**
   * Publishes an event payload to a topic, executing handler callbacks synchronously.
   */
  publish(topic: string, senderId: string, payload: Record<string, unknown>): void {
    const key = topic.toLowerCase().trim();
    const handlersSet = this.handlers.get(key);
    if (!handlersSet) return;

    const event: MessageBusEvent = {
      id: `ev-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      topic,
      senderId,
      timestamp: new Date().toISOString(),
      payload,
    };

    for (const handler of handlersSet) {
      try {
        handler(event);
      } catch (err) {
        // Suppress callback failures
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
