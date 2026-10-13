-- CampusFlow: organizer-managed branches.
-- Branches reuse public.departments because student profiles already reference that table.
-- Organizers can create, rename and deactivate branches through the existing departments_organizer RLS policy.
-- Renaming a branch also updates event eligibility arrays so existing restrictions remain valid.

create or replace function public.sync_branch_name_in_event_eligibility()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.name is distinct from old.name then
    update public.events
       set allowed_branches = array_replace(coalesce(allowed_branches, '{}'::text[]), old.name, new.name)
     where old.name = any(coalesce(allowed_branches, '{}'::text[]));
  end if;
  return new;
end;
$$;

drop trigger if exists departments_sync_event_branch_name on public.departments;
create trigger departments_sync_event_branch_name
after update of name on public.departments
for each row
execute function public.sync_branch_name_in_event_eligibility();

-- Explicitly preserve public read access and organizer management. The policies are
-- already created by migration 004; these statements make migration 007 safe to apply
-- on projects where the policies were removed or renamed.
drop policy if exists departments_read on public.departments;
create policy departments_read on public.departments
  for select to anon, authenticated using (true);

drop policy if exists departments_organizer on public.departments;
create policy departments_organizer on public.departments
  for all to authenticated
  using (public.is_organizer())
  with check (public.is_organizer());
