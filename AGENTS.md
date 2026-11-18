<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Auth: phone OTP verified in a server function, which mints a session via an internal email/password user per phone — keeps a future SMS provider swap local to `src/lib/auth.functions.ts`.
- Admin access is granted from the `admin_phones` table into `user_roles` at sign-in — roles never live on member rows.
- Use the shared Brand component for portal logos and the same uploaded artwork on the login banner; store logo and login artwork as real files in public/images (so the project runs on localhost) and keep the browser favicon as a small public image.
- Keep decorative depth in the shared DepthSurface and CSS motion layer, with reduced-motion fallbacks; this preserves readable DOM forms and tables without changing application logic.
