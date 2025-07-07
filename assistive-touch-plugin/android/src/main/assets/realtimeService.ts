
"use client";

import type { Message, MessageAckEventData, UserPresenceUpdateEventData, TypingIndicatorEventData, ThinkingOfYouReceivedEventData, NewMessageEventData, MessageReactionUpdateEventData, UserProfileUpdateEventData, EventPayload, ChatModeChangedEventData, MessageDeletedEventData } from '@/types';
// The api import is removed as this service will now be self-contained and configured by the native layer.

const HEARTBEAT_INTERVAL = 30000;
const SERVER_ACTIVITY_TIMEOUT = 45000;

const LAST_SEQUENCE_KEY = 'kuchlu_lastSequence';
const RECONNECT_DELAY_MS = 5000;

export type RealtimeProtocol = 'connecting' | 'websocket' | 'sse' | 'disconnected' | 'fallback' | 'syncing';
type EventListener = (eventType: string, data: any) => void;

class RealtimeService {
  private ws: WebSocket | null = null;
  private sse: EventSource | null = null;
  private protocol: RealtimeProtocol = 'disconnected';
  private token: string | null = null;
  private apiBaseUrl: string = ''; // This will be set by native code

  private lastSequence: number = 0;
  private isSyncing: boolean = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private activityTimeout: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private listeners: Set<EventListener> = new Set();
  private pendingMessages = new Map<string, Record<string, any>>();
  
  private getWsBaseUrl = () => this.apiBaseUrl ? this.apiBaseUrl.replace(/^http/, 'ws') : '';
  private getEventsBaseUrl = () => this.apiBaseUrl || '';

  constructor() { if (typeof window !== 'undefined') { this.lastSequence = parseInt(localStorage.getItem(LAST_SEQUENCE_KEY) || '0', 10); window.addEventListener('online', this.handleOnline); window.addEventListener('offline', this.handleOffline); }}
  
  public setBaseUrl(url: string) {
      if(url && this.apiBaseUrl !== url) {
        this.apiBaseUrl = url;
        // If we are already connected, we should reconnect with the new URL.
        if (this.protocol !== 'disconnected') {
            this.startConnectionSequence();
        }
      }
  }

  public connect(authToken: string) { 
      if (!this.apiBaseUrl) {
          console.error("RealtimeService: API base URL not set. Cannot connect.");
          return;
      }
      if (this.protocol !== 'disconnected' && this.token === authToken) return; 
      this.token = authToken; this.startConnectionSequence(); 
  }
  public disconnect() { this.token = null; this.cleanup(); this.setProtocol('disconnected'); }
  public sendMessage = (payload: Record<string, any>) => {
    if (payload.event_type === 'send_message' && payload.client_temp_id) this.pendingMessages.set(payload.client_temp_id, payload);
    if (this.protocol === 'websocket' && this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(payload));
    else if (this.protocol === 'sse' || this.protocol === 'fallback') {
        // HTTP fallback is not implemented in the native plugin's webview context.
    } else this.emit('error', { title: 'Not Connected', description: 'Cannot send message.' });
  }
  public subscribe(l: EventListener) { this.listeners.add(l); l('protocol-change', this.protocol); }
  public unsubscribe(l: EventListener) { this.listeners.delete(l); }
  public getProtocol = () => this.protocol;

