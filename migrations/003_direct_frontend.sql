-- Public contributions are written directly from the Vercel frontend.
-- They always enter the moderation queue and can never self-approve.
drop policy if exists "public can submit community stories" on public.nan_community_posts;
create policy "public can submit community stories" on public.nan_community_posts
  for insert to anon, authenticated
  with check (
    author_id = 'user-admin'
    and status = 'submitted'
    and visibility in ('public', 'community')
    and char_length(title) between 1 and 180
    and char_length(body) between 1 and 10000
  );
