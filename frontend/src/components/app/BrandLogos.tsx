/** Inline provider brand marks for the sign-in buttons. Decorative only. */

type LogoProps = { className?: string };

export function GitHubLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <path
        fill="currentColor"
        d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.55v-2.06c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.29-1.68-1.29-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a10.9 10.9 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.26 5.69.41.36.78 1.06.78 2.14v3.17c0 .3.2.66.8.55A11.5 11.5 0 0 0 12 .5Z"
      />
    </svg>
  );
}

export function LinkedInLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <path
        fill="#0A66C2"
        d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.36V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .78 0 1.74v20.52C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.74V1.74C24 .78 23.2 0 22.22 0Z"
      />
    </svg>
  );
}

export function SpotifyLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <path
        fill="#1DB954"
        d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm5.5 17.32a.75.75 0 0 1-1.03.25c-2.82-1.72-6.37-2.11-10.55-1.16a.75.75 0 1 1-.33-1.46c4.57-1.04 8.5-.59 11.66 1.34a.75.75 0 0 1 .25 1.03Zm1.47-3.28a.94.94 0 0 1-1.29.31c-3.23-1.98-8.15-2.56-11.97-1.4a.94.94 0 1 1-.54-1.79c4.37-1.33 9.8-.68 13.5 1.59a.94.94 0 0 1 .3 1.29Zm.13-3.42c-3.87-2.3-10.26-2.51-13.96-1.39a1.12 1.12 0 1 1-.65-2.15C8.75 5.79 15.8 6.03 20.26 8.68a1.12 1.12 0 1 1-1.16 1.94Z"
      />
    </svg>
  );
}

export function GoogleCalendarLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <rect x="3" y="4" width="18" height="17" rx="3" fill="#fff" stroke="#DADCE0" />
      <path fill="#4285F4" d="M3 7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v1H3V7Z" />
      <path
        fill="#1A73E8"
        d="M10.2 16.6c-1.3 0-2.24-.7-2.5-1.86l1.2-.5c.14.66.6 1.1 1.3 1.1.66 0 1.16-.38 1.16-.94 0-.6-.5-.95-1.24-.95h-.6v-1.1h.55c.64 0 1.08-.33 1.08-.86 0-.5-.4-.84-.98-.84-.6 0-1.02.36-1.16.94l-1.18-.49c.26-1.06 1.16-1.7 2.36-1.7 1.32 0 2.3.75 2.3 1.85 0 .68-.34 1.18-.9 1.45.68.27 1.1.85 1.1 1.63 0 1.28-1.06 2.14-2.5 2.14Zm5.36-.14h-1.3v-4.9l-1.1.34-.3-1.06 1.9-.6h.8v6.22Z"
      />
    </svg>
  );
}
