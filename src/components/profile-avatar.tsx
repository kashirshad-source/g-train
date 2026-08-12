import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const EMOJI_PREFIX = "emoji:";

export function isEmojiAvatar(url?: string | null): url is string {
  return !!url && url.startsWith(EMOJI_PREFIX);
}

export function ProfileAvatar({
  avatarUrl,
  fallback,
  className,
}: {
  avatarUrl?: string | null;
  fallback: string;
  className?: string;
}) {
  if (isEmojiAvatar(avatarUrl)) {
    return (
      <Avatar className={className}>
        <AvatarFallback className="text-[1.15em] leading-none">
          {avatarUrl.slice(EMOJI_PREFIX.length)}
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <Avatar className={className}>
      <AvatarImage src={avatarUrl ?? undefined} alt="" />
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  );
}
