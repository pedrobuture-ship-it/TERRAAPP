create or replace function public.invite_user_to_farm(target_farm_id uuid, target_email text, target_role text)
returns boolean
language plpgsql
security definer
set search_path = public
as $function
declare
  found_user_id uuid;
begin
  if not public.is_farm_admin(target_farm_id) then
    raise exception 'Apenas administradores podem convidar membros.';
  end if;

  select id into found_user_id from auth.users where email = target_email;
  
  if found_user_id is null then
    raise exception 'Usuário não encontrado. Ele precisa criar uma conta no app primeiro.';
  end if;

  update public.farm_members
  set role = target_role, deleted_at = null
  where id = (
    select id from public.farm_members
    where farm_id = target_farm_id and user_id = found_user_id
    order by deleted_at nulls first, created_at desc
    limit 1
  );

  if not found then
    insert into public.farm_members (farm_id, user_id, role, created_by)
    values (target_farm_id, found_user_id, target_role, auth.uid());
  end if;

  return true;
end;
$function;

create or replace function public.get_farm_members_with_email(target_farm_id uuid)
returns table (
  id uuid,
  farm_id uuid,
  user_id uuid,
  role text,
  created_at timestamptz,
  email text
)
language plpgsql
security definer
set search_path = public
as $function
begin
  if not public.is_farm_member(target_farm_id) then
    raise exception 'Não autorizado.';
  end if;

  return query
  select 
    fm.id, fm.farm_id, fm.user_id, fm.role, fm.created_at, u.email::text
  from public.farm_members fm
  join auth.users u on u.id = fm.user_id
  where fm.farm_id = target_farm_id and fm.deleted_at is null
  order by fm.created_at asc;
end;
$function;

grant execute on function public.invite_user_to_farm(uuid, text, text) to authenticated;
grant execute on function public.get_farm_members_with_email(uuid) to authenticated;
