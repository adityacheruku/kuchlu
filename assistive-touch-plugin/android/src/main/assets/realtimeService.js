// This file is generated from realtimeService.ts for use in the WebView
"use strict";
// ... existing code ... 

// Transpiled JavaScript from realtimeService.ts
const API_BASE_URL = 'https://9fc3-49-43-228-136.ngrok-free.app';
const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');
const EVENTS_BASE_URL = API_BASE_URL;
const HEARTBEAT_INTERVAL = 30000;
const SERVER_ACTIVITY_TIMEOUT = 45000;
const LAST_SEQUENCE_KEY = 'kuchlu_lastSequence';
const RECONNECT_DELAY_MS = 5000;
class RealtimeService {
    constructor() {
        this.ws = null;
        this.sse = null;
        this.protocol = 'disconnected';
        this.token = null;
        this.lastSequence = 0;
        this.isSyncing = false;
        this.heartbeatInterval = null;
        this.activityTimeout = null;
        this.reconnectTimeout = null;
        this.listeners = new Set();
        this.pendingMessages = new Map();
        if (typeof window !== 'undefined') {
            this.lastSequence = parseInt(localStorage.getItem(LAST_SEQUENCE_KEY) || '0', 10);
            window.addEventListener('online', this.handleOnline.bind(this));
            window.addEventListener('offline', this.handleOffline.bind(this));
        }
    }
    connect(authToken) {
        if (this.protocol !== 'disconnected' && this.token === authToken) return;
        this.token = authToken;
        this.startConnectionSequence();
    }
    disconnect() {
        this.token = null;
        this.cleanup();
        this.setProtocol('disconnected');
    }
    sendMessage(payload) {
        if (payload.event_type === 'send_message' && payload.client_temp_id) this.pendingMessages.set(payload.client_temp_id, payload);
        if (this.protocol === 'websocket' && this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(payload));
        else if (this.protocol === 'sse' || this.protocol === 'fallback') {
            // Not implemented: fallback HTTP send
        } else this.emit('error', { title: 'Not Connected', description: 'Cannot send message.' });
    }
    subscribe(l) { this.listeners.add(l); l('protocol-change', this.protocol); }
    unsubscribe(l) { this.listeners.delete(l); }
    getProtocol() { return this.protocol; }
    setProtocol(p) { if (this.protocol !== p) { this.protocol = p; this.emit('protocol-change', p); } }
    emit(event, data) { this.listeners.forEach(l => l(event, data)); }
    handleEvent(data) {
        if (data.sequence && data.sequence > this.lastSequence) { this.lastSequence = data.sequence; localStorage.setItem(LAST_SEQUENCE_KEY, String(data.sequence)); }
        if (data.event_type === 'message_ack' && data.client_temp_id) this.pendingMessages.delete(data.client_temp_id);
        this.emit('event', data);
    }
    async syncEvents() { /* Not implemented for WebView */ }
    startConnectionSequence() { if (!this.token || (typeof navigator !== 'undefined' && !navigator.onLine)) { this.setProtocol('disconnected'); return; } this.cleanup(); this.setProtocol('connecting'); this.connectWebSocket(); }
    connectWebSocket() {
        if (!this.token) return; this.ws = new WebSocket(`${WS_BASE_URL}/ws/connect?token=${encodeURIComponent(this.token)}`);
        this.ws.onopen = () => { this.setProtocol('websocket'); this.resetActivityTimeout(); this.startHeartbeat(); if (this.pendingMessages.size > 0) this.pendingMessages.forEach(p => this.ws && this.ws.send(JSON.stringify(p))); };
        this.ws.onmessage = (event) => { this.resetActivityTimeout(); const data = JSON.parse(event.data); if (data.event_type !== 'heartbeat_ack') this.handleEvent(data); };
        this.ws.onerror = () => { };
        this.ws.onclose = (event) => { this.stopHeartbeat(); this.ws = null; if (event.code === 1008) { this.emit('auth-error', { detail: 'Authentication failed' }); this.disconnect(); return; } if (this.token) this.connectSSE(); };
    }
    connectSSE() {
        if (!this.token) return; this.setProtocol('fallback'); this.sse = new EventSource(`${EVENTS_BASE_URL}/events/subscribe?token=${encodeURIComponent(this.token)}`);
        this.sse.onopen = () => { this.setProtocol('sse'); };
        this.sse.onerror = () => { if (this.protocol !== 'disconnected') { this.sse && this.sse.close(); this.sse = null; this.scheduleReconnect(); } };
        this.sse.addEventListener("auth_error", () => { this.emit('auth-error', { detail: 'Authentication failed' }); this.disconnect(); });
        const ALL_EVENT_TYPES = ["new_message", "message_deleted", "message_reaction_update", "user_presence_update", "typing_indicator", "thinking_of_you_received", "user_profile_update", "message_ack", "error", "chat_mode_changed", "chat_history_cleared"];
        ALL_EVENT_TYPES.forEach(type => this.sse && this.sse.addEventListener(type, (event) => this.handleEvent(JSON.parse(event.data))));
    }
    scheduleReconnect() { this.setProtocol('disconnected'); if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout); this.reconnectTimeout = setTimeout(() => { if (this.token) this.startConnectionSequence(); }, RECONNECT_DELAY_MS); }
    startHeartbeat() { this.stopHeartbeat(); this.heartbeatInterval = setInterval(() => { if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ event_type: "HEARTBEAT" })); }, HEARTBEAT_INTERVAL); }
    stopHeartbeat() { if (this.heartbeatInterval) clearInterval(this.heartbeatInterval); }
    resetActivityTimeout() { if (this.activityTimeout) clearTimeout(this.activityTimeout); this.activityTimeout = setTimeout(() => this.ws && this.ws.close(), SERVER_ACTIVITY_TIMEOUT); }
    cleanup() { this.stopHeartbeat(); if (this.activityTimeout) clearTimeout(this.activityTimeout); if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout); if (this.ws) { this.ws.onclose = null; this.ws.close(); this.ws = null; } if (this.sse) { this.sse.close(); this.sse = null; } }
    handleOnline() { if (this.protocol === 'disconnected') this.startConnectionSequence(); }
    handleOffline() { this.cleanup(); this.setProtocol('disconnected'); }
}
window.realtimeService = new RealtimeService(); 