  private setProtocol(p: RealtimeProtocol) { if (this.protocol !== p) { this.protocol = p; this.emit('protocol-change', p); }}
  private emit(event: string, data: any) { this.listeners.forEach(l => l(event, data)); }
  private handleEvent(data: EventPayload) {
    if (data.sequence && data.sequence > this.lastSequence) { this.lastSequence = data.sequence; localStorage.setItem(LAST_SEQUENCE_KEY, String(data.sequence)); }
    if (data.event_type === 'message_ack' && data.client_temp_id) this.pendingMessages.delete(data.client_temp_id);
    this.emit('event', data);
  }
  private async syncEvents() { /* Not implemented for WebView, it gets live events only */ }
  private startConnectionSequence = () => { if (!this.token || (typeof navigator !== 'undefined' && !navigator.onLine)) { this.setProtocol('disconnected'); return; } this.cleanup(); this.setProtocol('connecting'); this.connectWebSocket(); };
  private connectWebSocket() {
    const wsUrl = this.getWsBaseUrl();
    if (!this.token || !wsUrl) return; this.ws = new WebSocket(`${wsUrl}/ws/connect?token=${encodeURIComponent(this.token)}`);
    this.ws.onopen = async () => { await this.syncEvents(); this.setProtocol('websocket'); this.resetActivityTimeout(); this.startHeartbeat(); if (this.pendingMessages.size > 0) this.pendingMessages.forEach(p => this.ws?.send(JSON.stringify(p))); };
    this.ws.onmessage = (event) => { this.resetActivityTimeout(); const data = JSON.parse(event.data); if (data.event_type !== 'heartbeat_ack') this.handleEvent(data); };
    this.ws.onerror = () => {};
    this.ws.onclose = (event) => { this.stopHeartbeat(); this.ws = null; if (event.code === 1008) { this.emit('auth-error', { detail: 'Authentication failed' }); this.disconnect(); return; } if (this.token) this.connectSSE(); };
  }
  private connectSSE = async () => {
    const sseUrl = this.getEventsBaseUrl();
    if (!this.token || !sseUrl) return; this.setProtocol('fallback'); this.sse = new EventSource(`${sseUrl}/events/subscribe?token=${encodeURIComponent(this.token)}`);
    this.sse.onopen = async () => { await this.syncEvents(); this.setProtocol('sse'); };
    this.sse.onerror = () => { if (this.protocol !== 'disconnected') { this.sse?.close(); this.sse = null; this.scheduleReconnect(); }};
    this.sse.addEventListener("auth_error", () => { this.emit('auth-error', { detail: 'Authentication failed' }); this.disconnect(); });
    const ALL_EVENT_TYPES: Array<EventPayload['event_type']> = ["new_message", "message_deleted", "message_reaction_update", "user_presence_update", "typing_indicator", "thinking_of_you_received", "user_profile_update", "message_ack", "error", "chat_mode_changed", "chat_history_cleared"];
    ALL_EVENT_TYPES.forEach(type => this.sse?.addEventListener(type, (event: MessageEvent) => this.handleEvent(JSON.parse(event.data))));
  }
  private scheduleReconnect = () => { this.setProtocol('disconnected'); if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout); this.reconnectTimeout = setTimeout(() => { if(this.token) this.startConnectionSequence(); }, RECONNECT_DELAY_MS); }
  private startHeartbeat() { this.stopHeartbeat(); this.heartbeatInterval = setInterval(() => { if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ event_type: "HEARTBEAT" })); }, HEARTBEAT_INTERVAL); }
  private stopHeartbeat() { if (this.heartbeatInterval) clearInterval(this.heartbeatInterval); }
  private resetActivityTimeout = () => { if(this.activityTimeout) clearTimeout(this.activityTimeout); this.activityTimeout = setTimeout(() => this.ws?.close(), SERVER_ACTIVITY_TIMEOUT); };
  private cleanup = () => { this.stopHeartbeat(); if(this.activityTimeout) clearTimeout(this.activityTimeout); if(this.reconnectTimeout) clearTimeout(this.reconnectTimeout); if (this.ws) { this.ws.onclose = null; this.ws.close(); this.ws = null; } if (this.sse) { this.sse.close(); this.sse = null; }}
  private handleOnline = () => { if (this.protocol === 'disconnected') this.startConnectionSequence(); };
  private handleOffline = () => { this.cleanup(); this.setProtocol('disconnected'); };
}

// Expose to window for native code to access
if (typeof window !== 'undefined') {
    (window as any).realtimeService = new RealtimeService();
}
