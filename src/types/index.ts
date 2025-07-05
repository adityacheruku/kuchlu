
import type { UploadError as UploadErrorType } from './uploadErrors';
import type { NetworkQuality } from '@/services/networkMonitor';
import { ALL_MOODS as AppMoods } from '@/config/moods';

export type Mood = string;
export const ALL_MOODS: Mood[] = AppMoods;
export type SupportedEmoji = string; 
export const ALL_SUPPORTED_EMOJIS: SupportedEmoji[] = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
export const QUICK_REACTION_EMOJIS: SupportedEmoji[] = ['❤️', '👍', '😂', '😮', '😢'];

export const PICKER_EMOJIS: Record<string, { icon: string; emojis: string[], keywords: string[] }> = {
    'Smileys & People': { icon: '😊', keywords: ['happy', 'face', 'person', 'smile', 'sad', 'angry'], emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠'] },
    'Gestures & Hands': { icon: '👋', keywords: ['hand', 'wave', 'bye', 'hello', 'point', 'clap', 'ok'], emojis: ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳'] },
    'Objects': { icon: '💡', keywords: ['item', 'thing', 'tool', 'phone', 'computer', 'gift', 'party'], emojis: ['📱', '💻', '⌚️', '📷', '💡', '🎉', '🎁', '🔑', '💰', '💊', '⚽️', '🏀', '🏈', '⚾️', '🥎', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥅', '🏒', '🏑', '🏏', '⛳️', '🏹', '🎣', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸', '🥌', '🎿', '⛷', '🏂', '🏋️‍♀️', '🏋️‍♂️', '‍♀️', '‍♂️', '🤸‍♀️', '🤸‍♂️', '⛹️‍♀️', '⛹️‍♂️', '🤺', '𤾾‍♀️', '‍♂️', '🏌️‍♀️', '🏌️‍♂️', '🏇', '🧘‍♀️', '🧘‍♂️', '🏄‍♀️', '🏄‍♂️', '🏊‍♀️', '🏊‍♂️', '🤽‍♀️', '🤽‍♂️', '🚣‍♀️', '🚣‍♂️', '🧗‍♀️', '🧗‍♂️', '🚵‍♀️', '🚵‍♂️', '🚴‍♀️', '🚴‍♂️', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖', '🏵', '🎗', '🎫', '🎟', '🎪', '🤹‍♀️', '🤹‍♂️', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻'] },
    'Flags': { icon: '🏳️‍🌈', keywords: ['country', 'nation', 'banner', 'world', 'usa', 'india', 'uk'], emojis: ['🏳️‍🌈', '🏳️', '🏴', '🏴‍☠️', '🏁', '🚩', '🎌', '🇦🇫', '🇦🇽', '🇦🇱', '🇩🇿', '🇦🇸', '🇦🇩', '🇦🇴', '🇦🇮', '🇦🇶', '🇦🇬', '🇦🇷', '🇦🇲', '🇦🇼', '🇦🇺', '🇦🇹', '🇦🇿', '🇧🇸', '🇧🇭', '🇧🇩', '🇧🇧', '🇧🇾', '🇧🇪', '🇧🇿', '🇧🇯', '🇧🇲', '🇧🇹', '🇧🇴', '🇧🇦', '🇧🇼', '🇧🇷', '🇮🇴', '🇻🇬', '🇧🇳', '🇧🇬', '🇧🇫', '🇧🇮', '🇰🇭', '🇨🇲', '🇨🇦', '🇮🇨', '🇨🇻', '🇧🇶', '🇰🇾', '🇨🇫', '🇹🇩', '🇨🇱', '🇨🇳', '🇨🇽', '🇨🇨', '🇨🇴', '🇰🇲', '🇨🇬', '🇨🇩', '🇨🇰', '🇨🇷', '🇨🇮', '🇭🇷', '🇨🇺', '🇨🇼', '🇨🇾', '🇨🇿', '🇩🇰', '🇩🇯', '🇩🇲', '🇩🇴', '🇪🇨', '🇪🇬', '🇸🇻', '🇬🇶', '🇪🇷', '🇪🇪', '🇸🇿', '🇪🇹', '🇪🇺', '🇫🇰', '🇫🇴', '🇫🇯', '🇫🇮', '🇫🇷', '🇬🇫', '🇵🇫', '🇹🇫', '🇬🇦', '🇬🇲', '🇬🇪', '🇩🇪', '🇬🇭', '🇬🇮', '🇬🇷', '🇬🇱', '🇬🇩', '🇬🇵', '🇬🇺', '🇬🇹', '🇬🇬', '🇬🇳', '🇬🇼', '🇬🇾', '🇭🇹', '🇭🇳', '🇭🇰', '🇭🇺', '🇮🇸', '🇮🇳', '🇮🇩', '🇮🇷', '🇮🇶', '🇮🇪', '🇮🇲', '🇮🇱', '🇮🇹', '🇯🇲', '🇯🇵', '🎌', '🇯🇪', '🇯🇴', '🇰🇿', '🇰🇪', '🇰🇮', '🇽🇰', '🇰🇼', '🇰🇬', '🇱🇦', '🇱🇻', '🇱🇧', '🇱🇸', '🇱🇷', '🇱🇾', '🇱🇮', '🇱🇹', '🇱🇺', '🇲🇴', '🇲🇬', '🇲🇼', '🇲🇾', '🇲🇻', '🇲🇱', '🇲🇹', '🇲🇭', '🇲🇶', '🇲🇷', '🇲🇺', '🇾🇹', '🇲🇽', '🇫🇲', '🇲🇩', '🇲🇨', '🇲🇳', '🇲🇪', '🇲🇸', '🇲🇦', '🇲🇿', '🇲🇲', '🇳🇦', '🇳🇷', '🇳🇵', '🇳🇱', '🇳🇨', '🇳🇿', '🇳🇮', '🇳🇪', '🇳🇬', '🇳🇺', '🇳🇫', '🇰🇵', '🇲🇰', '🇲🇵', '🇳🇴', '🇴🇲', '🇵🇰', '🇵🇼', '🇵🇸', '🇵🇦', '🇵🇬', '🇵🇾', '🇵🇪', '🇵🇭', '🇵🇳', '🇵🇱', '🇵🇹', '🇵🇷', '🇶🇦', '🇷🇪', '🇷🇴', '🇷🇺', '🇷🇼', '🇼🇸', '🇸🇲', '🇸🇹', '🇸🇦', '🇸🇳', '🇷🇸', '🇸🇨', '🇸🇱', '🇸🇬', '🇸🇽', '🇸🇰', '🇸🇮', '🇬🇸', '🇸🇧', '🇸🇴', '🇿🇦', '🇰🇷', '🇸🇸', '🇪🇸', '🇱🇰', '🇧🇱', '🇸🇭', '🇰🇳', '🇱🇨', '🇵🇲', '🇻🇨', '🇸🇩', '🇸🇷', '🇸🇯', '🇸🇪', '🇨🇭', '🇸🇾', '🇹🇼', '🇹🇯', '🇹🇿', '🇹🇭', '🇹🇱', '🇹🇬', '🇹🇰', '🇹🇴', '🇹🇹', '🇹🇳', '🇹🇷', '🇹🇲', '🇹🇨', '🇹🇻', '🇺🇬', '🇺🇦', '🇦🇪', '🇬🇧', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '🏴󠁧󠁢󠁷󠁬󠁳󠁿', '🇺🇳', '🇺🇸', '🇻🇮', '🇺🇾', '🇺🇿', '🇻🇺', '🇻🇦', '🇻🇪', '🇻🇳', '🇼🇫', '🇪🇭', '🇾🇪', '🇿🇲', '🇿🇼'] }
};

export interface User {
  id: string;
  display_name: string;
  avatar_url: string | null;
  mood: Mood;
  phone?: string | null; 
  email?: string | null; 
  is_online?: boolean;
  last_seen?: string | null;
  "data-ai-hint"?: string; 
  partner_id?: string | null;
}
export interface UserInToken extends User {}

export type MessageClipType = 'audio' | 'video';
export type MessageStatus = "uploading" | "sending" | "sent" | "delivered" | "read" | "failed" | "pending_processing";
export type MessageSubtype = 'text' | 'sticker' | 'clip' | 'image' | 'document' | 'voice_message' | 'audio' | 'emoji_only' | 'history_cleared_marker' | 'deleted_placeholder';
export type MessageMode = 'normal' | 'fight' | 'incognito';
export type DeleteType = 'me' | 'everyone';

export interface MediaMetadata {
  public_id: string;
  resource_type: 'image' | 'video' | 'raw';
  format: string;
  bytes: number;
  duration?: number;
  width?: number;
  height?: number;
  title?: string;
  artist?: string;
  urls: {
    original?: string;
    thumbnail_250?: string;
    preview_800?: string;
    hls_manifest?: string;
    dash_manifest?: string;
    static_thumbnail?: string;
    animated_preview?: string;
    mp4_video?: string;
    mp3_audio?: string;
  };
}

export interface Message {
  id: string; 
  user_id: string; 
  chat_id: string; 
  text?: string | null;
  caption?: string | null;
  created_at: string; 
  updated_at: string; 
  reactions?: Partial<Record<SupportedEmoji, string[]>> | null;
  message_subtype?: MessageSubtype | null;
  mode?: MessageMode | null;
  clip_type?: MessageClipType | null;
  clip_url?: string | null;
  clip_placeholder_text?: string | null;
  image_url?: string | null;
  image_thumbnail_url?: string | null;
  preview_url?: string | null; 
  document_url?: string | null;
  document_name?: string | null;
  sticker_id?: string | null;
  sticker_image_url?: string | null;
  client_temp_id: string; 
  status: MessageStatus;
  uploadStatus?: 'pending' | 'processing' | 'compressing' | 'uploading' | 'pending_processing' | 'completed' | 'failed' | 'cancelled';
  duration_seconds?: number | null;
  file_size_bytes?: number | null;
  file_metadata?: MediaMetadata | null;
  audio_format?: string | null;
  transcription?: string | null;
  reply_to_message_id?: string | null;
  uploadProgress?: number;
  uploadError?: UploadErrorType;
  file?: File; // Not stored in DB
  thumbnailDataUrl?: string; // Not stored in DB
  is_starred?: boolean;
}

export interface Chat {
  id: string; 
  participants: User[];
  last_message: Message | null;
  created_at: string; 
  updated_at: string; 
}

export interface AuthResponse { access_token: string; refresh_token: string; token_type: string; user: UserInToken; }
export interface ApiErrorResponse { detail?: string | { msg: string; type: string }[]; }
export interface VerifyOtpResponse { registration_token: string; }
export interface CompleteRegistrationRequest { registration_token: string; display_name: string; password: string; email?: string; }
export interface PasswordChangeRequest { current_password: string; new_password: string; }
export interface DeleteAccountRequest { password: string; }
export interface DocumentUploadResponse { file_url: string; file_name: string; file_size_bytes: number; }
export interface VoiceMessageUploadResponse { file_url: string; clip_type: 'audio'; duration_seconds: number | null; file_size_bytes: number | null; audio_format: string | null; }
export interface VideoUploadResponse { file_url: string; clip_type: 'video'; thumbnail_url: string | null; duration_seconds: number | null; }

export type NewMessageEventData = { event_type: "new_message"; message: Message; chat_id: string; };
export type MediaProcessedEventData = { event_type: "media_processed"; message: Message; };
export type MessageDeletedEventData = { event_type: "message_deleted"; message_id: string; chat_id: string; };
export type MessageReactionUpdateEventData = { event_type: "message_reaction_update"; message_id: string; chat_id: string; reactions: Partial<Record<SupportedEmoji, string[]>>; };
export type UserPresenceUpdateEventData = { event_type: "user_presence_update"; user_id: string; is_online: boolean; last_seen: string | null; mood: Mood; };
export type TypingIndicatorEventData = { event_type: "typing_indicator"; chat_id: string; user_id: string; is_typing: boolean; };
export type ThinkingOfYouReceivedEventData = { event_type: "thinking_of_you_received"; sender_id: string; sender_name: string; };
export type UserProfileUpdateEventData = { event_type: "user_profile_update"; user_id: string; mood?: Mood; display_name?: string; avatar_url?: string; };
export type HeartbeatClientEvent = { event_type: "HEARTBEAT"; };
export type MessageAckEventData = { event_type: "message_ack"; client_temp_id: string; server_assigned_id: string; status: MessageStatus; timestamp: string; };
export type ChatModeChangedEventData = { event_type: "chat_mode_changed"; chat_id: string; mode: MessageMode; };
export type ChatHistoryClearedEventData = { event_type: "chat_history_cleared"; chat_id: string; };
export interface MessageStatusUpdateEventData { event_type: "message_status_update"; message_id: string; chat_id: string; status: MessageStatus; read_at?: string; }

export type EventPayload = { sequence?: number; } & (
  | NewMessageEventData | MediaProcessedEventData | MessageDeletedEventData | MessageReactionUpdateEventData | UserPresenceUpdateEventData | TypingIndicatorEventData
  | ThinkingOfYouReceivedEventData | UserProfileUpdateEventData | MessageAckEventData | ChatModeChangedEventData | ChatHistoryClearedEventData | MessageStatusUpdateEventData
  | { event_type: "error", detail: string }
);

export interface StickerPack { id: string; name: string; description?: string | null; thumbnail_url?: string | null; }
export interface Sticker { id: string; pack_id: string; name?: string | null; image_url: string; }
export interface StickerPackResponse { packs: StickerPack[]; }
export interface StickerListResponse { stickers: Sticker[]; }
export interface PushSubscriptionJSON { endpoint: string; expirationTime?: number | null; keys: { p256dh: string; auth: string; }; }
export interface NotificationSettings { user_id: string; messages: boolean; mood_updates: boolean; thinking_of_you: boolean; voice_messages: boolean; media_sharing: boolean; quiet_hours_enabled: boolean; quiet_hours_start: string | null; quiet_hours_end: string | null; quiet_hours_weekdays_only: boolean; timezone: string; }
export interface PartnerRequest { id: string; sender: User; recipient: User; status: 'pending' | 'accepted' | 'rejected' | 'cancelled'; created_at: string; }

export interface UploadItem {
  id: string;
  file: File;
  messageId: string;
  chatId: string;
  priority: number;
  status: 'pending' | 'processing' | 'compressing' | 'uploading' | 'pending_processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  error?: UploadErrorType;
  retryCount: number;
  createdAt: Date;
  subtype: MessageSubtype;
  thumbnailDataUrl?: string; // Add this to hold the local preview
}

export interface UploadProgress {
  messageId: string;
  status: UploadItem['status'];
  progress: number;
  error?: UploadErrorType;
  result?: any;
  thumbnailDataUrl?: string;
}

export interface FileAnalyticsPayload {
  message_id: string;
  upload_duration_seconds: number;
  file_size_bytes: number;
  compressed_size_bytes?: number;
  network_quality: NetworkQuality;
  file_type: MessageSubtype | 'unknown';
}

export interface MoodAnalyticsContext {
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'night';
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
}
export interface MoodAnalyticsPayload {
  mood_id: string;
  context: MoodAnalyticsContext;
}

export interface CloudinaryUploadParams {
    signature: string;
    timestamp: number;
    api_key: string;
    cloud_name: string;
    public_id: string;
    folder: string;
    resource_type: 'image' | 'video' | 'raw' | 'auto';
    eager?: string;
    notification_url?: string;
}

export interface MediaMessagePayload {
    client_temp_id: string;
    chat_id: string;
    public_id: string;
    media_type: string;
    cloudinary_metadata: any;
}

export interface CachedMediaBlob {
  id: string; // Composite ID: `${messageId}-${version}`
  messageId: string; // For easier querying/deletion
  version: string; // e.g., 'thumbnail', 'preview_800', 'hls_manifest'
  blob: Blob; // The actual binary data of the media
  cachedAt: number; // Timestamp for LRU eviction (Date.now())
}
