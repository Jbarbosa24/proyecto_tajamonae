-- Enable self profile provisioning and bootstrap profile creation on auth signup.

insert into public.roles (nombre)
values ('admin'), ('aseadora')
on conflict (nombre) do nothing;

drop policy if exists perfiles_self_insert on public.perfiles;
create policy perfiles_self_insert on public.perfiles
for insert
to authenticated
with check (
  id = auth.uid()
  and rol in (select nombre from public.roles)
);

drop policy if exists perfiles_self_update on public.perfiles;
create policy perfiles_self_update on public.perfiles
for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and rol in (select nombre from public.roles)
);

create or replace function public.handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_role text;
  profile_name text;
begin
  profile_role := coalesce(
    nullif(new.raw_user_meta_data ->> 'rol_slug', ''),
    nullif(new.raw_user_meta_data ->> 'rol', ''),
    'aseadora'
  );

  if not exists (select 1 from public.roles where nombre = profile_role) then
    profile_role := 'aseadora';
  end if;

  profile_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'nombre_completo', ''),
    split_part(coalesce(new.email, 'usuario@local'), '@', 1)
  );

  insert into public.perfiles (id, nombre_completo, rol, activo, created_at)
  values (new.id, profile_name, profile_role, true, now())
  on conflict (id) do update
  set nombre_completo = excluded.nombre_completo,
      rol = excluded.rol,
      activo = true;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute procedure public.handle_new_auth_user_profile();
