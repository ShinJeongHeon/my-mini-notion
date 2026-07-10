type AvatarProps = {
  name: string;
  src?: string | null;
  size?: number;
};

export function Avatar({ name, src, size = 28 }: AvatarProps) {
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} />
      ) : (
        name.charAt(0)
      )}
    </span>
  );
}
